// slop.js — detects AI over-engineering, the complaint that comes up most often
// about machine-written code.
//
// WHY: the sharpest recurring complaint in developer forums is not that AI code is
// wrong. It is that it is "humongous", full of "types and indirection", doing things
// "which can be done manually, much simpler with fewer lines". The code runs, so the
// usual gates pass, and then a senior engineer spends days untangling it. Every one
// of those days is money.
//
// WHAT THIS IS NOT: a style linter. Prettier and ESLint already own formatting, and
// duplicating them would only produce noise. This detects the structural habits that
// make code expensive to own: layers that wrap nothing, indirection that can be
// collapsed, dead code that no longer runs, and one-name indirection variables.
//
// HONESTY: these are judgement calls, so every rule demands strong evidence, reports
// at most a handful of findings per file, and states the concrete reason. An earlier
// draft of this file flagged 30+ places in this repository; every one was legitimate
// code, and the rules were narrowed until the remaining output was defensible. Silent
// is better than noisy.
const fs = require("fs");
const path = require("path");

const JS = /\.(js|ts|tsx|jsx|mjs|cjs)$/;
const CAP_PER_FILE = 4;
const CAP_TOTAL = 20;

function scrub(src) {
  const out = src.split("");
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    const c2 = src.slice(i, i + 2);
    if (c2 === "//") { let j = src.indexOf("\n", i); if (j === -1) j = n; for (let k = i; k < j; k++) out[k] = " "; i = j; continue; }
    if (c2 === "/*") { let j = src.indexOf("*/", i + 2); if (j === -1) j = n; else j += 2; for (let k = i; k < j; k++) out[k] = " "; i = j; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1, closed = false;
      while (j < n) { if (src[j] === "\\") { j += 2; continue; } if (src[j] === c) { closed = true; break; } if (src[j] === "\n") break; j++; }
      const end = closed ? j + 1 : Math.min(j, n);
      for (let k = i + 1; k < end - 1; k++) out[k] = " ";
      i = end; continue;
    }
    if (c === "`") {
      // Preserve ${...}: the code inside a template is real code.
      let j = i + 1;
      while (j < n) {
        if (src[j] === "\\") { j += 2; continue; }
        if (src[j] === "`") break;
        if (src[j] === "$" && src[j + 1] === "{") {
          let d = 1, k = j + 2;
          while (k < n && d > 0) { if (src[k] === "{") d++; else if (src[k] === "}") d--; if (d > 0) k++; }
          for (let x = j + 2; x < k; x++) out[x] = " ";
          j = k + 1; continue;
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

// --- rule: passthrough wrapper ----------------------------------------------
// A function whose entire body is `return <other>(<same args>)`. This adds a name
// and a stack frame and nothing else. One or two are normal architecture; a file full
// of them is a rename treadmill a human has to walk backwards.
function passthroughWrappers(src, code, push) {
  const re = /(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{\s*return\s+(?:await\s+)?([A-Za-z_$][\w$]*)\s*\(\s*([^;{]*?)\s*\)\s*;?\s*\}/g;
  const hits = [];
  let m;
  while ((m = re.exec(code))) {
    const [, name, params, target, args] = m;
    if (!params.trim()) continue;              // no args: a pure alias, not a wrapper
    const pList = params.split(",").map((s) => s.trim()).filter(Boolean);
    const aList = args.split(",").map((s) => s.trim()).filter(Boolean);
    if (pList.length !== aList.length) continue;
    // Same arguments, same order, nothing else. A real transform fails this.
    const same = pList.every((p, i) => {
      const bare = p.replace(/[^\w$]/g, "");
      const passed = aList[i].replace(/[^\w$]/g, "");
      return bare && bare === passed;
    });
    if (!same) continue;
    hits.push({ name, target, line: src.slice(0, m.index).split("\n").length });
  }
  if (hits.length >= 3) {
    for (const h of hits.slice(0, CAP_PER_FILE)) {
      push({
        rule: "slop-passthrough",
        sev: "medium",
        line: h.line,
        msg: `\`${h.name}()\` only calls \`${h.target}()\` with the same arguments — a layer that adds a name and a stack frame, not behaviour. ${hits.length} of these in one file means renames now cost two edits.`,
      });
    }
  }
}

// --- rule: indirection variable ---------------------------------------------
// `const x = y;` where y is an EXISTING IDENTIFIER. The name adds a translation step
// for the next reader and nothing else.
//
// Literals are excluded. `let closed = false` and `let dirty = false` declare state,
// they do not alias anything, and flagging them would be pure noise — an early draft
// of this rule produced 14 such false positives across this repository before the
// literal check was added.
const JS_LITERALS = new Set([
  "true", "false", "null", "undefined", "NaN", "Infinity",
  "this", "arguments", "globalThis",
]);

function indirectionVars(src, code, push) {
  let n = 0;
  const re = /^[ \t]+(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*([A-Za-z_$][\w$]*)\s*;[ \t]*$/gm;
  let m;
  while ((m = re.exec(code)) && n < CAP_PER_FILE) {
    const [, name, from] = m;
    if (name === from) continue;
    if (JS_LITERALS.has(from)) continue;
    if (/^(typeof|instanceof|new|await|yield|void|delete)$/.test(from)) continue;
    // The right side must actually be a declared variable, not a keyword or global.
    if (!new RegExp(`\\b(?:const|let|var|function)\\s+${from.replace(/[$]/g, "\\$")}\\b`).test(code)) continue;
    // A rename used ONLY as the initial value and then never read again is not a
    // pointless alias, it is how a variable is declared before a loop reassigns it
    // (`let out = src; out[k] = ...`). Only flag the rename when BOTH names are
    // actually used afterwards, which is what makes the reader translate twice.
    const nameRe = new RegExp(`\\b${name.replace(/[$]/g, "\\$")}\\b`, "g");
    const fromRe = new RegExp(`\\b${from.replace(/[$]/g, "\\$")}\\b`, "g");
    const rest = code.slice(m.index + m[0].length);
    const nameUses = (rest.match(nameRe) || []).length;
    const fromUses = (rest.match(fromRe) || []).length;
    if (nameUses === 0 || fromUses === 0) continue;
    n++;
    push({
      rule: "slop-indirection",
      sev: "low",
      line: src.slice(0, m.index).split("\n").length,
      msg: `\`${name} = ${from}\` renames a variable to another name and adds nothing. Use \`${from}\` directly.`,
    });
  }
}

// --- rule: dead code --------------------------------------------------------
// A file-level function or exported name that nothing in the repository references.
// This is the expensive one: dead code still has to be read, maintained, and
// reasoned about, and a newcomer cannot tell it is dead.
function deadExports(cwd, files) {
  const out = [];
  const jsFiles = files.filter((f) => JS.test(f.file) && !f.file.startsWith("tests/fixtures/") && f.size < 250000).slice(0, 200);
  if (jsFiles.length < 4) return out;                 // too small to judge reachability
  const sources = new Map();
  for (const f of jsFiles) {
    try { sources.set(f.file, fs.readFileSync(path.join(cwd, f.file), "utf8")); } catch {}
  }
  // Anything mentioned outside its own file is alive.
  for (const [file, txt] of sources) {
    const declared = [];
    const fnRe = /^[ \t]*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm;
    let m;
    while ((m = fnRe.exec(txt))) declared.push(m[1]);
    const clsRe = /^[ \t]*(?:export\s+)?class\s+([A-Za-z_$][\w$]*)/gm;
    while ((m = clsRe.exec(txt))) declared.push(m[1]);
    // Only non-exported, top-level functions are candidates: an exported name may be
    // consumed by a consumer we cannot see, and guessing wrong here is a false alarm.
    if (/export\s/.test(txt.slice(0, m ? m.index : 0))) { /* noop */ }
    const unexported = [];
    const lineStart = /(^|\n)([ \t]*)(export\s+)?(?:default\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g;
    let u;
    while ((u = lineStart.exec(txt))) {
      if (!u[3]) unexported.push(u[4]);               // not exported -> internal only
    }
    if (!unexported.length) continue;

    const others = [...sources.entries()].filter(([f]) => f !== file).map(([, t]) => t).join("\n");
    const selfTxt = txt;
    for (const name of unexported) {
      const usesElsewhere = new RegExp(`\\b${name.replace(/[$]/g, "\\$")}\\b`).test(others);
      if (usesElsewhere) continue;
      const selfUses = (selfTxt.match(new RegExp(`\\b${name.replace(/[$]/g, "\\$")}\\b`, "g")) || []).length;
      if (selfUses > 1) continue;                     // used inside its own file
      const line = selfTxt.slice(0, selfTxt.indexOf(new RegExp(`(?:function|class)\\s+${name.replace(/[$]/g, "\\$")}\\b`))).split("\n").length;
      out.push({
        file,
        rule: "slop-dead-code",
        sev: "medium",
        line: line || 1,
        msg: `\`${name}\` is defined and never called anywhere in this repository. Dead code still costs reading, maintenance, and reviewer attention. Delete it or wire it up.`,
      });
    }
  }
  return out;
}

// --- rule: chain depth ------------------------------------------------------
// A call whose argument is itself nothing but another call, three levels deep. This
// is the "function calling function and doing all sorts of nonsense" shape.
function callChains(src, code, push) {
  const re = /\b([A-Za-z_$][\w$]*)\s*\(\s*([A-Za-z_$][\w$]*)\s*\(\s*([A-Za-z_$][\w$]*)\s*\(\s*([A-Za-z_$][\w$]*)\s*\([^()]*\)\s*\)\s*\)\s*\)/g;
  let n = 0;
  let m;
  while ((m = re.exec(code)) && n < CAP_PER_FILE) {
    // Skip the standard library and the obvious intentional pipelines.
    const chain = [m[1], m[2], m[3], m[4]];
    if (/^(Array|Object|String|Number|Math|JSON|Promise|Set|Map|Date|parseInt|parseFloat|isNaN|Boolean)$/.test(chain[0])) continue;
    if (/^(map|filter|forEach|reduce|slice|join|concat|then|catch|find|some|every|sort|push|includes|trim|split|replace)$/.test(chain[0])) continue;
    n++;
    push({
      rule: "slop-chain",
      sev: "low",
      line: src.slice(0, m.index).split("\n").length,
      msg: `\`${chain[0]}(${chain[1]}(${chain[2]}(...)))\` — ${chain.length} call levels with nothing in between. Split it into named steps or flatten it; the reader has to hold the whole nest in their head.`,
    });
  }
}

function slopScan(cwd, files) {
  const perFile = new Map();
  let total = 0;
  const add = (file, f) => {
    if (total >= CAP_TOTAL) return;
    const c = perFile.get(file) || 0;
    if (c >= CAP_PER_FILE) return;
    perFile.set(file, c + 1);
    total++;
    out.push({ file, ...f });
  };
  const out = [];

  for (const f of files) {
    if (!JS.test(f.file)) continue;
    if (f.file.startsWith("tests/fixtures/") || f.file.startsWith("tests/")) continue;
    if (/(^|\/)(dist|build|node_modules|\.next|coverage)\//.test(f.file)) continue;
    if (f.size > 250000 || f.size < 80) continue;
    let src = "";
    try { src = fs.readFileSync(path.join(cwd, f.file), "utf8"); } catch { continue; }
    const code = scrub(src);
    const push = (x) => add(f.file, x);
    // Cheapest-and-loudest rules first so the per-file budget is spent on the
    // clearest evidence rather than whichever rule happened to run first.
    passthroughWrappers(src, code, push);
    callChains(src, code, push);
    indirectionVars(src, code, push);
  }

  for (const d of deadExports(cwd, files)) {
    if (total >= CAP_TOTAL) break;
    add(d.file, { rule: d.rule, sev: d.sev, line: d.line, msg: d.msg });
  }
  return out;
}

module.exports = { slopScan, scrub };