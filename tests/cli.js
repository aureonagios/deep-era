// CLI integration tests — every command runs for real in a sandbox.
// This suite would have caught the snapshot-label bug before any human did.
process.env.DEEP_ERA_SELFTEST = "1";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");

const CLI = path.join(__dirname, "..", "bin", "cli.js");
const { ok, finish, pending } = require("./lib/report")("cli");

function sandbox(files) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-cli-"));
  for (const [name, content] of Object.entries(files || { "a.js": "console.log(1);\n" })) {
    fs.mkdirSync(path.join(tmp, path.dirname(name)), { recursive: true });
    fs.writeFileSync(path.join(tmp, name), content);
  }
  return tmp;
}
function cli(tmp, args) {
  return execFileSync(process.execPath, [CLI, ...args], { cwd: tmp, timeout: 120000 }).toString();
}

ok("cli-init-check-rules-costs", () => {
  const tmp = sandbox();
  assert(cli(tmp, ["init"]).includes("init ok"), "init broke");
  assert(cli(tmp, ["check"]).includes("RESULT: PASS"), "check broke");
  assert(cli(tmp, ["rules"]).includes("Stack pack"), "rules broke");
  assert(cli(tmp, ["costs"]).includes("AI spend"), "costs broke");
});

ok("cli-remember-recall-roundtrip", () => {
  const tmp = sandbox();
  cli(tmp, ["init"]);
  assert(cli(tmp, ["remember", "decision", "ship on friday"]).includes("remembered"), "remember broke");
  assert(cli(tmp, ["recall", "ship"]).includes("friday"), "recall broke");
});

ok("cli-snapshot-diff-restore", () => {
  const tmp = sandbox();
  cli(tmp, ["init"]);
  const out = cli(tmp, ["snapshot", "wow"]);
  assert(out.includes("-wow"), `label lost: ${out}`); // regression: label used to become dirname
  assert(out.includes("(2 files)"), `wrong count: ${out}`); // a.js + AGENTS.md from init
  const id = out.match(/snapshot (\S+)/)[1];
  assert(cli(tmp, ["snapshots"]).includes(id), "snapshots list broke");
  fs.writeFileSync(path.join(tmp, "a.js"), "console.log(2);\n");
  assert(cli(tmp, ["diff", id]).includes("~"), "diff missed modification");
  cli(tmp, ["restore", id]);
  assert(fs.readFileSync(path.join(tmp, "a.js"), "utf8").includes("console.log(1)"), "restore broke");
});

ok("cli-graph-timeline-skill-ci", () => {
  const tmp = sandbox({ "a.js": "require('./b');\n", "b.js": "module.exports = 1;\n" });
  cli(tmp, ["init"]);
  cli(tmp, ["graph"]);
  assert(fs.existsSync(path.join(tmp, "ARCHITECTURE.md")), "no graph file");
  assert(cli(tmp, ["timeline"]).includes("timeline"), "timeline broke");
  cli(tmp, ["skill"]);
  assert(fs.existsSync(path.join(tmp, ".deep-era", "skill", "SKILL.md")), "no skill");
  cli(tmp, ["ci"]);
  assert(fs.existsSync(path.join(tmp, ".github", "workflows", "deep-era.yml")), "no CI file");
});

ok("cli-perf-smoke", () => {
  const tmp = sandbox();
  const out = cli(tmp, ["perf"]);
  assert(out.includes("map") && out.includes("ms"), "perf broke");
});

ok("cli-fix-doctor-sarif", () => {
  const tmp = sandbox();
  cli(tmp, ["init"]);
  assert(cli(tmp, ["fix"]).includes("fix done"), "fix broke");
  cli(tmp, ["doctor", "--sarif"]);
  assert(fs.existsSync(path.join(tmp, ".deep-era", "report.sarif")), "no sarif");
});

ok("cli-serve-fixture-probe", () => {
  const { execFileSync } = require("child_process");
  const app = path.join(__dirname, "fixtures", "serve-app");
  const out = execFileSync(process.execPath, [CLI, "serve"], { cwd: app, timeout: 60000 }).toString();
  assert(out.includes("200"), `serve probe failed: ${out.slice(0, 300)}`);
});

ok("cli-watch-detects-change", async () => {
  const tmp = sandbox();
  const child = require("child_process").spawn(process.execPath, [CLI, "watch"], { cwd: tmp });
  let out = "";
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (c) => { out += c; });
  await new Promise((r) => setTimeout(r, 1500));
  fs.writeFileSync(path.join(tmp, "a.js"), "console.log(2);\n");
  await new Promise((r) => setTimeout(r, 4000));
  child.kill();
  assert(out.includes("watching") && out.includes("change: a.js"), `watch missed change: ${out.slice(0, 200)}`);
});

ok("cli-global-machine-setup", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-home-"));
  // Pre-existing cursor config must survive the merge (with backup)
  fs.mkdirSync(path.join(home, ".cursor"), { recursive: true });
  fs.writeFileSync(path.join(home, ".cursor", "mcp.json"), JSON.stringify({ mcpServers: { other: { command: "x" } } }));
  const { runGlobal } = require("../src/global");
  const res = runGlobal(home, "deep-era");
  const byId = Object.fromEntries(res.map((r) => [r.id, r]));
  assert(fs.existsSync(path.join(home, ".cursor", "mcp.json.deep-era.bak")), "no backup!");
  const merged = JSON.parse(fs.readFileSync(path.join(home, ".cursor", "mcp.json"), "utf8"));
  assert(merged.mcpServers.other && merged.mcpServers["deep-era"], "merge broke existing!");
  assert(fs.existsSync(path.join(home, ".gemini", "skills", "deep-era-audit", "SKILL.md")), "no global skill!");
  assert(byId["windsurf"] && byId["kiro"] && byId["junie"], "missing clients!");
});

ok("cli-review-scoped-diff", () => {
  const { execFileSync } = require("child_process");
  const tmp = sandbox();
  execFileSync("git", ["init", "-b", "main"], { cwd: tmp });
  execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "add", "-A"], { cwd: tmp });
  execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-m", "base"], { cwd: tmp });
  fs.writeFileSync(path.join(tmp, "evil.js"), "const q = " + "db.qu" + "ery('x' + req.id);\n");
  let out = "";
  try {
    out = cli(tmp, ["review"]);
  } catch (e) {
    out = (e.stdout || "").toString(); // FAIL exits 1 by design — output still asserted
  }
  assert(out.includes("evil.js") && out.includes("FAIL"), `review missed planted bug: ${out.slice(0, 300)}`);
});

ok("cli-search-ranked", () => {
  const tmp = sandbox({ "auth.js": "function loginWithToken(user) { return token; }\n", "unrelated.js": "console.log('hi');\n" });
  cli(tmp, ["init"]);
  const out = cli(tmp, ["search", "login token"]);
  assert(out.includes("auth.js") && out.indexOf("auth.js") < out.indexOf("unrelated.js"), `ranking wrong: ${out.slice(0, 300)}`);
});

ok("cli-skill-pack-six", () => {
  const tmp = sandbox();
  cli(tmp, ["skill"]);
  for (const n of ["deep-era-audit", "deep-era-fix", "deep-era-review", "deep-era-research", "deep-era-serve", "deep-era-fleet", "deep-era-browse"]) {
    assert(fs.existsSync(path.join(tmp, ".deep-era", "skills", n, "SKILL.md")), `${n} missing!`);
  }
});

ok("cli-doctor-json", () => {
  const tmp = sandbox();
  cli(tmp, ["init"]);
  const j = JSON.parse(cli(tmp, ["doctor", "--json"]).split("\n").filter((l) => l.startsWith("{")).join(""));
  assert(j.result === "PASS" && typeof j.failed === "number", "doctor json wrong");
});

ok("cli-sarif-has-cwe-tags", () => {
  const tmp = sandbox({ "a.js": "const q = " + "db.qu" + "ery('x' + req.id);\n" });
  cli(tmp, ["init"]);
  try {
    cli(tmp, ["doctor", "--sarif"]);
  } catch (e) {
    // doctor exits 1 when findings exist — by design; sarif is still written
  }
  const j = JSON.parse(fs.readFileSync(path.join(tmp, ".deep-era", "report.sarif"), "utf8"));
  const rules = j.runs[0].tool.driver.rules;
  const sql = rules.find((r) => r.id === "sql-concat");
  assert(sql && JSON.stringify(sql.properties.tags).includes("CWE-89"), "CWE tags missing in SARIF!");
});

ok("cli-update-offline-safe", () => {
  const { execFileSync } = require("child_process");
  const out = execFileSync(process.execPath, [CLI, "update"], { timeout: 30000 }).toString();
  assert(out.includes("deep-era") && /up to date|update available|offline|unreachable|unreadable/i.test(out), `update behaved badly: ${out.slice(0, 200)}`);
});

ok("cli-sbom-cyclonedx", () => {
  const tmp = sandbox({ "package.json": JSON.stringify({ name: "x", dependencies: { leftpad: "^1.0.0" } }), "requirements.txt": "requests==2.31.0\nunpinned\n" });
  cli(tmp, ["sbom"]);
  const j = JSON.parse(fs.readFileSync(path.join(tmp, ".deep-era", "sbom.json"), "utf8"));
  assert(j.bomFormat === "CycloneDX" && j.specVersion === "1.5", "not CycloneDX!");
  assert(j.components.some((c) => c["bom-ref"] === "pypi:requests@2.31.0"), "pypi missed!");
  assert(j.metadata.comment.includes("Direct deps"), "honesty note missing!");
});

ok("cli-memory-stats", () => {
  const tmp = sandbox();
  cli(tmp, ["remember", "decision", "ship on friday"]);
  const out = cli(tmp, ["memory"]);
  assert(out.includes("decision: 1") && out.includes("friday"), `memory stats wrong: ${out.slice(0, 200)}`);
});

ok("cli-license-offline-safe", async () => {
  const { auditLicenses } = require("../src/deps");
  const tmp = sandbox({ "package.json": JSON.stringify({ dependencies: { "leftpad": "1.3.0" } }) });
  const r = await auditLicenses(tmp); // network or silent skip — must never throw
  assert(Array.isArray(r), "licenses must resolve array!");
});

ok("cli-context-shows-files", () => {
  const tmp = sandbox({ "auth.js": "function login(user) { return 1; }\n" });
  cli(tmp, ["init"]);
  const out = cli(tmp, ["context", "login"]);
  assert(out.includes("auth.js"), `context missed: ${out.slice(0, 200)}`);
});

ok("cli-demo-verdict", () => {
  const { execFileSync } = require("child_process");
  const out = execFileSync(process.execPath, [CLI, "demo"], { timeout: 120000 }).toString();
  assert(out.includes("CAUGHT") && out.includes("dep-blocklist"), "demo did not catch!");
});

ok("cli-browser-bridge", () => {
  const tmp = sandbox();
  cli(tmp, ["browser"]);
  const j = JSON.parse(fs.readFileSync(path.join(tmp, ".deep-era", "browser", "playwright.json"), "utf8"));
  assert(j.mcpServers.playwright.args.includes("@playwright/mcp@latest"), "playwright entry wrong!");
  assert(fs.existsSync(path.join(tmp, ".deep-era", "browser", "BROWSER.md")), "no BROWSER.md!");
});

ok("cli-hook-installs-gate", () => {
  const { execFileSync } = require("child_process");
  const tmp = sandbox();
  execFileSync("git", ["init", "-b", "main"], { cwd: tmp });
  cli(tmp, ["hook"]);
  const hook = fs.readFileSync(path.join(tmp, ".git", "hooks", "pre-commit"), "utf8");
  assert(hook.includes("deep-era") && hook.includes("check"), "hook gate missing!");
  cli(tmp, ["hook"]); // idempotent re-run
});

ok("cli-graph-full-and-for", () => {
  const tmp = sandbox({ "a.js": "require('./b');\n", "b.js": "require('./c');\n", "c.js": "module.exports = 1;\n" });
  cli(tmp, ["init"]);
  const full = cli(tmp, ["graph", "--full"]);
  assert(full.includes("Full graph") || full.includes("modules"), "full graph broke");
  const ego = cli(tmp, ["graph", "--for", "b.js"]);
  assert(ego.includes("Ego-graph") || ego.includes("modules"), "ego graph broke");
  const miss = (() => { try { cli(tmp, ["graph", "--for", "nope.js"]); return ""; } catch (e) { return (e.stdout || "").toString(); } })();
  assert(miss.includes("no such module"), "missing module not honest!");
});

ok("cli-timeline-json", () => {
  const tmp = sandbox();
  cli(tmp, ["init"]);
  const raw = cli(tmp, ["timeline", "--json"]).split("\n").filter((l) => l.startsWith("[{") || l === "[]").join("");
  const j = JSON.parse(raw || "[]");
  assert(Array.isArray(j), "timeline json not array!");
});

ok("cli-memory-export-import", () => {
  const a = sandbox();
  cli(a, ["remember", "decision", "portable lesson one"]);
  const exp = path.join(a, "mem.jsonl");
  assert(cli(a, ["memory", "export", exp]).includes("exported"), "export broke");
  const b = sandbox();
  const out = cli(b, ["memory", "import", exp]);
  assert(out.includes("1 new"), `import wrong: ${out}`);
  assert(cli(b, ["memory", "import", exp]).includes("1 duplicates"), "dedupe broke!");
});

ok("cli-installers-and-llms", () => {
  const root = path.join(__dirname, "..");
  const ps1 = fs.readFileSync(path.join(root, "install.ps1"), "utf8");
  const sh = fs.readFileSync(path.join(root, "install.sh"), "utf8");
  assert(ps1.includes("npm i -g github:aureonagios/deep-era") && ps1.includes("deep-era global"), "ps1 incomplete!");
  assert(sh.includes("npm i -g github:aureonagios/deep-era") && sh.includes("deep-era global"), "sh incomplete!");
  const llms = fs.readFileSync(path.join(root, "llms.txt"), "utf8");
  assert(llms.includes("recall") && llms.includes("verify_work") && llms.includes("ENGLISH ONLY"), "llms.txt shallow!");
});

ok("cli-check-json", () => {
  const tmp = sandbox();
  cli(tmp, ["init"]);
  const j = JSON.parse(cli(tmp, ["check", "--json"]));
  assert(j.result === "PASS" && typeof j.verifyPass === "number", "json shape wrong");
});

ok("cli-suite-reported", async () => {
  await finish();
  const { readReport } = require("./lib/report");
  const r = readReport(process.cwd());
  assert(r.suites.cli && r.suites.cli.fail === 0, "cli suite missing/failed in report!");
});
