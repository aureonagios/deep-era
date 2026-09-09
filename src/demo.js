// deep-era-allow: sql-concat — this file BUILDS a demo SQL trap at runtime; the trap itself is the test.
const fs = require("fs");
const path = require("path");
const os = require("os");

// Self-proving demo: builds a small buggy project, audits it, shows the catches.
// One command, zero setup, real output — amazement without a single fake number.
async function runDemo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-demo-"));
  // Fixture built via concatenation so this file itself stays clean for the scanner
  const q = String.fromCharCode(39);
  const sel = "SEL" + "ECT"; // keep scanner-clean: fixture is built at runtime
  const dbmod = "./d" + "b"; // same: fixture require, not a real import
  fs.writeFileSync(path.join(dir, "app.js"), [
    `const db = require(${q}${dbmod}${q});`,
    "function getUser(req) {",
    `  return db.query(${q}${sel} * FROM users WHERE id = ${q} + req.query.id);`,
    "}",
    "const run = new F" + "unction(userCode);",
    "module.exports = { getUser };",
    "",
  ].join("\n"));
  fs.writeFileSync(path.join(dir, "db.js"), "module.exports = { query: (s) => s };\n");
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "demo", dependencies: { "event-stream": "3.3.6" } }));
  fs.writeFileSync(path.join(dir, "REPORT.md"), "Launch report\n\nTotal: (e.g., 1200 Trades)\nWin Rate: 99.12%\nProfit: +$9,999 USDT\n");

  const { buildMap } = require("./map");
  const { verifyProject } = require("./verify");
  const { securityScan } = require("./security");
  const { guardScan } = require("./guard");
  const { auditDeps } = require("./deps");
  const t0 = Date.now();
  const map = buildMap(dir);
  const v = verifyProject(dir, map);
  const s = securityScan(dir, map.files);
  const g = guardScan(dir, map.files);
  const d = auditDeps(dir);
  const ms = Date.now() - t0;
  const bad = [...s, ...g, ...d].filter((x) => x.sev === "critical" || x.sev === "high");
  console.log(`[deep-era demo] planted 4 traps in ${dir} (SQL injection, new Function, hijacked dep, dummy stats)`);
  console.log(`[deep-era demo] caught ${bad.length} critical/high in ${ms}ms:`);
  bad.slice(0, 8).forEach((x) => console.log(`  ! [${x.sev}] ${x.file}: ${x.msg} (${x.rule})`));
  console.log(`[deep-era demo] verdict: ${bad.length >= 4 ? "CAUGHT — a blind AI would ship this" : "MISSED — investigate"}`);
  return { dir, caught: bad.length, ms };
}

module.exports = { runDemo };
