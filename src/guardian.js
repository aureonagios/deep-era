// Zero-dependency Secret Guardian & High-Entropy Scanner (CommonJS, Node >= 18)
// RULE: user may speak any language. All code, comments, logs and replies: ENGLISH ONLY.
const fs = require("fs");
const path = require("path");

const SECRET_PATTERNS = [
  { rule: "aws-key", name: "AWS Access Key", regex: /AKIA[0-9A-Z]{16}/g, sev: "critical" },
  { rule: "github-pat", name: "GitHub Personal Access Token", regex: /ghp_[0-9a-zA-Z]{36}/g, sev: "critical" },
  { rule: "openai-api-key", name: "OpenAI API Key", regex: /sk-[a-zA-Z0-9]{20,48}/g, sev: "critical" },
  { rule: "google-api-key", name: "Google API Key", regex: /AIza[0-9A-Za-z\\-_]{35}/g, sev: "critical" },
  { rule: "stripe-secret", name: "Stripe Secret Key", regex: /sk_live_[0-9a-zA-Z]{24}/g, sev: "critical" },
  { rule: "slack-token", name: "Slack Token", regex: /xox[baprs]-[0-9a-zA-Z]{10,48}/g, sev: "high" },
  { rule: "private-key", name: "Private RSA/EC/SSH Key", regex: /-----BEGIN\s+[A-Z\s]+PRIVATE\s+KEY-----/g, sev: "critical" },
  { rule: "generic-secret-assign", name: "Hardcoded Credential Assignment", regex: /(api_key|apiKey|secret_key|secretKey|password|auth_token)\s*[:=]\s*["'][A-Za-z0-9_\-+/]{16,}["']/gi, sev: "high" }
];

// Placeholder values are documentation, not leaks. SECRET_KEY="your-secret-key-here"
// in a README or a scaffold is the opposite of a leak — but a scanner that flags it
// trains everyone to ignore the scanner, which is how the real key in the next file
// gets missed. So obvious placeholders are skipped, loudly documented here, and pinned
// by tests in both directions.
//
// Conservative by design: only values that cannot possibly be real credentials are
// skipped (words like your-/example/changeme, bracket/template markers, star runs).
// A weak-but-real value like password="test123456" is still flagged — doubting a real
// secret is worse than flagging a weak one.
const PLACEHOLDER_RE = /your[-_]?|example|sample|placeholder|changeme|changethis|xxx+|\*\*\*|[<>]|\$\{|TODO|FIXME|dummy|fake|redacted|replace[-_ ]?(me|this|with)|insert[-_ ]|your[-_ ]key|here\b|my[-_]?domain|localhost/i;

function isPlaceholder(snippet) {
  return PLACEHOLDER_RE.test(snippet);
}

function shannonEntropy(str) {
  if (!str || str.length === 0) return 0;
  const freqs = {};
  for (const c of str) freqs[c] = (freqs[c] || 0) + 1;
  let ent = 0;
  for (const c in freqs) {
    const p = freqs[c] / str.length;
    ent -= p * Math.log2(p);
  }
  return ent;
}

function scanFileSecrets(filePath, relPath = filePath) {
  const findings = [];
  try {
    const stat = fs.statSync(filePath);
    if (stat.size > 2 * 1024 * 1024) return findings; // skip >2MB files
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const p of SECRET_PATTERNS) {
        p.regex.lastIndex = 0;
        let match;
        while ((match = p.regex.exec(line)) !== null) {
          if (isPlaceholder(match[0])) continue; // documented example, not a leak
          findings.push({
            file: relPath.replace(/\\/g, "/"),
            line: i + 1,
            col: match.index + 1,
            rule: p.rule,
            name: p.name,
            sev: p.sev,
            snippet: line.trim().slice(0, 100)
          });
        }
      }
    }
  } catch {}
  return findings;
}

function scanDirectorySecrets(dir = process.cwd(), excludePatterns = ["node_modules", ".git", ".deep-era", "package-lock.json", "yarn.lock"]) {
  const results = [];
  function walk(current) {
    let entries;
    try { entries = fs.readdirSync(current, { withFileTypes: true }); } catch { return; }
    for (const ent of entries) {
      const full = path.join(current, ent.name);
      const rel = path.relative(dir, full);
      if (excludePatterns.some((p) => rel.includes(p) || ent.name === p)) continue;
      if (ent.isDirectory()) {
        walk(full);
      } else if (ent.isFile()) {
        const ext = path.extname(ent.name).toLowerCase();
        if ([".js", ".ts", ".jsx", ".tsx", ".py", ".json", ".env", ".yaml", ".yml", ".md", ".sh", ".toml"].includes(ext) || ent.name.startsWith(".env")) {
          const fileFindings = scanFileSecrets(full, rel);
          results.push(...fileFindings);
        }
      }
    }
  }
  walk(dir);
  return results;
}

// Secret families shared with security.js. Both engines detect the same leaks with
// slightly different rule names (github-pat vs github-token), so merging raw lists
// would report one leaked key twice. The family key collapses those; engine-specific
// rules (google-api-key, stripe-secret, slack-token, entropy-secret) pass through.
function secretFamily(rule) {
  const r = String(rule || "").toLowerCase();
  if (/aws/.test(r)) return "aws";
  if (/github|ghp/.test(r)) return "github";
  if (/openai|^sk-|api[-_]?key/.test(r)) return "openai";
  if (/private[-_]?key/.test(r)) return "privatekey";
  if (/secret|passwd|password|token|credential/.test(r)) return "secret";
  return "other:" + r;
}

// Merge guardian findings into an existing finding list. Same file+line+family means
// both engines saw the same leak — keep the HIGHEST severity report, not the first.
// (First-wins dropped a critical stripe-secret once because a medium entropy note sat
// on the same line. The specific, severe report must survive; the vague one goes.)
const SEV_RANK = { critical: 4, high: 3, medium: 2, low: 1 };
function mergeSecretFindings(base, extra) {
  const best = new Map();
  for (const f of [...(base || []), ...(extra || [])]) {
    const key = `${f.file}:${f.line || 0}:${secretFamily(f.rule)}`;
    const cur = best.get(key);
    if (!cur || (SEV_RANK[f.sev] || 0) > (SEV_RANK[cur.sev] || 0)) best.set(key, f);
  }
  // Stable order: base order first, then extras in scan order.
  const order = new Map();
  [...(base || []), ...(extra || [])].forEach((f, i) => {
    const key = `${f.file}:${f.line || 0}:${secretFamily(f.rule)}`;
    if (!order.has(key)) order.set(key, i);
  });
  return [...best.entries()].sort((a, b) => order.get(a[0]) - order.get(b[0])).map(([, f]) => f);
}

// Normalized scan for pipeline use (doctor/review/MCP): same findings as
// scanDirectorySecrets, shaped like every other engine ({file, line, rule, sev, msg}).
// Skips tests/fixtures like security.js does — fixtures hold deliberately broken input
// for the scanners to practice on, and auditing them as real code would cry wolf.
function scanSecretsFor(cwd) {
  return scanDirectorySecrets(cwd)
    .filter((f) => !f.file.startsWith("tests/fixtures/"))
    .map((f) => ({
    file: f.file,
    line: f.line,
    col: f.col,
    rule: f.rule,
    sev: f.sev,
    msg: `${f.name} — ${String(f.snippet || "").slice(0, 80)}`
  }));
}

module.exports = {
  SECRET_PATTERNS,
  shannonEntropy,
  isPlaceholder,
  secretFamily,
  mergeSecretFindings,
  scanSecretsFor,
  scanFileSecrets,
  scanDirectorySecrets
};
