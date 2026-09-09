const fs = require("fs");
const path = require("path");

const PATTERNS = [
  { id: "aws-key", re: /AKIA[0-9A-Z]{16}/, sev: "critical", msg: "Possible AWS key" },
  { id: "private-key", re: /-----BEGIN (RSA )?PRIVATE KEY-----/, sev: "critical", msg: "Private key in repo" },
  { id: "openai-key", re: /sk-(proj-)?[A-Za-z0-9-_]{20,}/, sev: "critical", msg: "Possible OpenAI/API key" },
  { id: "github-token", re: /gh[pousr]_[A-Za-z0-9]{20,}/, sev: "critical", msg: "Possible GitHub token" },
  { id: "discord-webhook", re: /discord(app)?\.com\/api\/webhooks\//i, sev: "critical", msg: "Discord webhook URL leaked" },
  { id: "passwd-assign", re: /password\s*=\s*["'][^"']+["']/i, sev: "high", msg: "Hardcoded password" },
  { id: "secret-assign", re: /(api[_-]?key|secret|token)\s*=\s*["'][^"']{4,}["']/i, sev: "high", msg: "Hardcoded secret/token" },
  { id: "rm-rf", re: /rm\s+-rf\s+\//, sev: "high", msg: "Dangerous rm -rf /" },
  { id: "curl-bash", re: /curl .*\| *(sudo )?bash/, sev: "high", msg: "curl|bash pipe (supply-chain risk)" },
  { id: "child-exec", re: /child_process.*exec.*\+|exec\(.*req\.(body|query|params)/, sev: "high", msg: "Command injection risk (exec + user input)" },
  { id: "sql-concat", re: /query\s*\(.*\+.*req\.|SELECT .*\+/, sev: "high", msg: "Possible SQL injection (string concat)" },
  { id: "eval-js", re: /\beval\s*\(/, sev: "medium", msg: "eval() usage" },
  { id: "new-function", re: /\bnew\s+Function\s*\(/, sev: "high", msg: "new Function(string) — code from string, injection risk" },
  { id: "inner-html", re: /\.innerHTML\s*=[^=]/, sev: "medium", msg: "innerHTML assignment — XSS sink, sanitize first" },
  { id: "doc-write", re: /\bdocument\.write\s*\(/, sev: "medium", msg: "document.write — XSS sink" },
  { id: "weak-crypto", re: /createCipher\(|crypto\.createCipher\(|\bmd5\b.*password|password.*\bmd5\b/i, sev: "high", msg: "Weak/broken crypto (createCipher/MD5) — use createCipheriv/bcrypt" },
  { id: "todo-fixme", re: /\b(TODO|FIXME)\b/, sev: "low", msg: "Leftover TODO/FIXME" },
];

const LEAK_FILES = [".env", "id_rsa", "id_ed25519", ".npmrc", ".pypirc", "credentials.json", "secrets.json"];

// File-level suppression, like `// nosec` in real scanners:
// top-of-file comment `deep-era-allow: rule-id, other-rule` skips those rules for THIS file.
// Test fixtures that intentionally contain traps use it — the marker never ships into fixtures.
function allowedRules(txt) {
  const head = txt.split("\n").slice(0, 10).join("\n");
  const m = head.match(/deep-era-allow:\s*([\w-]+(?:\s*,\s*[\w-]+)*)/);
  if (!m) return new Set();
  return new Set(m[1].split(",").map((s) => s.trim()).filter(Boolean));
}

function shannon(s) {
  const freq = {};
  for (const c of s) freq[c] = (freq[c] || 0) + 1;
  let h = 0;
  for (const c in freq) {
    const p = freq[c] / s.length;
    h -= p * Math.log2(p);
  }
  return h;
}

// Entropy trap: random-looking tokens that no regex knows (API keys, session secrets).
// Only inside assignments, skips test/example placeholders.
function entropyScan(txt, file, findings) {
  if (findings.filter((f) => f.file === file && f.rule === "entropy-secret").length >= 3) return;
  const re = /=\s*["']([A-Za-z0-9+/=_-]{20,})["']/g;
  let m, n = 0;
  while ((m = re.exec(txt))) {
    const s = m[1];
    if (/test|example|placeholder|xxx|1234|abcd/i.test(s)) continue;
    if (shannon(s) > 4.5 && n < 3) {
      n++;
      findings.push({ file, rule: "entropy-secret", sev: "medium", msg: `High-entropy string (${s.length} chars) in assignment — possible secret, verify it.` });
    }
  }
}

function securityScan(cwd, files) {
  const findings = [];
  const SELF = new Set(["src/security.js", ".deep-era/RULES.md", "AGENTS.md"]);
  for (const f of files.slice(0, 300)) {
    if (SELF.has(f.file)) continue;
    if (f.file.startsWith("tests/fixtures/")) continue; // intentional demo bugs — out of real scan
    const base = f.file.split("/").pop();
    if (LEAK_FILES.includes(base)) {
      findings.push({ file: f.file, rule: "leak-file", sev: "critical", msg: `Sensitive file committed: ${base} — add to .gitignore` });
      continue;
    }
    if (!/\.(js|ts|tsx|jsx|py|json|env|yml|yaml|toml|example)$/.test(f.file)) continue;
    if (f.size > 200000) continue;
    let txt = "";
    try { txt = fs.readFileSync(path.join(cwd, f.file), "utf8"); } catch { continue; }
    const allowed = allowedRules(txt);
    for (const p of PATTERNS) {
      try {
        if (!allowed.has(p.id) && p.re.test(txt)) findings.push({ file: f.file, rule: p.id, sev: p.sev, msg: p.msg });
      } catch {}
    }
    if (!allowed.has("entropy-secret")) { try { entropyScan(txt, f.file, findings); } catch {} }
  }
  // AST precision for Python in ONE process: real parser beats regex (eval/exec/shell/syntax).
  try {
    const pys = files.filter((f) => /\.py$/.test(f.file) && f.size < 200000 && !f.file.startsWith("tests/fixtures/")).slice(0, 80);
    if (pys.length) {
      const { astScanMany } = require("./pyast");
      const byFile = astScanMany(pys.map((f) => path.join(cwd, f.file)));
      if (byFile === null) {
        findings.push({ file: "(scan)", sev: "low", rule: "ast-unavailable", msg: "No system python — Python files got regex-only scan (degraded mode)." });
      } else {
        for (const f of pys) {
          const hits = (byFile[path.join(cwd, f.file)] || []);
          for (const h of hits.slice(0, 4)) {
            findings.push({ file: f.file, rule: h.rule, sev: h.sev, msg: `${h.msg} (line ${h.line}, AST-verified)` });
          }
        }
      }
    }
  } catch {}
  // .gitignore check — 1-line proof for the human developer
  try {
    const gi = fs.readFileSync(path.join(cwd, ".gitignore"), "utf8");
    if (!/\.env/.test(gi)) findings.push({ file: ".gitignore", rule: "no-env-ignore", sev: "medium", msg: ".env not in .gitignore — leak risk" });
  } catch {
    if (files.some((f) => f.file === ".env")) findings.push({ file: ".env", rule: "no-gitignore", sev: "high", msg: ".env exists but no .gitignore" });
  }
  return findings;
}

module.exports = { securityScan };
