const fs = require("fs");
const path = require("path");

// Generates a CI gate: every PR runs `deep-era check` and fails on critical/high.
// Works on GitHub Actions; the same command runs locally — no CI-only surprises.
const WORKFLOW = `name: deep-era-gate
on: [push, pull_request]
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm install -g deep-era
      - run: deep-era check
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
