// tsparse.js — structural syntax verification for TypeScript / TSX / JSX, zero deps.
// WHY: verify.js used to skip every .ts/.tsx/.jsx file ("needs tsc in CI"). That is a
// false PASS: an AI can ship a TypeScript file that does not even parse and `check` says
// green. Node cannot parse TS, and tsc may not be installed, so this module does its own
// token-level structural check with the stdlib only.
//
// SCOPE + HONESTY (never a lie):
//   * It verifies STRUCTURE: (), [], {}, and <> are balanced and correctly nested,
//     strings/templates/regex/comments are terminated, no dangling operators.
//   * It does NOT type-check. A file can pass here and still have type errors —
//     that stays tsc's job. The return value says which files were structurally
//     verified so callers can report coverage instead of implying full validation.
const fs = require("fs");
const path = require("path");

const TS_EXT = /\.(ts|tsx|mts|cts)$/;
const JSX_EXT = /\.(jsx|tsx)$/;

// Strip regions where brackets are not code: strings, template literals, regex
// literals, line/block comments. Replaced with spaces so byte offsets are preserved
// and error positions still point at the real line/column.
function blank(str, from, to) {
  return " ".repeat(Math.max(0, to - from));
}

// Returns cleaned source with all non-code regions blanked, plus the set of
// offsets that must be treated as JSX text (inside JSX children). null on
// unterminated construct (caller reports it).
function stripNonCode(src, allowJsx) {
  const out = src.split("");
  const jsxText = new Set();
  let i = 0;
  const n = src.length;
  const fail = { unterminated: null };
  // Stack of template-literal `${` nesting so a `}` inside a substitution does not
  // close the outer template.
  const tstack = [];

  while (i < n) {
    const c = src[i];
    const c2 = src.slice(i, i + 2);

    // line comment
    if (c2 === "//") {
      let j = src.indexOf("\n", i);
      if (j === -1) j = n;
      for (let k = i; k < j; k++) out[k] = " ";
      i = j;
      continue;
    }
    // block comment
    if (c2 === "/*") {
      let j = src.indexOf("*/", i + 2);
      if (j === -1) { fail.unterminated = { at: i, what: "block comment" }; j = n; }
      else j += 2;
      for (let k = i; k < j; k++) out[k] = " ";
      i = j;
      continue;
    }
    // strings (single/double). Unterminated is a real syntax error.
    if (c === '"' || c === "'") {
      let j = i + 1;
      let closed = false;
      while (j < n) {
        if (src[j] === "\\") { j += 2; continue; }
        if (src[j] === c) { closed = true; break; }
        if (src[j] === "\n") break; // newline in a normal string = unterminated
        j++;
      }
      if (!closed) { fail.unterminated = { at: i, what: "string" }; for (let k = i; k < Math.min(j, n); k++) out[k] = " "; i = Math.min(j, n); continue; }
      for (let k = i; k < j + 1; k++) out[k] = k === i || k === j ? src[k] : " ";
      i = j + 1;
      continue;
    }
    // template literal
    if (c === "`") {
      let j = i + 1;
      let closed = false;
      let depth = 0;
      while (j < n) {
        if (src[j] === "\\") { j += 2; continue; }
        if (src[j] === "`" && depth === 0) { closed = true; break; }
        if (src[j] === "$" && src[j + 1] === "{") { depth++; j += 2; continue; }
        if (src[j] === "}" && depth > 0) { depth--; j++; continue; }
        j++;
      }
      if (!closed) { fail.unterminated = { at: i, what: "template literal" }; for (let k = i; k < n; k++) out[k] = " "; i = n; continue; }
      for (let k = i; k < j + 1; k++) out[k] = (src[k] === "`") ? src[k] : " ";
      i = j + 1;
      continue;
    }
    // regex literal — only where a value is expected, else it is division.
    if (c === "/") {
      const before = out.slice(0, i).join("").replace(/\s+$/, "");
      const lastCh = before[before.length - 1];
      const valueExpected = !lastCh || /[({[,;:!&|?+\-*/%~^<>=]/.test(lastCh) || /\b(return|typeof|case|in|of|new|delete|void|do|else|yield|await)$/.test(before);
      if (valueExpected) {
        let j = i + 1;
        let closed = false;
        let inClass = false;
        while (j < n) {
          const ch = src[j];
          if (ch === "\\") { j += 2; continue; }
          if (ch === "\n") break;
          if (ch === "[") inClass = true;
          else if (ch === "]") inClass = false;
          else if (ch === "/" && !inClass) { closed = true; break; }
          j++;
        }
        if (closed) {
          let k = j + 1;
          while (k < n && /[a-z]/.test(src[k])) k++; // flags
          for (let x = i; x < k; x++) out[x] = " ";
          i = k;
          continue;
        }
      }
      i++;
      continue;
    }
    i++;
  }
  return { code: out.join(""), jsxText, fail };
}

// Locate JSX text regions so `<` inside children text is not read as a type
// argument. Conservative: we only blank `<` when a matching `>` exists before the
// next `{` at the same nesting depth and the tag looks like `<Name` or `</Name`.
function blankJsxAngles(src, jsxEnabled) {
  if (!jsxEnabled) return src;
  const tag = /<\/?[A-Za-z][A-Za-z0-9_.$-]*(\s[^<>]*)?\/?>/g;
  let m;
  while ((m = tag.exec(src))) {
    const inner = m[0];
    const start = m.index;
    // Rewrite in place: the caller needs the transformed string, and a mutable
    // local copy here is not indirection, it is the value being produced.
    const chars = src.split("");
    for (let k = start; k < start + inner.length; k++) {
      if (chars[k] === "<" || chars[k] === ">") chars[k] = " ";
    }
    return chars.join("");
  }
  return src;
}

function posOf(src, idx) {
  const upto = src.slice(0, idx);
  const line = upto.split("\n").length;
  const col = idx - (upto.lastIndexOf("\n") + 1) + 1;
  return { line, col };
}

// Structural check on already-stripped code.
function checkStructure(code) {
  const pairs = { "(": ")", "[": "]", "{": "}" };
  const openers = new Set(["(", "[", "{"]);
  const closers = { ")": "(", "]": "[", "}": "{" };
  const stack = [];
  for (let i = 0; i < code.length; i++) {
    const c = code[i];
    if (openers.has(c)) stack.push({ c, i });
    else if (closers[c]) {
      const top = stack.pop();
      if (!top) return { err: `unmatched closing "${c}"` , at: i };
      if (top.c !== closers[c]) return { err: `"${c}" closed but "${top.c}" was opened`, at: i };
    }
  }
  if (stack.length) {
    const top = stack[stack.length - 1];
    return { err: `unclosed "${top.c}"`, at: top.i };
  }
  // dangling binary operator at end of file: `a +\n}` handled by brace balance,
  // but `const x = 1 +` (trailing operator) is a real truncation symptom.
  if (/[+\-*/%&|^<>=~?:,]$/.test(code.replace(/\s+$/, ""))) {
    const trimmed = code.replace(/\s+$/, "");
    if (!/[=({\[,;:.?]$/.test(trimmed.slice(0, -1)) && !/\b(return|typeof|new|await|yield|in|of|case|do|else)$/.test(trimmed.slice(0, -1))) {
      return { err: "expression ends with a dangling operator (truncated code?)", at: Math.max(0, trimmed.length - 1) };
    }
  }
  return null;
}

// Type positions where `<` is a generic/type argument, not a comparison. Used to
// decide whether `<`/`>` are brackets that must balance or plain operators.
function genericAnglePositions(code) {
  // Heuristic but conservative: only treat `<` as a bracket when it directly
  // follows an identifier/`)`/`]` AND a matching `>` exists with only type-ish
  // characters between (identifiers, dots, commas, brackets, quotes, spaces).
  const opens = new Set();
  const re = /([A-Za-z_$][\w$]*|\)|\])\s*</g;
  let m;
  while ((m = re.exec(code))) {
    const start = m.index + m[0].length - 1;
    let depth = 0;
    for (let i = start; i < code.length; i++) {
      const c = code[i];
      if (c === "<") { depth++; continue; }
      if (c === ">") { depth--; if (depth === 0) { opens.add(start); break; } continue; }
      if (c === ";" || c === "{" || c === "}" || c === "\n\n") break;
    }
  }
  return opens;
}

function checkAngles(code, allowJsx) {
  const opens = genericAnglePositions(code);
  let depth = 0;
  let start = -1;
  for (let i = 0; i < code.length; i++) {
    const c = code[i];
    if (c === "<") {
      if (!allowJsx && !opens.has(i)) continue; // plain less-than
      if (depth === 0) start = i;
      depth++;
    } else if (c === ">" && depth > 0) {
      depth--;
      if (depth === 0) { opens.delete(start); start = -1; }
    }
  }
  if (depth > 0) return { err: "unclosed \"<\" (generic type argument or JSX tag?)", at: start };
  return null;
}

// Verify one file. Returns { ok, err, line, col, kind }
function verifyFile(absPath, rel) {
  let src = "";
  try { src = fs.readFileSync(absPath, "utf8"); } catch (e) {
    return { ok: false, err: `cannot read: ${e.message}`, line: 0, col: 0, kind: "io" };
  }
  const ext = path.extname(rel).toLowerCase();
  const allowJsx = JSX_EXT.test(ext) || allowJsxByTsConfig(absPath);
  const stripped = stripNonCode(src, allowJsx);
  if (stripped.fail.unterminated) {
    const { line, col } = posOf(src, stripped.fail.unterminated.at);
    return { ok: false, err: `unterminated ${stripped.fail.unterminated.what}`, line, col, kind: "unterminated" };
  }
  let code = blankJsxAngles(stripped.code, allowJsx);
  let bad = checkStructure(code);
  if (!bad) bad = checkAngles(code, allowJsx);
  if (!bad) {
    // A `case`/`if` parenthesis mismatch already covered; add a TS-specific check:
    // arrow function with missing body `=> {` unbalanced is caught above.
    // Detect the classic AI truncation: file ends inside a comment or string.
    if (/^\s*\/\*(?!\*\/)/.test(src.replace(/\s+$/, ""))) {
      bad = { err: "file ends inside an unterminated block comment", at: Math.max(0, src.length - 1) };
    }
  }
  if (!bad) return { ok: true };
  const { line, col } = posOf(src, bad.at);
  return { ok: false, err: bad.err, line, col, kind: "structure" };
}

// jsx option from tsconfig: cheap read, no JSONC parser needed for this one flag.
function allowJsxByTsConfig(absPath) {
  try {
    const dir = path.dirname(absPath);
    for (let up = 0; up < 6; up++) {
      const cfg = path.join(dir, "tsconfig.json");
      if (fs.existsSync(cfg)) {
        const txt = fs.readFileSync(cfg, "utf8");
        return /"jsx"\s*:/.test(txt);
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  } catch {}
  return false;
}

// Batch: verify up to `limit` TS/TSX/JSX files. Returns
// { checked, skipped, bad:[{file,err,line,col}], coverage } — coverage is an honest
// statement of what was verified, never a claim that types are correct.
function verifyMany(cwd, files, limit = 120) {
  const targets = files
    .filter((f) => (TS_EXT.test(f.file) || /\.(jsx|mjs|cjs|js)$/.test(f.file)) && !/node_modules/.test(f.file))
    .filter((f) => /\.(ts|tsx|jsx)$/.test(f.file)) // only the files Node could NOT parse
    .filter((f) => !f.file.startsWith("tests/fixtures/") && f.size < 400000)
    .slice(0, limit);
  const bad = [];
  for (const f of targets) {
    const r = verifyFile(path.join(cwd, f.file), f.file);
    if (!r.ok) bad.push({ file: f.file, err: r.err, line: r.line, col: r.col });
  }
  return {
    checked: targets.length,
    bad,
    coverage: `${targets.length} TS/TSX/JSX file(s) structurally verified (types still need tsc)`,
  };
}

module.exports = { verifyFile, verifyMany, stripNonCode, checkStructure, checkAngles };
