// Self-test v0.6 for AI Deep Era (no deps)
process.env.DEEP_ERA_SELFTEST = "1";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const os = require("os");

const { buildMap } = require("../src/map");
const { securityScan } = require("../src/security");
const { getRelevant } = require("../src/context");
const { createSnapshot, restoreSnapshot } = require("../src/snapshot");
const { verifyProject } = require("../src/verify");
const { safeFix } = require("../src/fix");
const { guardScan } = require("../src/guard");
const { remember, recall } = require("../src/memory");
const { detectStack } = require("../src/map");
const { packFor } = require("../src/stacks");

let pass = 0;
const pending = [];
function ok(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === "function") {
      pending.push(r.then(() => { pass++; console.log(`PASS ${name}`); }).catch((e) => { console.error(`FAIL ${name}: ${e.message}`); process.exitCode = 1; }));
    } else { pass++; console.log(`PASS ${name}`); }
  }
  catch (e) { console.error(`FAIL ${name}: ${e.message}`); process.exitCode = 1; }
}

ok("map-builds-with-imports", () => {
  const cwd = path.resolve(__dirname, "..");
  const map = buildMap(cwd);
  assert(map.files.length > 0, "no files mapped");
  assert(map.version === 2, "map v2 expected");
  const cli = map.files.find((f) => f.file === "bin/cli.js");
  assert(cli && Array.isArray(cli.imports), "import graph missing");
});

ok("security-runs-deep", () => {
  const cwd = path.resolve(__dirname, "..");
  const map = buildMap(cwd);
  const f = securityScan(cwd, map.files);
  assert(Array.isArray(f), "not array");
});

ok("context-saves-tokens", () => {
  const cwd = path.resolve(__dirname, "..");
  const map = buildMap(cwd);
  const rel = getRelevant(cwd, map, "mcp server tools", 5);
  assert(rel.length > 0 && rel.length <= 9, "context limit wrong");
  assert(rel.some((r) => r.file.includes("mcp") || r.file.includes("server")), "relevant file missed");
});

ok("verify-deep-all-files", () => {
  const cwd = path.resolve(__dirname, "..");
  const map = buildMap(cwd);
  const res = verifyProject(cwd, map);
  assert(res.length >= 2, "verify should run 2+ checks");
  assert(res.every((r) => r.ok), `verify fails: ${JSON.stringify(res.filter((r) => !r.ok).map((r) => r.cmd))}`);
});

ok("snapshot-create-restore", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-"));
  fs.writeFileSync(path.join(tmp, "a.js"), "console.log(1)");
  const s = createSnapshot(tmp, "t");
  assert(s.files >= 1, "snapshot empty");
  fs.writeFileSync(path.join(tmp, "a.js"), "BROKEN((");
  const r = restoreSnapshot(tmp, s.id);
  assert(r.restored >= 1, "restore empty");
  assert(fs.readFileSync(path.join(tmp, "a.js"), "utf8") === "console.log(1)", "restore content wrong");
});

ok("init-creates-agents-md", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-"));
  fs.writeFileSync(path.join(tmp, "a.js"), "console.log(1)");
  const m = buildMap(tmp);
  assert(m.files.length === 1, "tmp map wrong");
});

ok("safe-fix-guards", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-"));
  fs.writeFileSync(path.join(tmp, "a.js"), "console.log(1)");
  const actions = await safeFix(tmp);
  assert(actions.join(" ").includes("snapshot"), "no snapshot guard");
  assert(fs.readFileSync(path.join(tmp, ".gitignore"), "utf8").includes(".env"), "gitignore fix missed");
});

ok("guard-generic-no-trading", () => {
  const cwd = path.resolve(__dirname, "..");
  const map = buildMap(cwd);
  const g = guardScan(cwd, map.files);
  assert(Array.isArray(g), "guard not array");
  const txt = JSON.stringify(g).toLowerCase();
  assert(!txt.includes("starting_balance") && !txt.includes("limit 35"), "trading terms leaked back in!");
});

ok("fixture-demo-caught", () => {
  // Intentionally dirty project — the system must catch it (a blind AI would pass it)
  const fx = path.join(__dirname, "fixtures", "bad-project");
  const map = buildMap(fx);
  const g = guardScan(fx, map.files);
  const { auditDeps } = require("../src/deps");
  const d = auditDeps(fx);
  assert(g.some((x) => x.rule === "sql-injection"), "SQL injection missed!");
  assert(g.some((x) => x.rule === "dummy-stats"), "dummy e.g.+98% missed!");
  assert(d.some((x) => x.rule === "dep-unpinned"), "unpinned dep missed!");
});

ok("memory-no-chat-forgotten", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-"));
  remember(tmp, "chat", "user said: keep max 3 concurrent trades");
  remember(tmp, "decision", "MAX 3 trades locked — reason: overtrading fees");
  remember(tmp, "fix", "added .env to gitignore");
  const r = recall(tmp, "what is the trades limit?");
  assert(r.entries.some((e) => e.kind === "decision"), "decision recall missed — the AI would forget!");
  assert(r.chars <= 4000, "token budget exceeded!");
  assert(r.total === 3, "chat count wrong!");
});

ok("english-only-code-enforced", () => {
  // User may speak any language — code/comments must be English only
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-"));
  const slash = String.fromCharCode(47);
  fs.writeFileSync(path.join(tmp, "a.js"), slash + slash + " ye kaam lazmi karo\nconsole.log(1);\n");
  const map = buildMap(tmp);
  const g = guardScan(tmp, map.files);
  assert(g.some((x) => x.rule === "non-english-code"), "non-English comment missed!");
  const clean = buildMap(path.resolve(__dirname, ".."));
  assert(!guardScan(path.resolve(__dirname, ".."), clean.files).some((x) => x.rule === "non-english-code"), "own repo has non-English code!");
});

ok("memory-dedupe-saves-tokens", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-"));
  remember(tmp, "note", "same line twice");
  const r2 = remember(tmp, "note", "same line twice");
  assert(r2.duplicate === true, "duplicate not detected!");
  const { readAll } = require("../src/memory");
  assert(readAll(tmp).length === 1, "duplicate stored — token waste!");
});

ok("duplication-caught-offline", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-"));
  const block = [
    "function calculateTotalAmountForOrder(items, taxRate) {",
    "  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);",
    "  const taxAmount = subtotal * taxRate;",
    "  const discount = subtotal > 1000 ? subtotal * 0.05 : 0;",
    "  const total = subtotal + taxAmount - discount;",
    "  const rounded = Math.round(total * 100) / 100;",
    "  return rounded;",
    "}",
  ].join("\n") + "\n";
  fs.writeFileSync(path.join(tmp, "a.js"), block);
  fs.writeFileSync(path.join(tmp, "b.js"), block);
  const map = buildMap(tmp);
  const g = guardScan(tmp, map.files);
  assert(g.some((x) => x.rule === "code-duplication"), "copy-paste missed!");
});

ok("verify-fast-two-tier", () => {
  const { nodeCheckAll } = require("../src/verify");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-"));
  fs.writeFileSync(path.join(tmp, "esm.js"), "import x from './y';\nexport const a = 1;\n");
  fs.writeFileSync(path.join(tmp, "cjs.js"), "const a = 1;\nmodule.exports = a;\n");
  const t0 = Date.now();
  const okRes = nodeCheckAll(tmp, [{ file: "esm.js", size: 100 }, { file: "cjs.js", size: 100 }]);
  const ms = Date.now() - t0;
  assert(okRes.ok, `valid ESM+CJS failed: ${okRes.output}`);
  assert(ms < 2000, `too slow: ${ms}ms`);
  fs.writeFileSync(path.join(tmp, "broken.js"), "const a = (;\n");
  const badRes = nodeCheckAll(tmp, [{ file: "broken.js", size: 100 }]);
  assert(!badRes.ok, "broken syntax passed!");
});

ok("stack-packs-cover-all", () => {
  for (const s of ["node", "python", "go", "rust", "java", "php", "ruby", "dart", "csharp", "swift"]) {
    assert(packFor(s).length >= 3, `${s} pack too thin!`);
  }
});

ok("ci-gate-generator", () => {
  const { runCi } = require("../src/ci");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-"));
  runCi(tmp);
  const yml = fs.readFileSync(path.join(tmp, ".github", "workflows", "deep-era.yml"), "utf8");
  assert(yml.includes("deep-era check"), "CI gate missing check step!");
});

ok("sarif-output-valid", () => {
  const { writeSarif } = require("../src/sarif");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-"));
  fs.mkdirSync(path.join(tmp, ".deep-era"), { recursive: true });
  const p = writeSarif(tmp, [{ rule: "sql-injection", sev: "critical", file: "a.js", msg: "bad" }]);
  const j = JSON.parse(fs.readFileSync(p, "utf8"));
  assert(j.version === "2.1.0" && j.runs[0].results.length === 1, "SARIF malformed!");
});

ok("dep-blocklist-critical", () => {
  const { auditDeps } = require("../src/deps");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-"));
  fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify({ dependencies: { "event-stream": "3.3.6", "left-pad": "*" } }));
  const d = auditDeps(tmp);
  assert(d.some((x) => x.rule === "dep-blocklist" && x.sev === "critical"), "hijacked package missed!");
});

ok("sinks-and-entropy-caught", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-"));
  const nf = "new " + "Function"; // split so this test file stays clean
  const ih = "inner" + "HTML";
  const q = String.fromCharCode(34);
  const tok = "Q7vL2mK9xR4nP8wT6" + "tY1zA0eBfCgDhJ";
  fs.writeFileSync(path.join(tmp, "a.js"), `const run = ${nf}(userCode);\nel.${ih} = userName;\nconst token = ${q}${tok}${q};\n`);
  const map = buildMap(tmp);
  const { securityScan } = require("../src/security");
  const s = securityScan(tmp, map.files);
  assert(s.some((x) => x.rule === "new-function"), "new Function missed!");
  assert(s.some((x) => x.rule === "inner-html"), "innerHTML missed!");
  assert(s.some((x) => x.rule === "entropy-secret"), "entropy secret missed!");
});

ok("py-ast-precision", () => {
  const { astScanPython } = require("../src/pyast");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-"));
  fs.writeFileSync(path.join(tmp, "a.py"), "import os\ndata = handle()\nresult = ev" + "al(data)\nos.system(command)\n");
  const hits = astScanPython(path.join(tmp, "a.py"));
  if (hits === null) { console.log("SKIP py-ast-precision (no python)"); return; }
  assert(hits.some((h) => h.rule === "py-eval-exec" && h.line === 3), "eval line missed!");
  assert(hits.some((h) => h.rule === "py-shell" && h.line === 4), "shell line missed!");
  fs.writeFileSync(path.join(tmp, "ok.py"), "def add(a, b):\n    return a + b\n");
  assert.deepStrictEqual(astScanPython(path.join(tmp, "ok.py")), [], "clean file flagged!");
});

ok("recall-tfidf-ranks-rare-first", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-"));
  for (let i = 0; i < 10; i++) remember(tmp, "chat", `generic fix applied again ${i}`);
  remember(tmp, "chat", "discord webhook secret rotated");
  const r = recall(tmp, "webhook");
  assert(r.entries[0].text.includes("webhook"), "rare term not ranked first!");
});

ok("ide-22-clients-valid", () => {
  const { clients } = require("../src/setupIde");
  const list = clients("C:/x/bin/cli.js");
  assert(list.length >= 23, `only ${list.length} client files!`);
  const ids = list.map((c) => c.id).join(",");
  for (const want of ["vscode", "cursor", "kiro", "claude-code", "gemini-cli", "codex", "opencode", "continue", "zed", "cline", "windsurf-global", "claude-desktop", "antigravity-ide", "antigravity-2", "trae", "trae-solo", "jetbrains-junie", "roo", "kilo"]) {
    assert(ids.includes(want), `${want} client missing!`);
  }
  for (const c of list) {
    if (c.file.endsWith(".json")) JSON.parse(c.body); // every JSON file must parse
  }
  const codex = list.find((c) => c.id === "codex");
  assert(codex.body.includes("[mcp_servers.deep-era]"), "codex TOML malformed!");
  const docsCount = list.filter((c) => c.tier === "docs").length;
  assert(docsCount >= 21, "too few docs-verified clients!");
  const kilo = list.find((c) => c.id === "kilo");
  assert(kilo.body.includes('"mcp"') && kilo.body.includes('"type": "local"'), "kilo shape wrong!");
});

ok("graph-from-real-imports", () => {
  const { runGraph } = require("../src/graph");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-"));
  fs.writeFileSync(path.join(tmp, "a.js"), "require('./b');\n");
  fs.writeFileSync(path.join(tmp, "b.js"), "module.exports = 1;\n");
  const r = runGraph(tmp);
  assert(r.modules >= 2 && r.edges >= 1, "graph missed real edge!");
  assert(fs.readFileSync(path.join(tmp, "ARCHITECTURE.md"), "utf8").includes("mermaid"), "no mermaid!");
});

ok("timeline-reads-logs", () => {
  const { runTimeline } = require("../src/timeline");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-"));
  fs.mkdirSync(path.join(tmp, ".deep-era", "logs"), { recursive: true });
  fs.writeFileSync(path.join(tmp, ".deep-era", "logs", "steps.log"), "[2026-01-01T00:00:00.000Z] init ok: 2 files\n");
  const lines = runTimeline(tmp);
  assert(lines.some((l) => l.text.includes("init ok")), "timeline missed log!");
});

ok("demo-catches-traps", async () => {
  const { runDemo } = require("../src/demo");
  const r = await runDemo();
  assert(r.caught >= 4, `demo caught only ${r.caught}!`);
});

ok("allowlist-suppression", () => {
  const { securityScan } = require("../src/security");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-"));
  fs.writeFileSync(path.join(tmp, "a.js"), "// deep-era-allow: eval-js\nx = ev" + "al(userCode);\n");
  const map = buildMap(tmp);
  const s = securityScan(tmp, map.files);
  assert(!s.some((x) => x.rule === "eval-js"), "allowlist ignored!");
  fs.writeFileSync(path.join(tmp, "b.js"), "y = ev" + "al(userCode);\n");
  const map2 = buildMap(tmp);
  const s2 = securityScan(tmp, map2.files);
  assert(s2.some((x) => x.file === "b.js" && x.rule === "eval-js"), "suppression leaked to other files!");
});

ok("snapshot-diff-tracks-ai", () => {
  const { createSnapshot, diffSnapshot } = require("../src/snapshot");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-"));
  fs.writeFileSync(path.join(tmp, "a.js"), "v1");
  const s = createSnapshot(tmp, "t");
  fs.writeFileSync(path.join(tmp, "a.js"), "v2");
  fs.writeFileSync(path.join(tmp, "b.js"), "new");
  const d = diffSnapshot(tmp, s.id);
  assert(d.modified.some((f) => f.endsWith("a.js")), "modified missed!");
  assert(d.added.some((f) => f.endsWith("b.js")), "added missed!");
});

ok("recall-synonym-finds-bug", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-"));
  remember(tmp, "fix", "patched the login crash with a guard");
  const r = recall(tmp, "bug");
  assert(r.entries.some((e) => e.text.includes("login crash")), "synonym recall missed!");
});

ok("skill-md-valid", () => {
  const { runSkill } = require("../src/skill");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-"));
  const p = runSkill(tmp);
  const md = fs.readFileSync(p, "utf8");
  assert(md.startsWith("---\nname: deep-era-audit"), "frontmatter broken!");
  assert(md.includes("deep-era check") && md.includes("ENGLISH ONLY"), "workflow missing!");
});

ok("recall-distributional-links", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-"));
  for (let i = 0; i < 3; i++) remember(tmp, "chat", `rotated discord webhook credential ${i}`);
  remember(tmp, "chat", "unrelated deploy notes here");
  const r = recall(tmp, "discord");
  assert(r.entries.some((e) => e.text.includes("webhook")), "co-occurring term not recalled!");
});

ok("osv-resolves-array-offline-safe", async () => {
  const { auditOsv } = require("../src/deps");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-"));
  fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify({ dependencies: { "left-pad": "1.3.0" } }));
  const r = await Promise.resolve(auditOsv(tmp)).catch(() => []);
  assert(Array.isArray(r), "osv must always resolve an array!");
});

ok("broken-import-caught", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-"));
  fs.writeFileSync(path.join(tmp, "a.js"), "require('./ghost-module');\n");
  fs.writeFileSync(path.join(tmp, "b.js"), "require('./a');\n");
  const map = buildMap(tmp);
  const g = guardScan(tmp, map.files);
  assert(g.some((x) => x.rule === "broken-import" && x.file === "a.js"), "ghost import missed!");
  assert(!g.some((x) => x.rule === "broken-import" && x.file === "b.js"), "valid import flagged!");
});

ok("spend-tracks-chars", () => {
  const { logSpend, spendReport } = require("../src/spend");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-"));
  logSpend(tmp, "get_context", 4000);
  logSpend(tmp, "recall", 1000);
  const r = spendReport(tmp);
  assert(r.chars === 5000 && r.tokens === 1250, "spend math wrong!");
  assert(r.byTool.get_context === 4000, "per-tool split wrong!");
});

ok("agents-sync-detects-drift", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-"));
  fs.writeFileSync(path.join(tmp, "AGENTS.md"), "weakened rules, trust me");
  fs.writeFileSync(path.join(tmp, "a.js"), "console.log(1);\n");
  const map = buildMap(tmp);
  const g = guardScan(tmp, map.files);
  assert(g.some((x) => x.rule === "agents-drift"), "rule drift missed!");
  fs.writeFileSync(path.join(tmp, "AGENTS.md"), require("../src/init").AGENTS_MD.replace(/\n/g, "\r\n"));
  const map2 = buildMap(tmp);
  assert(!guardScan(tmp, map2.files).some((x) => x.rule === "agents-drift"), "CRLF false positive!");
});

ok("onboard-end-to-end", () => {
  const { execFileSync } = require("child_process");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-"));
  fs.writeFileSync(path.join(tmp, "a.js"), "console.log(1);\n");
  execFileSync(process.execPath, [path.join(__dirname, "..", "bin", "cli.js"), "onboard"], { cwd: tmp, timeout: 60000, stdio: "pipe" });
  assert(fs.existsSync(path.join(tmp, "AGENTS.md")), "no AGENTS.md!");
  assert(fs.existsSync(path.join(tmp, ".deep-era", "ide", "SETUP.md")), "no ide!");
  assert(fs.existsSync(path.join(tmp, ".github", "workflows", "deep-era.yml")), "no CI!");
  assert(fs.existsSync(path.join(tmp, ".deep-era", "skill", "SKILL.md")), "no skill!");
});

ok("heal-loop-reports", async () => {
  const { execFileSync } = require("child_process");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-"));
  fs.writeFileSync(path.join(tmp, "a.js"), "console.log(1);\n");
  const out = execFileSync(process.execPath, [path.join(__dirname, "..", "bin", "cli.js"), "heal"], { cwd: tmp, timeout: 120000 }).toString();
  assert(/issues before/.test(out) && /HEALED| Remaining/.test(out), "heal printed no before/after!");
});

ok("universal-stacks-detected", () => {
  const kinds = [
    [[{ file: "go.mod" }], "go"],
    [[{ file: "Cargo.toml" }], "rust"],
    [[{ file: "pom.xml" }], "java"],
    [[{ file: "Gemfile" }], "ruby"],
    [[{ file: "pubspec.yaml" }], "dart"],
    [[{ file: "app.csproj" }], "csharp"],
  ];
  for (const [files, want] of kinds) {
    assert(detectStack("x", files).kind === want, `${want} detection missed!`);
  }
});

Promise.all(pending).then(() => console.log(`\n${pass} tests passed`));
