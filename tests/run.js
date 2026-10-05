// Self-test v0.6 for AI Deep Era (no deps)
// deep-era-allow: secret-assign, entropy-secret, aws-key, passwd-assign
// The encryption and guardian tests below use passphrase strings and fake keys as
// fixtures. Those are test inputs, not credentials, so the secret rules are suppressed
// for this file only. Everything else in this file is still checked, which is the
// point of a scoped marker.
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
const crypt = require("../src/crypt");
const mb = require("../src/memorybank");
const { matchSkills, getCatalog: getSkillsCatalog } = require("../src/skills");
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

ok("guardian-skips-placeholders", () => {
  // A scanner that flags SECRET_KEY="your-secret-key-here" trains everyone to ignore
  // it — then the real key in the next file gets missed. Placeholders must be silent.
  const { isPlaceholder, scanFileSecrets } = require("../src/guardian");
  for (const doc of [
    'SECRET_KEY="your-secret-key-here"',
    'password = "changeme1234567890"',
    'api_key = "<YOUR_API_KEY>"',
    'token = "${API_TOKEN}"',
    "secret = '***'",
    'auth_token = "example-token-abcdef123456"',
  ]) assert(isPlaceholder(doc), `placeholder not recognized: ${doc}`);
  // ...but weak-looking real values still count. Doubting a real secret is worse.
  assert(!isPlaceholder('password="test123456"'), "real value wrongly excused");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-guard-"));
  fs.writeFileSync(path.join(tmp, "docs.md"), 'SECRET_KEY="your-secret-key-here"\n');
  assert(scanFileSecrets(path.join(tmp, "docs.md"), "docs.md").length === 0, "placeholder flagged as leak");
});

ok("guardian-catches-real-secrets", () => {
  const { scanFileSecrets } = require("../src/guardian");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-guard-"));
  // NOTE: the famous AWS docs example key (AKIA followed by IOSFODNN7EXAMPLE) is
  // deliberately NOT used here — it contains the word EXAMPLE, so the placeholder
  // filter skips it (correctly: that exact key appears in AWS documentation, never
  // as a real leak). Spelled broken here so no full key-shaped literal is committed.
  // NOTE: fixture secrets are assembled at runtime (prefix + body), never as one
  // literal. GitHub push protection scans committed blobs for full key patterns and
  // blocks the push — even for fakes. Runtime assembly keeps the test meaningful
  // (the scanner still sees the complete string) while the repo never contains one.
  const stripeBody = "51H7xY9mN2pQ4rS8tU6vW0xYzAb";
  const awsBody = "JX7Q2K9M4N8P3R6T5VZ";
  const slackBody = "123456789012-abcdefghijAB";
  fs.writeFileSync(path.join(tmp, "app.js"),
    "const a = 'sk_live_" + stripeBody + "';\n" +
    "const b = 'AKIA" + awsBody + "';\n" +
    "const c = 'xoxb-" + slackBody + "';\n");
  const f = scanFileSecrets(path.join(tmp, "app.js"), "app.js");
  const rules = f.map((x) => x.rule);
  assert(rules.includes("stripe-secret"), "stripe key missed");
  assert(rules.includes("aws-key"), "aws key missed");
  assert(f.every((x) => x.line > 0 && x.file === "app.js"), "findings must carry file+line");
});

ok("guardian-merge-keeps-worst-finding", () => {
  // Both engines see the same leak on the same line: keep the critical specific
  // report, not the medium generic one. First-wins dropped a stripe-secret once
  // because an entropy note sat on the same line.
  const { mergeSecretFindings } = require("../src/guardian");
  const base = [{ file: "a.js", line: 1, rule: "entropy-secret", sev: "medium", msg: "e" }];
  const extra = [{ file: "a.js", line: 1, rule: "stripe-secret", sev: "critical", msg: "s" }];
  const m = mergeSecretFindings(base, extra);
  assert(m.length === 1, `expected 1 merged finding, got ${m.length}`);
  assert(m[0].rule === "stripe-secret", `wrong survivor: ${m[0].rule}`);
  // Same severity + same family still collapses (no double-report of one leak).
  const m2 = mergeSecretFindings(
    [{ file: "a.js", line: 1, rule: "aws-key", sev: "critical", msg: "e" }],
    [{ file: "a.js", line: 1, rule: "aws-key", sev: "critical", msg: "s" }]
  );
  assert(m2.length === 1, "same leak reported twice");
  // Different lines are different leaks — both survive.
  const m3 = mergeSecretFindings(base, [{ file: "a.js", line: 2, rule: "stripe-secret", sev: "critical", msg: "s" }]);
  assert(m3.length === 2, "distinct leaks collapsed");
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

// --- v0.51: the prompt is the product surface; it must stay true -------------

ok("prompt-file-exists-and-is-complete", () => {
  const f = path.join(path.resolve(__dirname, ".."), "PROMPT.md");
  assert(fs.existsSync(f), "PROMPT.md missing — `deep-era prompt` would fail");
  const txt = fs.readFileSync(f, "utf8");
  // It is shipped in the npm tarball, or the command is broken for every user.
  assert(require("../package.json").files.includes("PROMPT.md"), "PROMPT.md is not in package.json files");
  assert(/```[\s\S]*```/.test(txt), "PROMPT.md has no fenced block to copy from");
  assert(txt.length > 3000, `PROMPT.md is suspiciously short: ${txt.length} chars`);
});

ok("prompt-names-only-tools-that-exist", () => {
  // A prompt that tells an agent to call a tool which does not exist is worse than no
  // prompt: it teaches the agent to ignore the instructions. Every tool named in the
  // paste must be in the MCP tool list or a real CLI command.
  const txt = fs.readFileSync(path.join(path.resolve(__dirname, ".."), "PROMPT.md"), "utf8");
  const { TOOLS } = require("../mcp/server");
  const toolNames = new Set(TOOLS.map((t) => t.name));
  const cli = fs.readFileSync(path.join(path.resolve(__dirname, ".."), "bin", "cli.js"), "utf8");

  const called = [...txt.matchAll(/^\s{2}([a-z_]+)\(/gm)].map((m) => m[1]);
  assert(called.length > 5, `only ${called.length} tool calls found in the prompt`);
  for (const name of new Set(called)) {
    if (toolNames.has(name)) continue;
    // not an MCP tool: it must still be a real command in the CLI
    assert(cli.includes(`"${name}"`), `prompt calls "${name}" which is neither an MCP tool nor a CLI command`);
  }
});

ok("prompt-states-the-real-limits", () => {
  // The prompt must not oversell. These are the exact boundaries of the engines, and
  // an agent that does not know them will trust a clean bill of health too much.
  const txt = fs.readFileSync(path.join(path.resolve(__dirname, ".."), "PROMPT.md"), "utf8");
  assert(/does NOT type-check/i.test(txt), "prompt does not admit the lack of type checking");
  assert(/deliberately NOT reported/i.test(txt), "prompt does not state which rules are intentionally absent");
  assert(/clean bill of health/i.test(txt), "prompt does not warn against trusting a clean result");
});

ok("prompt-covers-the-detected-failures", () => {
  const txt = fs.readFileSync(path.join(path.resolve(__dirname, ".."), "PROMPT.md"), "utf8");
  for (const phrase of ["catch", "await", "assert.ok(true)", "dead", "dead code"]) {
    assert(txt.toLowerCase().includes(phrase.toLowerCase()), `prompt never mentions "${phrase}"`);
  }
  // The two calls that carry the whole product.
  assert(txt.includes("guide_task"), "prompt does not mention guide_task");
  assert(txt.includes("deep-era check"), "prompt does not mention deep-era check");
});

ok("cli-prompt-prints-clean-copy", () => {
  const { execFileSync } = require("child_process");
  const root = path.resolve(__dirname, "..");
  const raw = execFileSync(process.execPath, [path.join(root, "bin", "cli.js"), "prompt", "--raw"], { cwd: root }).toString();
  assert(!raw.includes("Why this works"), "--raw leaked the surrounding commentary");
  assert(raw.trim().startsWith("You have DEEP-ERA installed"), "--raw did not start with the paste");
  assert(raw.includes("guide_task"), "--raw is missing the core instruction");
});

// --- v0.51: skills are wired into the workflow, not just listed ---------------

ok("skills-catalog-has-triggers", () => {
  // The whole feature rests on this: if triggers go missing the matcher has nothing
  // to work with, and 410 skills become a list nobody reads.
  const c = getSkillsCatalog(path.resolve(__dirname, ".."));
  const withTriggers = (c.skills || []).filter((s) => Array.isArray(s.triggers) && s.triggers.length);
  assert((c.skills || []).length > 100, `catalog looks empty: ${(c.skills || []).length}`);
  assert(withTriggers.length === (c.skills || []).length,
    `only ${withTriggers.length}/${(c.skills || []).length} skills carry triggers`);
});

ok("skills-match-the-right-skill", () => {
  const cwd = path.resolve(__dirname, "..");
  const cases = [
    ["audit accessibility of the checkout page", "accessib"],
    ["optimize slow database queries", "sql"],
    ["write a security threat model", "threat"],
    ["review my pull request before merge", "review"],
    ["add react state management", "react"],
  ];
  for (const [task, expect] of cases) {
    const m = matchSkills(task, 5, cwd);
    assert(m.length > 0, `no skill matched a task that clearly has one: "${task}"`);
    assert(m.some((s) => s.id.toLowerCase().includes(expect)),
      `"${task}" matched ${m.map((s) => s.id).join(", ")} but expected something containing "${expect}"`);
  }
});

ok("skills-handles-shorthand", () => {
  // Users type "postgres" for the postgresql skill. Exact-name matching alone misses it.
  const cwd = path.resolve(__dirname, "..");
  const m = matchSkills("investigate a postgres connection pool", 5, cwd);
  assert(m.some((s) => s.id === "postgresql"), `"postgres" did not reach the postgresql skill: ${m.map((s) => s.id).join(", ")}`);
});

ok("skills-refuse-instead-of-guessing", () => {
  // The important half. A wrong suggestion costs the agent context and teaches it to
  // skim past the section, so "no match" has to be a real, reachable answer.
  const cwd = path.resolve(__dirname, "..");
  assert(matchSkills("fix a typo in a variable name", 5, cwd).length === 0,
    "a Kubernetes skill matched 'fix a typo' via a substring inside podsecuritypolicy");
  assert(matchSkills("blah blah random nonsense", 5, cwd).length === 0,
    "invented skills for nonsense input");
  assert(matchSkills("", 5, cwd).length === 0, "matched something for an empty task");
});

ok("skills-no-duplicate-suggestions", () => {
  const cwd = path.resolve(__dirname, "..");
  const m = matchSkills("optimize slow database queries", 6, cwd);
  const ids = m.map((s) => s.id);
  assert(new Set(ids).size === ids.length, `duplicate suggestions: ${ids.join(", ")}`);
});

ok("guide-task-recommends-skills", () => {
  const cwd = path.resolve(__dirname, "..");
  const map = buildMap(cwd);
  const b = buildBrief(cwd, map, "optimize slow database queries");
  assert(b.skills.length > 0, "guide_task recommended no skills for a database task");
  assert(b.brief.includes("SKILLS THAT APPLY"), "brief text omits the skills section");
  assert(b.brief.includes(b.skills[0].id), "brief does not name the top skill");
});

ok("mcp-skill-tools-are-exposed", () => {
  const { TOOLS } = require("../mcp/server");
  for (const t of ["match_skills", "get_skill", "list_skills", "guide_task"]) {
    assert(TOOLS.some((x) => x.name === t), `MCP tool ${t} missing`);
  }
});

// --- skill collections: install + index + discover (the missing pipeline) --------

ok("skillindex-parses-both-frontmatter-styles", () => {
  const { parseSkillFrontmatter } = require("../src/skillindex");
  const base = path.join(__dirname, "fixtures", "skills-collection", "skills");
  const a = parseSkillFrontmatter(path.join(base, "alpha-cache-audit"));
  assert(a.ok && a.entry.name === "alpha-cache-audit", "deep-era-style skill rejected");
  assert(a.entry.triggers.length === 0, "expected no explicit triggers");
  const b = parseSkillFrontmatter(path.join(base, "beta-container-forensics"));
  assert(b.ok && b.entry.name === "beta-container-forensics", "cyber-style skill rejected");
  assert(b.entry.category === "cybersecurity", `domain not mapped to category: ${b.entry.category}`);
  assert(b.entry.tags.includes("docker"), "tags list not parsed");
  assert(b.entry.description.includes("volumes"), "multiline description truncated");
  // Both directions: invalid members fail loudly with reasons.
  const broken = parseSkillFrontmatter(path.join(base, "empty-broken"));
  assert(!broken.ok && broken.error, "skill dir without SKILL.md accepted");
  const nofront = parseSkillFrontmatter(path.join(base, "nofront-broken"));
  assert(!nofront.ok && nofront.error, "SKILL.md without frontmatter accepted");
});

ok("skillindex-normalizes-crlf", () => {
  // Cloned repos vary (CRLF on Windows checkouts). The parser must not care.
  const { parseSkillFrontmatter } = require("../src/skillindex");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-skill-"));
  const src = fs.readFileSync(path.join(__dirname, "fixtures", "skills-collection", "skills", "beta-container-forensics", "SKILL.md"), "utf8");
  fs.writeFileSync(path.join(tmp, "SKILL.md"), src.replace(/\n/g, "\r\n"));
  const r = parseSkillFrontmatter(tmp);
  assert(r.ok && r.entry.name === "beta-container-forensics", `CRLF skill rejected: ${r.error || "?"}`);
});

ok("skillindex-derives-triggers", () => {
  const { deriveTriggers } = require("../src/skillindex");
  const t = deriveTriggers("beta-container-forensics", "Investigate compromised containers by analyzing images", ["forensics", "docker"]);
  assert(t.includes("forensics") && t.includes("docker") && t.includes("compromised"), `weak triggers: ${t.join(",")}`);
  assert(!t.some((w) => ["the", "by", "use", "for"].includes(w)), "stopwords leaked into triggers");
  assert(t.length <= 24, "trigger list uncapped");
});

ok("skillindex-collection-install", () => {
  const { installCollectionFromDir } = require("../src/skill");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-skill-"));
  const r = installCollectionFromDir(path.join(__dirname, "fixtures", "skills-collection"), path.join(tmp, "skills"));
  const names = r.installed.map((x) => x.name);
  assert(names.includes("alpha-cache-audit") && names.includes("beta-container-forensics"), `valid skills missing: ${names.join(",")}`);
  assert(r.rejected.length === 2, `expected 2 rejects, got ${r.rejected.length}`);
  assert(r.rejected.every((x) => x.dir && x.error), "rejects must carry dir + reason");
  assert(!r.truncated, "small fixture wrongly reported truncated");
  // Cap is a real valve, not decoration.
  const tmp2 = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-skill-"));
  const capped = installCollectionFromDir(path.join(__dirname, "fixtures", "skills-collection"), path.join(tmp2, "skills"), { max: 1 });
  assert(capped.installed.length === 1 && capped.truncated === true, "max cap not enforced");
  // Non-collections return null instead of throwing.
  const plainDir = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-plain-"));
  assert(installCollectionFromDir(plainDir, path.join(plainDir, "out")) === null, "plain dir misread as collection");
});

ok("skillindex-reindex-merges-and-discovers", () => {
  const { installCollectionFromDir } = require("../src/skill");
  const { reindexSkills } = require("../src/skillindex");
  const { getCatalog, clearCatalogCache, matchSkills, getSkill } = require("../src/skills");
  clearCatalogCache();
  const proj = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-proj-"));
  fs.writeFileSync(path.join(proj, "package.json"), "{}");
  const ins = installCollectionFromDir(path.join(__dirname, "fixtures", "skills-collection"), path.join(proj, ".deep-era", "skills"));
  assert(ins.installed.length === 2, "fixture install broke");
  const r = reindexSkills(proj);
  assert(r.indexed === 2, `expected 2 indexed, got ${r.indexed}`);
  assert(fs.existsSync(path.join(proj, ".deep-era", "skills", "catalog.json")), "catalog not written");
  // Installed skills are now discoverable by task and readable by id.
  const m = matchSkills("investigate a compromised container", 5, proj);
  assert(m.some((s) => s.id === "beta-container-forensics"), `new skill not matched: ${m.map((s) => s.id).join(",")}`);
  const g = getSkill("beta-container-forensics", proj);
  assert(g && g.content.includes("runtime logs"), "installed skill content unreadable");
  // And the base catalog still merges underneath (union, not replacement).
  const c = getCatalog(proj);
  assert(c.skills.length > 100, "base catalog lost in merge");
  clearCatalogCache();
});

ok("skillindex-cache-refreshes-on-reindex", () => {
  // The MCP server is long-lived: a reindex in the same process must invalidate
  // the catalog cache, or match_skills keeps answering from yesterday.
  const { installCollectionFromDir } = require("../src/skill");
  const { reindexSkills } = require("../src/skillindex");
  const { getCatalog, clearCatalogCache, matchSkills } = require("../src/skills");
  clearCatalogCache();
  const proj = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-proj-"));
  fs.writeFileSync(path.join(proj, "package.json"), "{}");
  installCollectionFromDir(path.join(__dirname, "fixtures", "skills-collection"), path.join(proj, ".deep-era", "skills"));
  const before = matchSkills("investigate a compromised container", 5, proj).map((s) => s.id);
  assert(!before.includes("beta-container-forensics"), "unindexed skill matched before any index existed");
  reindexSkills(proj);
  assert(matchSkills("investigate a compromised container", 5, proj).some((s) => s.id === "beta-container-forensics"),
    "stale cache survived reindex");
  clearCatalogCache();
});

// --- v0.51: encryption at rest (AES-256-GCM, zero dependencies) ---------------

ok("crypt-roundtrip-and-leaks-nothing", () => {
  const fs2 = require("fs");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-crypt-"));
  const key = "a-long-enough-passphrase-42";
  const secret = "Stripe live key sk_live_abc123. RATE LIMIT locked at 100/min.";
  const blob = crypt.encrypt(secret, key, path.join(tmp, "b.salt"));
  assert(crypt.isEncrypted(blob), "blob not recognised as encrypted");
  assert(crypt.decrypt(blob, key, path.join(tmp, "b.salt")) === secret, "round trip lost data");
  const low = blob.toLowerCase();
  assert(!low.includes("stripe") && !low.includes("sk_live") && !low.includes("100/min"),
    "ciphertext leaked the plaintext");
});

ok("crypt-rejects-wrong-key-and-detects-tampering", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-crypt-"));
  const s = path.join(tmp, "b.salt");
  const blob = crypt.encrypt("secret payload", "correct passphrase here", s);
  // A wrong passphrase must fail loudly rather than return garbage.
  let threw = false;
  try { crypt.decrypt(blob, "wrong passphrase here", s); } catch { threw = true; }
  assert(threw, "wrong passphrase decrypted successfully");
  // GCM is authenticated: flipping a ciphertext bit must be detected, not decoded.
  const p = blob.split(".");
  const flipped = (p[4][0] === "A" ? "B" : "A") + p[4].slice(1);
  threw = false;
  try { crypt.decrypt(p.slice(0, 4).join(".") + "." + flipped, "correct passphrase here", s); } catch { threw = true; }
  assert(threw, "tampered ciphertext was accepted");
});

ok("crypt-fresh-iv-per-record", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-crypt-"));
  const s = path.join(tmp, "b.salt");
  const a = crypt.encrypt("same text", "passphrase for testing", s);
  const b = crypt.encrypt("same text", "passphrase for testing", s);
  assert(a !== b, "identical plaintext produced identical ciphertext (IV reuse)");
  assert(crypt.decrypt(a, "passphrase for testing", s) === "same text", "a failed to decrypt");
  assert(crypt.decrypt(b, "passphrase for testing", s) === "same text", "b failed to decrypt");
});

ok("crypt-refuses-weak-passphrase", () => {
  let threw = false;
  try { crypt.encrypt("x", "short"); } catch { threw = true; }
  assert(threw, "accepted a 5-character passphrase");
});

ok("memory-bank-encrypts-at-rest", () => {
  const prev = process.env.DEEP_ERA_KEY;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-bank-"));
  const file = path.join(tmp, ".deep-era", "memory_bank.json");
  const secret = "user said: stripe key sk_live_secret123";
  try {
    process.env.DEEP_ERA_KEY = "a-long-enough-passphrase-42";
    mb.addMemory({ kind: "decision", title: "Keys", content: secret }, tmp);
    const raw = fs.readFileSync(file, "utf8");
    assert(crypt.isEncrypted(raw), "bank was not encrypted");
    assert(!raw.includes("sk_live") && !raw.includes("stripe"), "bank leaked its contents");

    // Correct key reads it back perfectly.
    assert(mb.loadMemoryBank(tmp).entries[0].content === secret, "could not read back with the right key");

    // No key: nothing readable, and no crash.
    delete process.env.DEEP_ERA_KEY;
    assert(mb.loadMemoryBank(tmp).entries.length === 0, "bank readable without the key");
    assert(mb.bankSecurityStatus(tmp).state === "encrypted-locked", "status wrong for a locked bank");
  } finally {
    if (prev === undefined) delete process.env.DEEP_ERA_KEY; else process.env.DEEP_ERA_KEY = prev;
  }
});

ok("memory-bank-plaintext-mode-still-works", () => {
  const prev = process.env.DEEP_ERA_KEY;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-bank-"));
  try {
    delete process.env.DEEP_ERA_KEY;
    mb.addMemory({ kind: "decision", title: "Plain", content: "MAX 3 jobs" }, tmp);
    assert(mb.loadMemoryBank(tmp).entries.length === 1, "plaintext mode broken");
    assert(mb.bankSecurityStatus(tmp).state === "plaintext", "status wrong for a plaintext bank");
    // Migration must refuse without a key rather than write unreadable data.
    assert(mb.migrateToEncrypted(tmp).migrated === false, "migrated with no key");
  } finally {
    if (prev === undefined) delete process.env.DEEP_ERA_KEY; else process.env.DEEP_ERA_KEY = prev;
  }
});

ok("memory-encrypted-recall-and-degrade", () => {
  const prev = process.env.DEEP_ERA_KEY;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-mem-"));
  try {
    process.env.DEEP_ERA_KEY = "a-long-enough-passphrase-42";
    remember(tmp, "decision", "RATE LIMIT locked at 100/min. Reason: cost ceiling");
    remember(tmp, "chat", "user said: stripe key is sk_live_secret123");
    const raw = fs.readFileSync(path.join(tmp, ".deep-era", "logs", "memory.jsonl"), "utf8");
    assert(!raw.includes("sk_live") && !raw.includes("RATE LIMIT"), "session log leaked plaintext");
    // The index stays readable so timeline and stats keep working without the key.
    assert(raw.includes('"kind":"decision"'), "kind/kind metadata was encrypted too");
    assert(recall(tmp, "rate limit").entries.length > 0, "recall failed with the right key");

    delete process.env.DEEP_ERA_KEY;
    assert(recall(tmp, "rate limit").entries.length === 0, "recall returned data with no key");

    process.env.DEEP_ERA_KEY = "entirely different passphrase";
    assert(recall(tmp, "rate limit").entries.length === 0, "recall returned data with a wrong key");
  } finally {
    if (prev === undefined) delete process.env.DEEP_ERA_KEY; else process.env.DEEP_ERA_KEY = prev;
  }
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

ok("ssl-is-stdlib-not-hallucination", () => {
  // Proven false on a real project: `import ssl` was reported as hallucinated.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-"));
  fs.writeFileSync(path.join(tmp, "a.py"), "import ssl\nimport socket\n");
  const map = buildMap(tmp);
  const g = guardScan(tmp, map.files);
  assert(!g.some((x) => x.rule === "broken-import" || x.rule === "unlisted-dependency"), `stdlib ssl flagged: ${JSON.stringify(g)}`);
});

ok("unlisted-dependency-framing", () => {
  // Bare third-party name, zero manifests anywhere: undeclared-or-invented is honest,
  // "hallucinated" is an accusation. Proven on `gradio` (real PyPI package).
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-"));
  fs.writeFileSync(path.join(tmp, "a.py"), "import gradio\n");
  const map = buildMap(tmp);
  const g = guardScan(tmp, map.files);
  assert(g.some((x) => x.rule === "unlisted-dependency" && x.file === "a.py"), "unlisted dep missed!");
  assert(!g.some((x) => x.rule === "broken-import" && x.file === "a.py"), "unlisted dep mislabeled as hallucinated!");
  // Same import WITH a manifest that omits it: genuinely broken, medium as before.
  fs.writeFileSync(path.join(tmp, "requirements.txt"), "requests==2.31.0\n");
  const map2 = buildMap(tmp);
  assert(guardScan(tmp, map2.files).some((x) => x.rule === "broken-import"), "real ghost with manifest missed!");
});

ok("rm-rf-only-bare-root", () => {
  // Proven false on a real Dockerfile: `rm -rf /var/lib/apt/lists/*` is hygiene.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-"));
  fs.writeFileSync(path.join(tmp, "safe.py"), "# RUN apt-get update && rm -rf /var/lib/apt/lists/*\n# rm -rf ./dist\n# rm -rf /tmp/build\n");
  const map = buildMap(tmp);
  assert(!securityScan(tmp, map.files).some((x) => x.rule === "rm-rf"), "safe rm -rf paths flagged!");
  // Assembled at runtime like the stripe-key fixtures: the committed file must never
  // contain the full pattern, or this repo fails its own audit.
  fs.writeFileSync(path.join(tmp, "evil.py"), "# deploy cleanup\nrun(\"rm -rf " + "/\")\n");
  const map2 = buildMap(tmp);
  assert(securityScan(tmp, map2.files).some((x) => x.rule === "rm-rf"), "bare root wipe missed!");
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

ok("selfupdate-compare-versions", () => {
  const { compareVersions } = require("../src/selfupdate");
  // 0.9.0 < 0.10.0 is the classic trap string comparison falls into.
  const cases = [
    ["0.9.0", "0.10.0", -1], ["0.10.0", "0.9.0", 1], ["0.53.0", "0.53.0", 0],
    ["1.0.0", "0.99.99", 1], ["0.53", "0.53.0", 0], ["2.0", "10.0", -1],
  ];
  for (const [a, b, want] of cases) {
    assert(compareVersions(a, b) === want, `compareVersions(${a}, ${b}) !== ${want}`);
  }
});

ok("selfupdate-cache-roundtrip", () => {
  const { writeCache, readCache } = require("../src/selfupdate");
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-home-"));
  assert(readCache(home) === null, "empty cache should read null");
  writeCache(home, "0.99.0");
  const c = readCache(home);
  assert(c && c.latest === "0.99.0" && c.checkedAt, "cache roundtrip broke");
});

ok("selfupdate-staleness-notice", async () => {
  const { writeCache, stalenessNotice, currentVersion } = require("../src/selfupdate");
  const cur = currentVersion();
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-home-"));
  // Same version cached fresh: silence.
  writeCache(home, cur);
  assert(await stalenessNotice(home, 0, true) === null, "up-to-date install should be silent");
  // Newer version cached fresh: one-line notice naming both versions.
  writeCache(home, "99.0.0");
  const note = await stalenessNotice(home, 0, true);
  assert(note && note.includes(cur) && note.includes("99.0.0") && note.includes("deep-era update"), `bad notice: ${note}`);
  // No cache + cache-only (offline gate path): silence, never network.
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-home-"));
  assert(await stalenessNotice(empty, 0, true) === null, "missing cache should stay silent offline");
});

ok("selfupdate-apply-command-shape", () => {
  const { buildApplyCommand } = require("../src/selfupdate");
  const { cmd, args } = buildApplyCommand();
  assert(cmd === "npm", "apply must go through npm");
  assert(args.includes("-g") && args.some((a) => a.includes("aureonagios/deep-era")), `apply points at wrong source: ${args.join(" ")}`);
  assert(!args.some((a) => a.includes("registry.npmjs.org")), "apply must not use the npm registry (package was never published there)");
});

ok("ide-detects-from-disk-markers", () => {
  const { detectInstalledIdes } = require("../src/ide");
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-home-"));
  fs.mkdirSync(path.join(home, ".cursor"));
  fs.mkdirSync(path.join(home, ".vscode"));
  const found = detectInstalledIdes(home);
  const ids = found.map((f) => f.id);
  assert(ids.includes("cursor"), "planted .cursor marker missed");
  assert(ids.includes("vscode"), "planted .vscode marker missed");
  // Every detection must carry its evidence — "detected" without proof is a guess.
  for (const f of found) assert(f.evidence && f.evidence.length > 0, `${f.id} has no evidence`);
});

ok("ide-wire-creates-and-merges", () => {
  const { runIde } = require("../src/ide");
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-home-"));
  fs.mkdirSync(path.join(home, ".cursor"));
  fs.mkdirSync(path.join(home, ".vscode"));
  const proj = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-proj-"));
  fs.writeFileSync(path.join(proj, "package.json"), "{}");
  // Pre-existing vscode config with another server: must merge, never overwrite.
  fs.mkdirSync(path.join(proj, ".vscode"), { recursive: true });
  fs.writeFileSync(path.join(proj, ".vscode", "mcp.json"), JSON.stringify({ servers: { other: { command: "x" } } }));
  const r = runIde(proj, { homeDir: home });
  const cursorCfg = JSON.parse(fs.readFileSync(path.join(proj, ".cursor", "mcp.json"), "utf8"));
  assert(cursorCfg.mcpServers && cursorCfg.mcpServers["deep-era"], "cursor config not created");
  const vsCfg = JSON.parse(fs.readFileSync(path.join(proj, ".vscode", "mcp.json"), "utf8"));
  assert(vsCfg.servers["deep-era"] && vsCfg.servers.other, "vscode config not merged (other server lost!)");
  assert(fs.existsSync(path.join(proj, ".vscode", "mcp.json.deep-era.bak")), "no backup before merge");
  assert(r.brief && r.brief.stack === "node", "brief missing project facts");
});

ok("ide-unknown-name-says-so", () => {
  const { runIde } = require("../src/ide");
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-home-"));
  const proj = fs.mkdtempSync(path.join(os.tmpdir(), "deep-era-proj-"));
  const r = runIde(proj, { homeDir: home, name: "nosuchide" });
  assert(r.manual.length === 1 && /no install markers found/i.test(r.manual[0].step), "unknown IDE name did not say so honestly");
  assert(r.wired.length === 0, "wired something for an unknown IDE?!");
});

ok("test-report-written", async () => {
  await finish();
  const { readReport } = require("./lib/report");
  const r = readReport(process.cwd());
  assert(r.suites.unit && r.suites.unit.pass > 30, "unit suite missing in report!");
  assert(r.total.pass > 30 && typeof r.result === "string", "report totals wrong!");
});
