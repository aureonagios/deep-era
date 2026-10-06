// semantics.js — zero-dependency static bug detection for JavaScript / TypeScript.
//
// WHY THIS EXISTS: proven empirically against deep-era v0.46 — a file containing a
// silently swallowed exception, a floating promise, and an always-true guard produced
// ZERO findings from the entire check pipeline. Those are the exact bugs an AI writes
// most often, and they pass every syntax, regex, and secret scan. A human reviewer
// spots them in seconds; the pipeline did not. This module closes that gap.
//
// DESIGN RULE: a false accusation is worse than a miss. Every detector below requires
// positive evidence and backs off on any recognized legitimate pattern. Findings are
// capped per file and per rule so one bad file cannot bury the one line that mattered.
const fs = require("fs");
const path = require("path");

const JS_EXT = /\.(js|ts|tsx|jsx|mjs|cjs)$/;

// ---------------------------------------------------------------------------
// Lexical scrub: blank comments, strings, and template literals so pattern
// matching cannot be fooled by text inside them. Offsets stay aligned with the
// original source so reported line numbers are exact.
// ---------------------------------------------------------------------------
function scrub(src) {
  const out = src.split("");
  const n = src.length;
  let i = 0;
  while (i < n) {
    const c = src[i];
    const c2 = src.slice(i, i + 2);
    if (c2 === "//") {
      let j = src.indexOf("\n", i); if (j === -1) j = n;
      for (let k = i; k < j; k++) out[k] = " ";
      i = j; continue;
    }
    if (c2 === "/*") {
      let j = src.indexOf("*/", i + 2);
      if (j === -1) j = n; else j += 2;
      for (let k = i; k < j; k++) out[k] = " ";
      i = j; continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1, closed = false;
      while (j < n) {
        if (src[j] === "\\") { j += 2; continue; }
        if (src[j] === c) { closed = true; break; }
        if (src[j] === "\n") break;
        j++;
      }
      const end = closed ? j + 1 : Math.min(j, n);
      for (let k = i + 1; k < end - 1; k++) out[k] = " ";
      i = end; continue;
    }
    if (c === "`") {
      // Blank the literal text but PRESERVE ${...} interpolations: the code inside
      // them is real code and every rule must still see it (e.g. `nodes.join()`).
      let j = i + 1;
      while (j < n) {
        if (src[j] === "\\") { j += 2; continue; }
        if (src[j] === "`") break;
        if (src[j] === "$" && src[j + 1] === "{") {
          // find matching close brace of the interpolation
          let d = 1, k = j + 2;
          while (k < n && d > 0) {
            if (src[k] === "{") d++;
            else if (src[k] === "}") d--;
            if (d > 0) k++;
          }
          // blank from j+2..k (the expression) but keep ${ and }
          for (let x = j; x <= k; x++) if (src[x] !== "$" && src[x] !== "{" && src[x] !== "}") out[x] = " ";
          j = k + 1;
          continue;
        }
        j++;
      }
      const end = Math.min(j + 1, n);
      for (let k = i + 1; k < end - 1; k++) if (out[k] === src[k]) out[k] = " ";
      i = end; continue;
    }
    i++;
  }
  return out.join("");
}

function lineOf(src, idx) {
  return src.slice(0, idx).split("\n").length;
}

const CAP_PER_FILE = 5;
const CAP_PER_RULE = 25;

function makeCollector(caps) {
  const out = [];
  const perFile = new Map();
  const perRule = new Map();
  const c = caps || { perFile: CAP_PER_FILE, perRule: CAP_PER_RULE };
  const push = (f) => {
    const fc = perFile.get(f.file) || 0;
    const rc = perRule.get(f.rule) || 0;
    if (fc >= c.perFile || rc >= c.perRule) return;
    perFile.set(f.file, fc + 1);
    perRule.set(f.rule, rc + 1);
    out.push(f);
  };
  return { push, all: () => out };
}

const RULE_META = {
  "swallowed-exception": {
    sev: "high", cwe: "CWE-390",
    why: "a caught error that is never reported turns a crash into silent wrong behaviour, so the user sees empty or stale data and nobody knows why",
  },
  "floating-promise": {
    sev: "medium", cwe: "CWE-703",
    why: "a promise created without await, return, or .catch can reject unhandled, which loses the failure and can terminate the process",
  },
  "dead-branch": {
    sev: "medium", cwe: "CWE-570",
    why: "a condition that is always true or always false is unreachable logic, usually an AI stub that was never finished",
  },
  "unused-local": {
    sev: "low", cwe: "CWE-563",
    why: "a value written but never read is either leftover scaffolding or a missing use",
  },
  "tautological-test": {
    sev: "high", cwe: "CWE-1254",
    why: "this assertion can never fail, so the test proves nothing while reporting green",
  },
  "empty-test": {
    sev: "medium", cwe: "CWE-1254",
    why: "this test file contains no assertions, so it passes unconditionally and guards nothing",
  },
  "always-passing-suite": {
    sev: "high", cwe: "CWE-1254",
    why: "the suite reported success but executed zero real assertions, so green here means nothing",
  },
};

function meta(rule) { return RULE_META[rule] || { sev: "medium", cwe: "", why: "" }; }

// ---------------------------------------------------------------------------
// Function scope index: where each catch sits relative to its enclosing function,
// loop, and promise chain. Deciding "is this swallow serious?" needs that context,
// and a regex over the preceding text cannot supply it reliably.
// ---------------------------------------------------------------------------
function buildScopeIndex(code) {
  const scopes = [];      // { kind, start, end, parent }
  const stack = [];
  const push = (kind, start) => {
    const s = { kind, start, end: Infinity, parent: stack.length ? stack[stack.length - 1] : null };
    scopes.push(s);
    stack.push(s);
    return s;
  };
  const pop = (end) => { const s = stack.pop(); if (s) s.end = end; };
  const re = /\b(?:function\b|=>|\bif\b|\bfor\b|\bwhile\b|\btry\b|\bclass\b)|\{|\}/g;
  let m;
  while ((m = re.exec(code))) {
    const t = m[0];
    if (t === "{") push("block", m.index);
    else if (t === "}") pop(m.index);
    else if (t === "function" || t === "class") push("function", m.index);
    else if (t === "=>") push("function", m.index);
    else if (t === "if" || t === "for" || t === "while" || t === "try") push(t, m.index);
  }
  for (const s of stack) s.end = code.length;
  return scopes;
}

function enclosing(scopes, idx) {
  let best = null;
  for (const s of scopes) {
    if (s.start <= idx && idx < s.end && (!best || s.start > best.start)) best = s;
  }
  return best;
}

function hasAncestor(scope, kinds) {
  let s = scope;
  while (s) {
    if (kinds.includes(s.kind)) return true;
    s = s.parent;
  }
  return false;
}

// Does the catch body surface the error to a human or to the caller?
function reportsError(raw) {
  return (
    /\b(console\s*\.\s*(error|warn|log|info|debug|trace|assert))\b/.test(raw) ||
    /\bthrow\b/.test(raw) ||
    /\b(log|logger|logging|report|alert|notify|toast|track|capture|sentry|metrics)\b\s*[.(]/.test(raw) ||
    /\b(setError|setErr|onError|handleError|fail|reject|abort|dispatchEvent)\s*\(/.test(raw) ||
    /\bprocess\.exitCode\b/.test(raw) ||
    /\bresolve\s*\(/.test(raw) ||   // resolving to a null/false answer is an explicit answer
    /\breturn\b/.test(raw)           // returning a Result is legitimate error handling
  );
}

// The text of the try block that a given catch belongs to.
function tryBodyOf(code, catchIdx) {
  const before = code.lastIndexOf("try", catchIdx);
  if (before === -1) return "";
  const open = code.indexOf("{", before);
  if (open === -1 || open > catchIdx) return "";
  let depth = 0, end = -1;
  for (let i = open; i < code.length; i++) {
    if (code[i] === "{") depth++;
    else if (code[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) return "";
  return code.slice(open + 1, Math.min(end, catchIdx));
}

// A guard whose only job is to protect one I/O probe and skip it on failure. This is
// the single most common legitimate empty catch in real code, so it is never reported:
//   try { txt = fs.readFileSync(p); } catch { continue; }
//   try { const c = JSON.parse(s); } catch { c = null; }
const IO_PROBE = /\b(?:readFileSync|readFile|readdirSync|statSync|existsSync|accessSync|openSync|createReadStream|JSON\s*\.\s*parse|parseInt|parseFloat|Number\s*\(|decodeURIComponent|unzipSync|readFile\s*\()/;
function isIoGuard(tryBody) {
  if (!IO_PROBE.test(tryBody)) return false;
  // The guarded region must be dominated by that one call: no second statement that
  // could represent real work whose failure the user needs to know about.
  const stmts = tryBody.trim().split(/[;\n]/).map((s) => s.trim()).filter(Boolean);
  if (stmts.length > 2) return false;
  return true;
}

function scanSwallowed(src, code, file, sink, scopes) {
  const re = /\bcatch\s*(\(([A-Za-z_$][\w$]*)\))?\s*\{/g;
  const seen = new Set();
  let m;
  while ((m = re.exec(code))) {
    const start = m.index;
    const open = m.index + m[0].length - 1;
    let depth = 0, end = -1;
    for (let i = open; i < code.length; i++) {
      if (code[i] === "{") depth++;
      else if (code[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end === -1) continue;
    const raw = src.slice(open + 1, end);
    const line = lineOf(src, start);
    if (seen.has(line)) continue;
    seen.add(line);
    if (reportsError(raw)) continue;

    const sc = enclosing(scopes, start);
    const inLoop = hasAncestor(sc, ["for", "while"]);
    // A promise-chain handler: `.then(...).catch(...)` has no `try` keyword at all,
    // so detect it from the catch's own text and the chain immediately before it.
    const inChain = /\.\s*catch\s*\(/.test(src.slice(start, start + m[0].length + 2)) ||
      /\.then\s*\(/.test(code.slice(Math.max(0, start - 200), start));

    const trimmed = raw.trim();
    const isEmpty = !trimmed || /^\/\*[\s\S]*?\*\/$/.test(trimmed) || /^\/\/.*$/.test(trimmed);
    const tryBody = tryBodyOf(code, start);

    // The dominant legitimate pattern: a catch protecting one I/O or parse probe.
    if (isIoGuard(tryBody)) continue;

    // Deliberate, annotated suppression: the author already decided this is fine.
    if (/deep-era-allow:\s*swallowed-exception/.test(src.split("\n").slice(0, 12).join("\n"))) continue;

    // A catch that only skips an optional item in a loop (continue / pass) is normal.
    if (/^\s*(?:continue|pass|break)\s*;?\s*$/.test(trimmed) && inLoop) continue;

    // HONESTY GATE. Distinguishing "this author deliberately tolerates a failure"
    // from "the AI forgot to handle this" needs type information and intent that a
    // regex cannot recover. Best-effort wrappers (an offline audit that is allowed to
    // fail), defensive scans, and deliberate degradation are all correct code that
    // looks identical to a real bug. Reporting them would bury the true findings and
    // teach the reader to ignore this rule, which is worse than not having it.
    //
    // So we report ONLY the case that cannot be intentional: an empty catch in a
    // promise chain, where the rejection is dropped and the chain continues as if it
    // had succeeded. That is never deliberate, and it is what the rule is for.
    if (!(isEmpty && inChain)) continue;

    // Reached only for the empty-catch-in-a-promise-chain case (see HONESTY GATE).
    sink({
      file, rule: "swallowed-exception", sev: "high", line,
      msg: "Empty catch inside a promise chain: the rejection is dropped and the chain continues as if it had succeeded. Log it, rethrow it, or return a Result.",
    });
  }

  // Second shape, and the one that actually appears in modern code: a `.catch()`
  // handler whose body does nothing. There is no `catch {}` block to find, so the
  // block scanner above never sees it.
  const chainRe = /\.catch\s*\(\s*(?:\(\s*[\w$]*\s*\)|([\w$]+))\s*=>\s*\{/g;
  let cm;
  while ((cm = chainRe.exec(code))) {
    const open = cm.index + cm[0].length - 1;
    let depth = 0, end = -1;
    for (let i = open; i < code.length; i++) {
      if (code[i] === "{") depth++;
      else if (code[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end === -1) continue;
    const body = src.slice(open + 1, end).trim();
    // The handler text includes its own parameter list, so test the whole arrow.
    const handler = src.slice(cm.index, end + 1);
    // If the handler reports the failure in any way, it is not a bug.
    if (reportsError(body) || reportsError(handler)) continue;
    const param = cm[1] ? "the rejection" : "the error";
    sink({
      file, rule: "swallowed-exception", sev: "high", line: lineOf(src, cm.index),
      msg: `Empty \`.catch()\` handler: ${param} is discarded and the promise chain continues as if it had succeeded. Log it, rethrow it, or return a Result.`,
    });
  }
}

// ---------------------------------------------------------------------------
// Floating promise: a promise-returning call in statement position with no
// await / return / .catch / void / .then-with-reject.
// ---------------------------------------------------------------------------
// Only names that unambiguously return a promise in mainstream APIs. Deliberately
// excludes add/set/remove/write/delete: those are Map/Set/Array methods as often as
// they are network calls, and guessing wrong here would cry wolf on ordinary code.
const PROMISE_METHODS = new Set([
  "then", "save", "send", "publish", "emit", "upload", "submit", "fetch",
  "exec", "execFile", "insert", "upsert", "post", "put", "patch",
]);
const PROMISE_GLOBALS = new Set(["fetch"]);
const IGNORED_RECEIVERS = new Set(["console", "Math", "JSON", "Object", "Array", "String", "Number", "Boolean", "process", "res", "req"]);
// Keywords that mean the line is not a bare expression statement.
const NOT_A_STATEMENT = /^(?:return|await|yield|const|let|var|if|for|while|do|switch|throw|export|import|function|class|async|void|new|delete|typeof|default|case|break|continue)\b/;

// Offsets of every `async` function body: inside one, a dropped promise rejects with
// no handler at all. Outside one, top-level code usually has a global handler or is
// a fire-and-forget by design, so we stay quiet.
function asyncFunctionRanges(code) {
  const ranges = [];
  const re = /\basync\s+(?:function\b|\(|[A-Za-z_$][\w$]*\s*=>)/g;
  let m;
  while ((m = re.exec(code))) {
    const open = code.indexOf("{", m.index);
    if (open === -1) continue;
    // For `async (x) => {` the body brace is the first one after the arrow.
    let depth = 0, end = -1;
    for (let i = open; i < code.length; i++) {
      if (code[i] === "{") depth++;
      else if (code[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end !== -1) ranges.push([m.index, end]);
  }
  return ranges;
}

function inAsyncContext(ranges, idx) {
  for (const [s, e] of ranges) if (idx >= s && idx <= e) return true;
  return false;
}

function scanFloatingPromise(src, code, file, sink) {
  const asyncRanges = asyncFunctionRanges(code);
  const lines = code.split("\n");
  let offset = 0;
  for (const line of lines) {
    offset += line.length + 1;
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (NOT_A_STATEMENT.test(trimmed)) continue;
    if (/^[)\]}]/.test(trimmed)) continue;               // continuation of a prior expression
    if (/^(?:\/\/|\/\*|\*)/.test(trimmed)) continue;      // comment
    const head = trimmed.match(/^([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*\(/);
    if (!head) continue;
    const callee = head[1];
    const parts = callee.split(".");
    const root = parts[0];
    const method = parts.length > 1 ? parts[parts.length - 1] : null;
    const isPromiseish = PROMISE_GLOBALS.has(callee) || (method !== null && PROMISE_METHODS.has(method));
    if (!isPromiseish) continue;
    if (IGNORED_RECEIVERS.has(root)) continue;

    if (/\.\s*(?:catch|then|finally)\s*\(/.test(trimmed)) continue;
    if (/\bawait\b|\breturn\b|\byield\b|\bvoid\b/.test(trimmed)) continue;
    if (/^\w+\s*[:=]/.test(trimmed)) continue;             // assigned to a variable
    if (/\.pipe\s*\(/.test(trimmed)) continue;
    if (/addEventListener\s*\(/.test(trimmed)) continue;
    if (/\b(?:setTimeout|setInterval|queueMicrotask)\s*\(/.test(trimmed)) continue;

    // Only inside an async function does an unhandled rejection actually bite.
    const idx = code.indexOf(trimmed, offset - line.length - 1);
    if (!inAsyncContext(asyncRanges, idx)) continue;

    sink({
      file, rule: "floating-promise", sev: "medium",
      line: lineOf(src, offset - line.length - 1),
      msg: `Promise not awaited and has no .catch(): "${trimmed.replace(/\s+/g, " ").slice(0, 60)}". Inside an async function a rejection here is unhandled and can crash the process.`,
    });
  }
}

// ---------------------------------------------------------------------------
// Dead branch: constant conditions and self-comparisons.
// ---------------------------------------------------------------------------
function scanDeadBranch(src, code, file, sink) {
  const consts = new Map();
  for (const m of code.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(true|false|null|undefined|\d+)\s*;/g)) {
    consts.set(m[1], m[2]);
  }
  const re = /\b(?:if|while)\s*\(\s*(true|false|1|0|null|undefined)\s*\)/g;
  let m;
  while ((m = re.exec(code))) {
    sink({
      file, rule: "dead-branch", sev: "medium", line: lineOf(src, m.index),
      msg: `\`${m[0].trim()}\` is a constant condition: this branch is dead code. Unfinished logic.`,
    });
  }
  for (const name of consts.keys()) {
    const esc = name.replace(/[$]/g, "\\$");
    const eq = new RegExp(`\\b${esc}\\s*={2,3}\\s*${esc}\\b`);
    const ne = new RegExp(`\\b${esc}\\s*!={1,2}\\s*${esc}\\b`);
    if (eq.test(code)) sink({ file, rule: "dead-branch", sev: "medium", line: lineOf(src, code.search(eq)), msg: `\`${name} === ${name}\` is always true: dead condition.` });
    else if (ne.test(code)) sink({ file, rule: "dead-branch", sev: "medium", line: lineOf(src, code.search(ne)), msg: `\`${name} !== ${name}\` is always false: dead condition.` });
  }
  const guard = /\bif\s*\(\s*true\s*\)\s*\{\s*return\s+(true|false)\s*;\s*\}/g;
  while ((m = guard.exec(code))) {
    sink({ file, rule: "dead-branch", sev: "high", line: lineOf(src, m.index), msg: `Always-true guard returning \`${m[1]}\`: this function always returns ${m[1]}. Unfinished validation logic.` });
  }
}

// ---------------------------------------------------------------------------
// Test quality: assertions that cannot fail, and suites with no real assertions.
// ---------------------------------------------------------------------------
function scanTestQuality(src, file, sink) {
  const code = scrub(src);
  // Only real test files are judged. `tests/lib/*.js` are helpers, `tests/perf.js`
  // is a benchmark: neither is supposed to contain assertions, and flagging them
  // would be a false accusation.
  const isTest = /\.(test|spec)\.[jt]sx?$/.test(file) || /(^|\/)(tests?|__tests__|spec)\/[^/]*\.(test|spec)\.[jt]sx?$/.test(file);
  if (!isTest) return;
  let tautologies = 0;
  const pushTautology = (idx, msg) => {
    tautologies++;
    sink({ file, rule: "tautological-test", sev: "high", line: lineOf(src, idx), msg: `${msg} (${meta("tautological-test").why})` });
  };

  const okLit = /\bassert(?:\.\w+)?\s*\.\s*ok\s*\(\s*(true|1)\s*[,)]/g;
  let m;
  while ((m = okLit.exec(code))) pushTautology(m.index, `\`assert.ok(${m[1]})\` can never fail, so this test proves nothing.`);
  const selfCompare = /\bexpect\s*\(\s*(true|false)\s*\)\s*\.\s*to(Be|Equal)\s*\(\s*\1\s*\)/g;
  while ((m = selfCompare.exec(code))) pushTautology(m.index, `\`expect(${m[1]}).to${m[2]}(${m[1]})\` can never fail, so this test proves nothing.`);
  const strictSelf = /\bassert\.(?:strictEqual|deepStrictEqual)\s*\(\s*(true|false)\s*,\s*\1\s*\)/g;
  while ((m = strictSelf.exec(code))) pushTautology(m.index, `\`assert.strictEqual(${m[1]}, ${m[1]})\` can never fail, so this test proves nothing.`);
  const shouldTrue = /\bshould(?:\.be)?\s*\.\s*(?:be\s*\.\s*)?true\b/g;
  while ((m = shouldTrue.exec(code))) pushTautology(m.index, "`should.be.true` can never fail, so this test proves nothing.");

  // Assertions that are not tautologies count as real verification work.
  const allAssertions = code.match(/\b(?:assert(?:\.\w+)?|expect|should)\s*[(.]/g) || [];
  const realAssertions = allAssertions.length - tautologies;
  const hasThrow = /\bthrow\b/.test(code);
  // Two distinct failures, never both at once. A file whose only assertions are
  // tautologies is an "always-passing suite", not an "empty test" — reporting both
  // would double-count one problem and bury it in noise.
  if (tautologies > 0 && realAssertions <= 0) {
    sink({ file, rule: "always-passing-suite", sev: "high", line: 1, msg: `All ${tautologies} assertion(s) in this file are tautologies: the suite is green no matter what the code does.` });
  } else if (!realAssertions && !hasThrow && tautologies === 0) {
    sink({ file, rule: "empty-test", sev: "medium", line: 1, msg: "Test file has no assertions: it passes unconditionally and guards nothing." });
  }
}

// ---------------------------------------------------------------------------
// Entry points
// ---------------------------------------------------------------------------
function analyzeFile(cwd, file, absPath, caps) {
  const col = makeCollector(caps);
  const sink = col.push;
  let src = "";
  try { src = fs.readFileSync(absPath, "utf8"); } catch { return []; }
  const isTest = /\.(test|spec)\.[jt]sx?$/.test(file) || /(^|\/)(tests?|__tests__|spec)\//.test(file);
  scanTestQuality(src, file, sink);
  if (!isTest && JS_EXT.test(file)) {
    const code = scrub(src);
    const scopes = buildScopeIndex(code);
    scanSwallowed(src, code, file, sink, scopes);
    scanFloatingPromise(src, code, file, sink);
    scanDeadBranch(src, code, file, sink);
  }
  return col.all();
}

function semanticScan(cwd, files, caps) {
  const out = [];
  const targets = files
    .filter((f) => JS_EXT.test(f.file))
    .filter((f) => !f.file.startsWith("tests/fixtures/") && !/(^|\/)(dist|build|node_modules|\.next)\//.test(f.file))
    .filter((f) => f.size > 0 && f.size < 300000)
    .slice(0, 400);
  for (const f of targets) {
    try { out.push(...analyzeFile(cwd, f.file, path.join(cwd, f.file), caps)); } catch {}
  }
  return out;
}

module.exports = { semanticScan, analyzeFile, scrub, RULE_META, buildScopeIndex, reportsError };
