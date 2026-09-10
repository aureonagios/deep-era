const fs = require("fs");
const path = require("path");
const { tag } = require("./cwe");

// SARIF output: GitHub code-scanning / any SARIF viewer shows findings inline on PRs.
// Enterprise trust without enterprise bloat.
function sevToLevel(sev) {
  if (sev === "critical") return "error";
  if (sev === "high") return "error";
  if (sev === "medium") return "warning";
  return "note";
}

function writeSarif(cwd, findings) {
  const rules = [];
  const seen = new Set();
  for (const f of findings) {
    if (!seen.has(f.rule)) {
      seen.add(f.rule);
      const t = tag(f.rule);
      rules.push({
        id: f.rule, name: f.rule, shortDescription: { text: f.msg.slice(0, 120) },
        properties: t ? { tags: ["security", t.cwe, t.owasp] } : { tags: ["quality"] },
      });
    }
  }
  const sarif = {
    version: "2.1.0",
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    runs: [{
      tool: { driver: { name: "deep-era", version: "0.8.0", rules } },
      results: findings.map((f) => ({
        ruleId: f.rule,
        level: sevToLevel(f.sev),
        message: { text: `[${f.sev}] ${f.msg}` },
        locations: [{ physicalLocation: { artifactLocation: { uri: f.file } } }],
      })),
    }],
  };
  const full = path.join(cwd, ".deep-era", "report.sarif");
  fs.writeFileSync(full, JSON.stringify(sarif, null, 2));
  return full;
}

module.exports = { writeSarif };
