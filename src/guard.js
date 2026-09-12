// Guard v0.6 — 100% GENERIC, ENGLISH ONLY. No domain words.
// Same strictness for every project (web, app, bot, API, ML):
// dummy proof + dangerous code + missing verify + non-English code.
const fs = require("fs");
const path = require("path");

// Distinctive non-English (romanized) words that never appear in real English
// code/comments. Checks comments only — user-facing strings are exempt.
const NON_EN_WORDS = [
  "nahi", "nahin", "chahiye", "chahye", "lazmi", "lazim", "karo", "karega", "karegi",
  "karke", "karke", "wala", "wali", "wale", "walon", "magar", "kyunki", "kyonki",
  "kese", "kaise", "kitna", "kitni", "kitne", "matlab", "samjho", "dekho", "dikhao",
  "batao", "banao", "chalao", "parho", "parhna", "likho", "rakho", "pakro", "pakarna",
  "mana", "sakht", "ghalat", "ghalti", "wajah", "waja", "andha", "andhe", "aankhein",
  "bewaqoof", "khushamad", "purani", "nayi", "dobara", "wapas", "pehle", "phir",
  "abhi", "wahin", "upar", "neeche", "andar", "bahar", "saath", "sath", "liye",
  "tumhara", "tumhare", "hamara", "hamare", "apna", "apne", "kaam", "theek",
  "ganda", "acha", "achha", "bura", "zyada", "bohat", "bahut", "thoda", "thode",
  "hoga", "hogaya", "karna", "karne", "hona", "hone", "dena", "lena", "jana",
];
const NON_EN_RE = new RegExp(`\\b(${NON_EN_WORDS.join("|")})\\b`, "i");

function extractComments(rel, txt) {
  const lines = [];
  if (/\.(js|ts|tsx|jsx|mjs|cjs|go|rs|java|php|rb|cs|dart|swift|kt)$/.test(rel)) {
    for (const m of txt.matchAll(/\/\/(.*)$/gm)) lines.push(m[1]);
    for (const m of txt.matchAll(/\/\*([\s\S]*?)\*\//g)) lines.push(m[1]);
  } else if (/\.py$/.test(rel)) {
    for (const m of txt.matchAll(/^[ \t]*#(.*)$/gm)) lines.push(m[1]);
  }
  return lines.join("\n").slice(0, 6000);
}

function normLine(l) {
  return l.trim().replace(/\s+/g, " ").slice(0, 200);
}

function isNoise(l) {
  if (!l || l.length < 20) return true;
  return /^(\/\/|#|\*|\/\*|import |from |require\(|use |package |export |<\/|<\?|}}}|\)\);?$)/.test(l);
}

// Copy-paste detector: same 6-line block in 2+ files = maintenance bomb.
// SonarQube needs a server; this runs offline in milliseconds.
function duplicationScan(cwd, files) {
  const out = [];
  const seen = new Map(); // block-hash -> {files:Set, sample}
  const eligible = files.filter((f) => /\.(js|ts|tsx|jsx|py|go|rs|java|php|rb|cs|dart|swift|kt)$/.test(f.file)
    && !f.file.startsWith("tests/fixtures/") && f.size < 100000);
  const code = eligible.slice(0, 60); // bounded: worst case stays fast
  if (eligible.length > code.length) {
    out.push({ sev: "low", rule: "dup-sampled", file: "(scan)", msg: `Dup-scan sampled ${code.length}/${eligible.length} files — huge repos are sampled, not fully scanned.` });
  }
  let windows = 0; // second bound: total hashed windows (near-identical files are pathological)
  const WINDOW_CAP = 20000;
  for (const f of code) {
    let txt = "";
    try { txt = fs.readFileSync(path.join(cwd, f.file), "utf8"); } catch { continue; }
    const lines = txt.split("\n").map(normLine);
    for (let i = 0; i + 6 <= lines.length; i++) {
      if (++windows > WINDOW_CAP) break;
      const win = lines.slice(i, i + 6);
      if (win.some(isNoise)) continue;
      const key = win.join("\n");
      if (key.length < 150) continue;
      let e = seen.get(key);
      if (!e) { e = { files: new Set(), sample: `${f.file}:${i + 1}` }; seen.set(key, e); }
      e.files.add(f.file);
      if (seen.size > 4000) break;
    }
  }
  let n = 0;
  for (const e of seen.values()) {
    if (e.files.size >= 2 && n < 5) {
      n++;
      out.push({ sev: "medium", rule: "code-duplication", file: [...e.files][0], msg: `6-line block copied in ${e.files.size} files (${[...e.files].slice(0, 3).join(", ")}). Extract a shared function.` });
    }
  }
  return out;
}

// Exported names per JS file (approximate static pass): functions, consts,
// classes, exports.x, module.exports = {a, b}. Unknown re-exports bail out.
function jsExports(txt) {
  const out = new Set();
  for (const m of txt.matchAll(/^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm)) out.add(m[1]);
  for (const m of txt.matchAll(/^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/gm)) out.add(m[1]);
  for (const m of txt.matchAll(/^\s*class\s+([A-Za-z_$][\w$]*)/gm)) out.add(m[1]);
  for (const m of txt.matchAll(/(?:exports|module\.exports)\.([A-Za-z_$][\w$]*)\s*=/g)) out.add(m[1]);
  for (const m of txt.matchAll(/module\.exports\s*=\s*\{([^}]{0,2000})\}/g)) {
    for (const k of m[1].matchAll(/([A-Za-z_$][\w$]*)\s*[:,}]/g)) out.add(k[1]);
  }
  return out;
}

function jsIsOpaque(txt) {
  // module.exports = someIdentifier → contents unknowable statically. Bail honestly.
  return /module\.exports\s*=\s*[A-Za-z_$][\w$]*\s*;/.test(txt);
}

// Undefined-method detection: AI calls mod.foo() where the local module
// never defines foo — a hallucinated API. Conservative: skips opaque modules,
// destructuring is resolved too. Medium severity (verify, don't auto-block).
function undefinedMethodScan(cwd, files, byName) {
  const out = [];
  const expCache = new Map();
  const getExp = (file) => {
    if (!expCache.has(file)) {
      try {
        const txt = require("fs").readFileSync(require("path").join(cwd, file), "utf8");
        expCache.set(file, jsIsOpaque(txt) ? null : jsExports(txt));
      } catch { expCache.set(file, null); }
    }
    return expCache.get(file);
  };
  for (const f of files) {
    if (!/\.(js|mjs|cjs)$/.test(f.file)) continue;
    if (f.file.startsWith("tests/fixtures/") || f.file.startsWith("tests/")) continue;
    if (f.size > 200000) continue;
    let txt = "";
    try { txt = require("fs").readFileSync(require("path").join(cwd, f.file), "utf8"); } catch { continue; }
    const { resolveDep } = require("./map");
    let n = 0;
    const checkCall = (modFile, method, idx) => {
      const exp = getExp(modFile);
      if (exp === null) return; // opaque — cannot judge
      if (!exp.has(method) && n < 5) {
        n++;
        const line = txt.slice(0, idx).split("\n").length;
        out.push({ sev: "medium", rule: "undefined-method", file: f.file, msg: `${method}() not exported by ${modFile} (line ${line}) — hallucinated API? Verify.` });
      }
    };
    for (const m of txt.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*require\(\s*["'](\.[^"']+)["']\s*\)/g)) {
      const base = require("path").posix.dirname(f.file.replace(/\\/g, "/"));
      const joined = require("path").posix.normalize(require("path").posix.join(base, m[2])).replace(/^\.\//, "");
      const hit = resolveDep(byName, joined);
      if (!hit || !/\.(js|mjs|cjs)$/.test(hit)) continue; // JSON/data requires have no JS exports
      const re = new RegExp(`\\b${m[1]}\\.([A-Za-z_$][\\w$]*)\\s*\\(`, "g");
      let c;
      while ((c = re.exec(txt))) checkCall(hit, c[1], c.index);
    }
    for (const m of txt.matchAll(/(?:const|let|var)\s*\{([^}]{0,500})\}\s*=\s*require\(\s*["'](\.[^"']+)["']\s*\)/g)) {
      const base = require("path").posix.dirname(f.file.replace(/\\/g, "/"));
      const joined = require("path").posix.normalize(require("path").posix.join(base, m[2])).replace(/^\.\//, "");
      const hit = resolveDep(byName, joined);
      if (!hit || !/\.(js|mjs|cjs)$/.test(hit)) continue; // JSON/data requires have no JS exports
      for (const name of m[1].split(",").map((s) => s.trim().split(/[:=]/)[0].trim()).filter(Boolean)) {
        const exp = getExp(hit);
        if (exp === null) continue;
        if (!exp.has(name) && n < 5) {
          n++;
          out.push({ sev: "medium", rule: "undefined-method", file: f.file, msg: `Destructured {${name}} not exported by ${hit} — hallucinated API? Verify.` });
        }
      }
    }
  }
  return out;
}

function guardScan(cwd, files) {
  const out = [];
  const push = (sev, rule, file, msg) => out.push({ sev, rule, file, msg });
  out.push(...duplicationScan(cwd, files));

  const codeFiles = files.filter((f) => /\.(js|ts|tsx|jsx|py|go|rs|java|php|rb|cs|dart|swift|kt)$/.test(f.file)).slice(0, 300);

  for (const f of codeFiles) {
    if (f.file.startsWith("tests/fixtures/")) continue; // intentional demo bugs — out of real scan
    if (f.size > 250000) continue;
    let txt = "";
    try { txt = fs.readFileSync(path.join(cwd, f.file), "utf8"); } catch { continue; }
    // Generic injection: user input concatenated into SQL (same bug in every stack)
    if (/execute\(\s*f["'].*SELECT/i.test(txt) || /query\(\s*["'`].*\+/i.test(txt)) {
      push("critical", "sql-injection", f.file, "String-concatenated SQL — parameterized queries are mandatory.");
    }
    // Generic danger: user input passed to a shell
    if (/exec\s*\(.*req\.(body|query|params)/.test(txt) || /os\.system\s*\(.*input/i.test(txt)) {
      push("critical", "command-injection", f.file, "User input in shell — allowlist/escape is mandatory.");
    }
    // English-only code: user may speak any language, code/comments must be English
    const comments = extractComments(f.file, txt);
    const hit = comments.match(NON_EN_RE);
    if (hit) {
      push("low", "non-english-code", f.file, `Non-English word "${hit[1]}" in comment — code and comments must be ENGLISH ONLY.`);
    }
  }

  // Python stdlib top-level modules — importing these is never a hallucination.
const PY_STDLIB = new Set(("os sys re json datetime time math random pathlib collections itertools functools typing argparse logging unittest hashlib hmac secrets string io csv sqlite3 threading multiprocessing queue socket http urllib email html xml subprocess shutil glob tempfile asyncio concurrent pdb traceback warnings weakref copy pickle struct array enum dataclasses statistics decimal fractions zoneinfo contextlib abc operator importlib inspect dis site builtins keyword tokenize ast").split(" "));

// Declared third-party deps (requirements.txt + package.json) — also not hallucinations.
function declaredDeps(cwd) {
  const out = new Set();
  try {
    for (const line of fs.readFileSync(path.join(cwd, "requirements.txt"), "utf8").split("\n")) {
      const m = line.trim().match(/^([A-Za-z0-9_.-]+)/);
      if (m && !line.trim().startsWith("#")) out.add(m[1].toLowerCase().replace(/-/g, "_"));
    }
  } catch {}
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf8"));
    for (const n of Object.keys(Object.assign({}, pkg.dependencies, pkg.devDependencies))) out.add(n.toLowerCase());
  } catch {}
  return out;
}
  // Generic dummy proof: "e.g." numbers + 9x% claim without verification output
  const docs = files.filter((f) => /\.(md|txt)$/.test(f.file)).slice(0, 60);
  for (const f of docs) {
    if (f.file.startsWith(".deep-era/") || f.file.startsWith("tests/fixtures/")) continue;
    let txt = "";
    try { txt = fs.readFileSync(path.join(cwd, f.file), "utf8"); } catch { continue; }
    if (/e\.g\.,?\s*\d/.test(txt) && /9\d(\.\d+)?%/.test(txt)) {
      push("high", "dummy-stats", f.file, "e.g. + 9x% claim looks like example numbers. Paste real command output.");
    }
  }

  // Generic: src exists but zero tests
  const hasSrc = files.some((f) => /^(src|backend|lib|app)\//.test(f.file));
  const hasTest = files.some((f) => /^(tests?|__tests__|test)\//.test(f.file) || /\.test\.(js|ts|py)$/.test(f.file));
  if (hasSrc && !hasTest) {
    push("medium", "no-tests", "tests/", "src exists but no test folder — how will it verify? At least a smoke test is mandatory.");
  }

  // Broken imports: AI imports a path that does not exist — caught before runtime.
  // Skips tests/: test files legitimately contain fake imports, mocks and fixtures.
  // Skips stdlib + declared dependencies: `import os` is NOT a hallucination.
  try {
    const { parseImports } = require("./map");
    const names = new Set(files.map((f) => f.file));
    const declared = declaredDeps(cwd);
    let n = 0;
    for (const f of codeFiles.slice(0, 120)) {
      if (f.file.startsWith("tests/fixtures/") || f.file.startsWith("tests/")) continue;
      for (const d of parseImports(cwd, f.file)) {
        const { resolveDep } = require("./map");
        if (resolveDep(names, d)) continue;
        const first = d.split("/")[0].toLowerCase().replace(/-/g, "_");
        if (PY_STDLIB.has(first) || declared.has(first)) continue;
        if (n < 8) {
          n++;
          push("medium", "broken-import", f.file, `Imports "${d}" but no such file — hallucinated path? Fix the import.`);
        }
      }
    }
  } catch {}

  // Agents-sync: the installed AGENTS.md must match the template.
  // Drifted rules = the AI (or human) weakened the gate. Re-run init if intentional.
  try {
    if (files.some((f) => f.file === "AGENTS.md")) {
      const { AGENTS_MD } = require("./init");
      const norm = (s) => s.replace(/\r\n?/g, "\n").trim();
      const actual = fs.readFileSync(path.join(cwd, "AGENTS.md"), "utf8");
      if (norm(actual) !== norm(AGENTS_MD)) {
        push("low", "agents-drift", "AGENTS.md", "Rules differ from the deep-era template — intentional? Otherwise re-run init.");
      }
    }
  } catch {}

  // Undefined methods: mod.foo() where the local module never defines foo.
  try {
    const byName = new Set(files.map((f) => f.file));
    out.push(...undefinedMethodScan(cwd, files, byName));
  } catch {}

  // Comment claims: example numbers plus nine-x-percent inside CODE comments is the
  // same hallucination as in docs — numbers without provenance.
  try {
    for (const f of codeFiles.slice(0, 120)) {
      if (f.file.startsWith("tests/fixtures/")) continue;
      let txt = "";
      try { txt = fs.readFileSync(path.join(cwd, f.file), "utf8"); } catch { continue; }
      const comments = extractComments(f.file, txt);
      if (/e\.g\.,?\s*\d/.test(comments) && /9\d(\.\d+)?%/.test(comments)) {
        push("medium", "comment-stats", f.file, "Example numbers + 9x% in code comments — prove them or remove them.");
        break;
      }
    }
  } catch {}

  return out;
}

module.exports = { guardScan };
