const fs = require("fs");
const path = require("path");

// Generates a CI gate: every PR runs `deep-era check` and fails on critical/high.
//
// Two decisions worth stating, both learned the hard way:
//
//   1. SARIF output is uploaded to GitHub code scanning. Without it the findings live
//      only in a log line, nobody clicks through a CI log, and the gate becomes
//      decoration. With it the warnings appear inline on the diff — which is where a
//      developer is already looking.
//   2. `continue-on-error` is deliberately absent on the audit step. A gate that
//      cannot fail the build is not a gate.
const WORKFLOW = `name: deep-era-gate
on: [push, pull_request]
permissions:
  contents: read
  security-events: write
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - name: Install deep-era
        run: npm install -g deep-era
      - name: Audit (fails on critical/high)
        run: deep-era check
      - name: Full report + SARIF
        if: always()
        run: deep-era doctor --sarif
      - name: Upload findings to code scanning
        if: always()
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: .deep-era/report.sarif
          category: deep-era
`;

function runCi(cwd) {
  const full = path.join(cwd, ".github", "workflows", "deep-era.yml");
  fs.mkdirSync(path.dirname(full), { recursive: true });
  if (!fs.existsSync(full)) {
    fs.writeFileSync(full, WORKFLOW);
    console.log(`[deep-era] CI gate created: .github/workflows/deep-era.yml`);
  } else {
    console.log(`[deep-era] CI gate already exists (left untouched)`);
  }
  console.log(`Every push/PR will now run: deep-era check`);
}

module.exports = { runCi };
