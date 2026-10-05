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

module.exports = {
  SECRET_PATTERNS,
  shannonEntropy,
  scanFileSecrets,
  scanDirectorySecrets
};
