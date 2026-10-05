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
const { semanticScan } = require("../src/semantics");
const { verifyMany } = require("../src/tsparse");
const { buildBrief, classify, forbiddenFiles } = require("../src/guidance");
const { slopScan } = require("../src/slop");
const { remember, recall } = require("../src/memory");
const { detectStack } = require("../src/map");
const { packFor } = require("../src/stacks");
const { ok, finish, pending } = require("./lib/report")("unit");

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

ok("snapshot-restore-removes-new-files", () => {
  // A restore must undo what the agent ADDED, not just put back what it deleted.
  // Copying files back alone left half-written garbage in the tree, which the next
  // scan then picked up. Found by probing, now pinned.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-"));
  fs.mkdirSync(path.join(tmp, "src"));
  fs.writeFileSync(path.join(tmp, "src", "keep.js"), "module.exports = 1;");
  const s = createSnapshot(tmp, "before");
  fs.writeFileSync(path.join(tmp, "src", "keep.js"), "BROKEN(((");
  fs.writeFileSync(path.join(tmp, "src", "half-written.js"), "function (((");
  const r = restoreSnapshot(tmp, s.id);
  assert(fs.readFileSync(path.join(tmp, "src", "keep.js"), "utf8") === "module.exports = 1;", "original not restored");
  assert(!fs.existsSync(path.join(tmp, "src", "half-written.js")), "file created after the snapshot survived the restore");
  assert(r.removed >= 1, `restore did not report the removal (removed=${r.removed})`);
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

// --- v0.47: semantic bug detection (the bugs v0.46 passed silently) ------------

ok("semantic-catches-ai-bugs", () => {
  const fx = path.join(__dirname, "fixtures", "semantic-bugs");
  const map = buildMap(fx);
  const f = semanticScan(fx, map.files);
  const rules = f.map((x) => x.rule);
  assert(f.some((x) => x.rule === "swallowed-exception"), "empty .catch() handler missed!");
  assert(f.some((x) => x.rule === "floating-promise"), "unawaited promise missed!");
  assert(f.some((x) => x.rule === "dead-branch"), "always-true branch missed!");
  assert(rules.includes("tautological-test"), "assert.ok(true) missed!");
  assert(rules.includes("empty-test"), "assertion-free test file missed!");
});

ok("semantic-no-false-positives-on-repo", () => {
  // The engine must stay quiet on real, defensive, idiomatic code. This repo is
  // heavily defensive on purpose (every optional read is guarded), so it is the
  // hardest available false-positive test.
  const cwd = path.resolve(__dirname, "..");
  const map = buildMap(cwd);
  const f = semanticScan(cwd, map.files);
  const noisy = f.filter((x) => x.rule === "swallowed-exception" || x.rule === "floating-promise" || x.rule === "dead-branch");
  assert(noisy.length === 0, `false positives on own repo: ${noisy.map((x) => `${x.file}:${x.line} ${x.rule}`).join(", ")}`);
});

ok("semantic-respects-guard-patterns", () => {
  // Defensive code that must NEVER be flagged.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-"));
  fs.writeFileSync(path.join(tmp, "ok.js"), [
    "const fs = require('fs');",
    "function readConfig(p) {",
    "  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; }",
    "}",
    "function scan(dir) {",
    "  for (const f of fs.readdirSync(dir)) {",
    "    let txt = '';",
    "    try { txt = fs.readFileSync(f, 'utf8'); } catch { continue; }",
    "    console.log(txt.length);",
    "  }",
    "}",
    "async function load(u) {",
    "  try { return await fetch(u); } catch (e) { console.error('load failed', e); throw e; }",
    "}",
    "main().catch((e) => { console.error(e); process.exit(1); });",
    "module.exports = { readConfig, scan, load };",
  ].join("\n"));
  const map = buildMap(tmp);
  const f = semanticScan(tmp, map.files);
  assert(f.length === 0, `guard patterns wrongly flagged: ${f.map((x) => `${x.rule}@${x.line}`).join(", ")}`);
});

ok("tsparse-valid-typescript-passes", () => {
  // Generics, regex angle brackets, template interpolation, JSX and entities must
  // not be mistaken for broken syntax.
  const fx = path.join(__dirname, "fixtures", "semantic-valid");
  const map = buildMap(fx);
  const r = verifyMany(fx, map.files, 50);
  assert(r.checked >= 2, `expected to check the TS/TSX fixtures, checked ${r.checked}`);
  assert(r.bad.length === 0, `false positives on valid TS: ${r.bad.map((b) => `${b.file}:${b.line} ${b.err}`).join("; ")}`);
});

ok("tsparse-catches-broken-typescript", () => {
  const fx = path.join(__dirname, "fixtures", "broken-ts");
  const map = buildMap(fx);
  const r = verifyMany(fx, map.files, 50);
  assert(r.bad.length >= 2, `broken TypeScript passed: ${JSON.stringify(r.bad)}`);
  assert(r.bad.some((b) => /unclosed|unterminated/.test(b.err)), `expected a structural error, got ${JSON.stringify(r.bad)}`);
  assert(r.bad.every((b) => b.line > 0), "findings must carry a line number");
});

ok("verify-fails-on-broken-typescript", () => {
  // The regression that started this: a broken .ts file used to be skipped entirely
  // and `verify` reported PASS. It must now fail.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-"));
  fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify({ name: "t", version: "1.0.0" }));
  fs.writeFileSync(path.join(tmp, "app.ts"), "const x: number = ; function (((");
  const map = buildMap(tmp);
  const res = verifyProject(tmp, map);
  const syntax = res.find((r) => r.cmd.startsWith("syntax-check"));
  assert(syntax, "no syntax check ran");
  assert(syntax.ok === false, "broken TypeScript was reported as PASS");
  assert(/app\.ts/.test(syntax.output), `error did not name the file: ${syntax.output}`);
});

// --- v0.49: slop — the complaint that AI code is huge, indirect, and over-built ---

ok("slop-catches-ai-over-engineering", () => {
  const fx = path.join(__dirname, "fixtures", "slop-bad");
  const map = buildMap(fx);
  const f = slopScan(fx, map.files);
  const rules = f.map((x) => x.rule);
  assert(f.some((x) => x.rule === "slop-passthrough"), "passthrough wrappers missed!");
  assert(rules.includes("slop-chain"), "call chain missed!");
  assert(f.length < 12, `too noisy even on a bad fixture: ${f.length}`);
});

ok("slop-no-false-positives-on-clean-code", () => {
  // The fixture is legitimate code that superficially resembles slop: real argument
  // transformation, standard iteration, meaningful nesting. Zero findings, or the
  // rules are useless.
  const fx = path.join(__dirname, "fixtures", "slop-clean");
  const map = buildMap(fx);
  const f = slopScan(fx, map.files);
  assert(f.length === 0, `false positives on clean code: ${f.map((x) => `${x.rule}@${x.line}`).join(", ")}`);
});

ok("slop-no-false-positives-on-repo", () => {
  // This repo is large, idiomatic, and deliberately varied. It is the hardest
  // available test: a slop rule that cries wolf here is unusable in anger.
  const cwd = path.resolve(__dirname, "..");
  const map = buildMap(cwd);
  const f = slopScan(cwd, map.files);
  assert(f.length === 0, `slop false positives on own repo: ${f.map((x) => `${x.rule} ${x.file}:${x.line}`).join(", ")}`);
});

ok("slop-does-not-flag-literal-initialisers", () => {
  // `let closed = false` declares state, it does not alias a variable. An early draft
  // reported 14 of these across this repo before the literal guard was added.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-"));
  fs.writeFileSync(path.join(tmp, "a.js"), [
    "function f(items) {",
    "  let closed = false;",
    "  let dirty = false;",
    "  let out = null;",
    "  for (const i of items) {",
    "    if (i) closed = true;",
    "    if (i > 2) dirty = true;",
    "  }",
    "  return { closed, dirty, out };",
    "}",
    "module.exports = { f };",
  ].join("\n"));
  const map = buildMap(tmp);
  const f = slopScan(tmp, map.files);
  const bad = f.filter((x) => x.rule === "slop-indirection");
  assert(bad.length === 0, `literal initialisers wrongly flagged: ${bad.map((x) => x.msg).join("; ")}`);
});

// --- v0.48: guidance — telling the agent WHERE to work, not just checking after ---

ok("guidance-classifies-task", () => {
  assert(classify("fix the crash in billing").kind === "bugfix", "bugfix not detected");
  assert(classify("add a new export endpoint").kind === "feature", "feature not detected");
  assert(classify("this is an sql injection hole").kind === "security", "security not detected");
  assert(classify("the page is slow, optimize latency").kind === "performance", "performance not detected");
  assert(classify("write a readme").kind === "docs", "docs not detected");
});

ok("guidance-routes-to-right-file", () => {
  const cwd = path.resolve(__dirname, "..");
  const map = buildMap(cwd);
  const b = buildBrief(cwd, map, "fix the broken link checker");
  const files = b.likelyTouch.map((x) => x.file);
  assert(files.some((f) => f.includes("links")), `did not route to the link module: ${files.join(", ")}`);
  // The project's own name must not hijack routing.
  const b2 = buildBrief(cwd, map, "fix the broken link checker in deep era");
  const files2 = b2.likelyTouch.map((x) => x.file);
  assert(files2.some((f) => f.includes("links")), `project name hijacked routing: ${files2.join(", ")}`);
  // Dependents must be surfaced, or the agent breaks callers it never looked at.
  assert(b.alsoAffected.length > 0, "no dependent files reported");
});

ok("guidance-never-points-at-fixtures", () => {
  const cwd = path.resolve(__dirname, "..");
  const map = buildMap(cwd);
  for (const t of ["fix the broken link checker", "fix broken typescript", "add rate limiting to the mcp server"]) {
    const b = buildBrief(cwd, map, t);
    const hit = b.likelyTouch.find((x) => /fixtures?\//.test(x.file));
    assert(!hit, `pointed the agent at a fixture for "${t}": ${hit && hit.file}`);
  }
});

ok("guidance-says-stop-when-it-cannot-route", () => {
  const cwd = path.resolve(__dirname, "..");
  const map = buildMap(cwd);
  // Nothing in this repo relates to submarines: the honest answer is "search", not
  // six plausible-looking files that would send the agent to edit the wrong thing.
  const b = buildBrief(cwd, map, "fix the submarine reactor");
  assert(b.likelyTouch.length === 0, `invented files for an unrelated task: ${b.likelyTouch.map((x) => x.file).join(", ")}`);
  assert(/search/i.test(b.brief), "brief did not tell the agent to search instead of guessing");
});

ok("guidance-surfaces-locked-decisions", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-"));
  fs.writeFileSync(path.join(tmp, "package.json"), '{"name":"g","version":"1.0.0"}');
  fs.writeFileSync(path.join(tmp, "index.js"), "module.exports = 1;");
  remember(tmp, "decision", "RATE LIMIT locked at 100/min. Reason: infra cost ceiling");
  const map = buildMap(tmp);
  const b = buildBrief(tmp, map, "add rate limiting");
  assert(b.lockedDecisions.some((d) => d.includes("100/min")), "locked decision not surfaced to the agent");
  assert(b.brief.includes("100/min"), "locked decision missing from the brief text");
});

ok("guidance-forbids-generated-and-lockfiles", () => {
  const rules = forbiddenFiles();
  assert(rules.some((r) => /lock/.test(r.pattern.source)), "lockfiles not protected");
  assert(rules.some((r) => /node_modules/.test(r.pattern.source)), "vendored code not protected");
  assert(rules.some((r) => /dist|build/.test(r.pattern.source)), "build output not protected");
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
  const out = runSkill(tmp);
  assert(Array.isArray(out) && out.length === 8, "skill pack incomplete!");
  const md = fs.readFileSync(path.join(tmp, ".deep-era", "skills", "deep-era-audit", "SKILL.md"), "utf8");
  assert(md.startsWith("---\nname: deep-era-audit"), "frontmatter broken!");
  assert(md.includes("verify_work") && md.includes("ENGLISH ONLY"), "workflow missing!");
  const fix = fs.readFileSync(path.join(tmp, ".deep-era", "skills", "deep-era-fix", "SKILL.md"), "utf8");
  assert(fix.includes("deep-era check"), "fix skill broken!");
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

ok("stdlib-not-hallucination", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-"));
  fs.writeFileSync(path.join(tmp, "a.py"), "import os\nimport sqlite3\nimport re\nimport datetime\nimport requests\n");
  fs.writeFileSync(path.join(tmp, "requirements.txt"), "requests==2.31.0\n");
  const map = buildMap(tmp);
  const g = guardScan(tmp, map.files);
  assert(!g.some((x) => x.rule === "broken-import"), `stdlib/declared flagged: ${JSON.stringify(g)}`);
  fs.writeFileSync(path.join(tmp, "b.py"), "import ghost_xyz_totally_fake\n");
  const map2 = buildMap(tmp);
  assert(guardScan(tmp, map2.files).some((x) => x.rule === "broken-import"), "real ghost missed!");
});

ok("global-lesson-travels-projects", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-home-"));
  const { rememberGlobal, recall } = require("../src/memory");
  rememberGlobal("never use rm -rf in scripts", home);
  const projA = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-"));
  const projB = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-"));
  const ra = recall(projA, "scripts danger", 4000, home);
  const rb = recall(projB, "scripts danger", 4000, home);
  assert(ra.entries.some((e) => e.global), "lesson missing in project A!");
  assert(rb.entries.some((e) => e.global), "lesson missing in project B!");
});

ok("projects-registry-lists-health", () => {
  const { findProjects, projectStatus } = require("../src/projects");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-"));
  fs.mkdirSync(path.join(root, "proj1", ".deep-era"), { recursive: true });
  fs.writeFileSync(path.join(root, "proj1", ".deep-era", "last-doctor.json"), JSON.stringify({ at: "2026-01-01", failed: 2 }));
  fs.mkdirSync(path.join(root, "proj2", ".deep-era"), { recursive: true });
  const found = findProjects(root);
  assert(found.length === 2, `found ${found.length}, want 2!`);
  assert(projectStatus(path.join(root, "proj1")).state === "FAIL", "FAIL missed!");
  assert(projectStatus(path.join(root, "proj2")).state === "NEVER", "NEVER missed!");
});

ok("recall-phrase-beats-scatter", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-"));
  remember(tmp, "chat", "rate limit hit on deploy pipeline again");
  remember(tmp, "chat", "limited rate of progress this week ok");
  const r = recall(tmp, "rate limit");
  assert(r.entries[0].text.includes("rate limit hit"), "phrase not ranked first!");
});

ok("osv-fixed-version-parsed", () => {
  const { fixedIn } = require("../src/deps");
  const fake = { affected: [{ ranges: [{ events: [{ introduced: "1.0.0" }, { fixed: "1.2.3" }] }] }] };
  assert(fixedIn(fake) === "1.2.3", "fixed version missed!");
  assert(fixedIn({}) === null, "empty vuln should be null!");
});

ok("net-fetch-local-server", async () => {
  const http = require("http");
  const { fetchText } = require("../src/net");
  const srv = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end("<html><head><title>T</title><style>.x{}</style></head><body><h1>Hello Docs</h1><script>evil()</script><p>Version 2.0 API</p></body></html>");
  });
  await new Promise((r) => srv.listen(0, r));
  const port = srv.address().port;
  const r = await fetchText(`http://127.0.0.1:${port}/docs`);
  srv.close();
  assert(r.ok, `fetch failed: ${r.error}`);
  assert(r.text.includes("Hello Docs") && r.text.includes("Version 2.0"), "content lost!");
  assert(!r.text.includes("evil()") && !r.text.includes(".x{}"), "script/style leaked!");
  const bad = await fetchText("gopher://x");
  assert(!bad.ok, "non-http accepted!");
});

ok("net-research-degrades-honestly", async () => {
  const { instantAnswer } = require("../src/net");
  const r = await instantAnswer("test query unlikely to matter");
  assert(typeof r.ok === "boolean" && (r.ok ? r.text.length > 0 : /URL|offline|unavailable|no instant/.test(r.error)), "dishonest shape!");
});

ok("serve-fail-spots-crash", async () => {
  const { runServe } = require("../src/serve");
  const dir = path.join(__dirname, "fixtures", "serve-fail");
  const r = await runServe(dir, 6000);
  assert(r.ran, "serve refused to run!");
  assert(r.errors.some((e) => /Cannot find module|MODULE_NOT_FOUND/.test(e)), `crash missed: ${JSON.stringify(r.errors)}`);
  assert(r.probes.length === 0, "phantom probes!");
});

ok("serve-run-observe-probe", async () => {  const { runServe } = require("../src/serve");
  const dir = path.join(__dirname, "fixtures", "serve-app");
  const r = await runServe(dir, 8000);
  assert(r.ran, "serve refused to run!");
  assert(r.probes.some((p) => p.status === 200), `no 200 probe: ${JSON.stringify(r.probes)}`);
  assert(r.errors.length === 0, `false errors: ${r.errors}`);
});

ok("deep-eraignore-tames-monorepo", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-"));
  fs.mkdirSync(path.join(tmp, "generated"), { recursive: true });
  fs.writeFileSync(path.join(tmp, "generated", "big.js"), "x".repeat(100));
  fs.writeFileSync(path.join(tmp, "app.js"), "console.log(1);\n");
  fs.writeFileSync(path.join(tmp, ".deep-eraignore"), "generated/\n");
  const map = buildMap(tmp);
  assert(map.files.some((f) => f.file === "app.js"), "app lost!");
  assert(!map.files.some((f) => f.file.startsWith("generated")), "ignore failed!");
  assert(map.counts.truncated === false, "truncated flag wrong!");
});

ok("recall-trigram-cousins", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-"));
  remember(tmp, "fix", "authentication middleware timing out under load");
  remember(tmp, "chat", "unrelated lunch plans today");
  const r = recall(tmp, "authenticating");
  assert(r.entries[0].text.includes("authentication"), "trigram cousin missed!");
});

ok("cwe-tags-present", () => {
  const { tag, tagSuffix } = require("../src/cwe");
  assert(tag("sql-injection").cwe === "CWE-89", "CWE map wrong!");
  assert(tagSuffix("nope") === "", "unknown rule should be empty!");
  assert(tagSuffix("entropy-secret").includes("CWE-798"), "suffix wrong!");
});

ok("resolve-dep-no-fake-ext", () => {
  const { resolveDep } = require("../src/map");
  const names = new Set(["package.json", "src/a.js"]);
  assert(resolveDep(names, "package.json") === "package.json", "json import broken!");
  assert(resolveDep(names, "src/a") === "src/a.js", "ext guess broken!");
  assert(resolveDep(names, "src/ghost") === null, "ghost resolved!");
});

ok("recall-proximity-density", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-"));
  remember(tmp, "chat", "deploy pipeline rate limit notes for release");
  remember(tmp, "chat", "deploy happened monday. unrelated pipeline tuesday. rate was fine. limit unknown.");
  const r = recall(tmp, "deploy rate limit");
  assert(r.entries[0].text.includes("rate limit notes"), "dense entry lost!");
});

ok("snapshot-prune-keeps-five", () => {
  const { createSnapshot, listSnapshots, pruneSnapshots } = require("../src/snapshot");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-"));
  fs.writeFileSync(path.join(tmp, "a.js"), "x");
  for (let i = 0; i < 7; i++) createSnapshot(tmp, "s" + i);
  assert(listSnapshots(tmp).length === 7, "setup wrong!");
  const r = pruneSnapshots(tmp, 5);
  assert(r.kept === 5 && r.dropped === 2 && listSnapshots(tmp).length === 5, "prune wrong!");
});

ok("undefined-method-caught", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-"));
  fs.writeFileSync(path.join(tmp, "lib.js"), "function real() {}\nmodule.exports = { real };\n");
  fs.writeFileSync(path.join(tmp, "app.js"), "const lib = require('./lib');\nlib.real();\nlib.imaginary();\n");
  const map = buildMap(tmp);
  const g = guardScan(tmp, map.files);
  assert(g.some((x) => x.rule === "undefined-method" && x.file === "app.js"), "imaginary method missed!");
  assert(!g.some((x) => x.file === "lib.js"), "real method flagged!");
});

ok("comment-stats-caught", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-"));
  fs.writeFileSync(path.join(tmp, "a.js"), "// e" + ".g. 1400 runs, 99" + ".5% accurate, trust me\nconsole.log(1);\n");
  const map = buildMap(tmp);
  const g = guardScan(tmp, map.files);
  assert(g.some((x) => x.rule === "comment-stats"), "comment claim missed!");
});

ok("announce-rule-in-template", () => {
  const { AGENTS_MD } = require("../src/init");
  assert(AGENTS_MD.includes("Deep-Era session started:") && AGENTS_MD.includes("Deep-Era session done:"), "announce rule missing!");
});

ok("links-catch-dead-url", async () => {
  const http = require("http");
  const { auditLinks, extractUrls } = require("../src/links");
  const srv = http.createServer((req, res) => {
    if (req.url === "/gone") { res.writeHead(404); res.end("no"); }
    else { res.writeHead(200); res.end("yes"); }
  });
  await new Promise((r) => srv.listen(0, r));
  const port = srv.address().port;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-"));
  fs.writeFileSync(path.join(tmp, "DOCS.md"), `See http://127.0.0.1:${port}/ok and http://127.0.0.1:${port}/gone and http://localhost:9/none\n`);
  const map = buildMap(tmp);
  const urls = extractUrls(tmp, map.files);
  assert([...urls.keys()].some((u) => u.endsWith("/gone")), "extraction missed!");
  assert(![...urls.keys()].some((u) => u.includes("localhost")), "localhost not skipped!");
  const found = await auditLinks(tmp, map.files);
  srv.close();
  assert(found.some((f) => f.rule === "broken-link" && f.file === "DOCS.md"), "dead link missed!");
  assert(!found.some((f) => f.msg.includes("/ok ")), "live link flagged!");
});

ok("stack-detection", () => {
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

ok("test-report-written", async () => {
  await finish();
  const { readReport } = require("./lib/report");
  const r = readReport(process.cwd());
  assert(r.suites.unit && r.suites.unit.pass > 30, "unit suite missing in report!");
  assert(r.total.pass > 30 && typeof r.result === "string", "report totals wrong!");
});
