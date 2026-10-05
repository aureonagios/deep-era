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
        id: f.rule, name: f.rule,
        shortDescription: { text: (f.msg || f.rule).slice(0, 120) },
        fullDescription: { text: (f.msg || f.rule).slice(0, 400) },
        properties: t ? { tags: ["security", t.cwe, t.owasp] } : { tags: ["quality"] },
        defaultConfiguration: { level: sevToLevel(f.sev) },
      });
    }
  }
  const version = (() => {
    try { return require("../package.json").version; } catch { return "0.0.0"; }
  })();
  const sarif = {
    version: "2.1.0",
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    runs: [{
      tool: { driver: { name: "deep-era", version, informationUri: "https://github.com/aureonagios/deep-era", rules } },
      results: findings.map((f) => ({
        ruleId: f.rule,
        level: sevToLevel(f.sev),
        message: { text: `[${f.sev}] ${f.msg}` },
        locations: [{
          // A region is what makes GitHub render the warning ON THE LINE in the diff.
          // Without it the finding only appears in a list, and list items get ignored.
          physicalLocation: {
            artifactLocation: { uri: f.file },
            ...(f.line ? { region: { startLine: f.line } } : {}),
          },
        }],
      })),
    }],
  };
  const full = path.join(cwd, ".deep-era", "report.sarif");
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, JSON.stringify(sarif, null, 2));
  return full;
}

module.exports = { writeSarif };
