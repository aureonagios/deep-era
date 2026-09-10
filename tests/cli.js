// CLI integration tests — every command runs for real in a sandbox.
// This suite would have caught the snapshot-label bug before any human did.
process.env.DEEP_ERA_SELFTEST = "1";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");

const CLI = path.join(__dirname, "..", "bin", "cli.js");
let pass = 0;
function ok(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === "function") {
      pending.push(r.then(() => { pass++; console.log(`PASS ${name}`); }).catch((e) => { console.error(`FAIL ${name}: ${e.message}`); process.exitCode = 1; }));
    } else { pass++; console.log(`PASS ${name}`); }
  } catch (e) { console.error(`FAIL ${name}: ${e.message}`); process.exitCode = 1; }
}
const pending = [];

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

ok("cli-skill-pack-three", () => {
  const tmp = sandbox();
  cli(tmp, ["skill"]);
  for (const n of ["deep-era-audit", "deep-era-fix", "deep-era-review", "deep-era-research", "deep-era-serve"]) {
    assert(fs.existsSync(path.join(tmp, ".deep-era", "skills", n, "SKILL.md")), `${n} missing!`);
  }
});

ok("cli-doctor-json", () => {
  const tmp = sandbox();
  cli(tmp, ["init"]);
  const j = JSON.parse(cli(tmp, ["doctor", "--json"]).split("\n").filter((l) => l.startsWith("{")).join(""));
  assert(j.result === "PASS" && typeof j.failed === "number", "doctor json wrong");
});

ok("cli-check-json", () => {
  const tmp = sandbox();
  cli(tmp, ["init"]);
  const j = JSON.parse(cli(tmp, ["check", "--json"]));
  assert(j.result === "PASS" && typeof j.verifyPass === "number", "json shape wrong");
});

Promise.all(pending).then(() => console.log(`\n${pass} CLI tests passed`));
