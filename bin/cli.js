#!/usr/bin/env node
// Deep-Era CLI. User may speak any language — all code and output is ENGLISH ONLY.
const fs = require("fs");
const path = require("path");

const cmd = process.argv[2];
const targetDir = process.argv[3] && !process.argv[3].startsWith("-") ? path.resolve(process.argv[3]) : process.cwd();

async function main() {
  if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") {
    console.log(`
AI Deep Era v0.58.0 - give the blind AI developer eyes (no frontend, proof in your IDE)

START HERE:
  npx deep-era start             Install, wire up, and audit this project in ONE command.
                                 Prints the real bugs in your code immediately.
  npx deep-era prompt            The ONE paste that makes any AI agent route, remember,
                                 verify and refuse. This is the highest-leverage command.

Usage:
  deep-era start [dir]           Install + audit + show findings (start here)
  deep-era prompt [--raw]        The one paste for your AI agent (--raw = no commentary)
  deep-era guide "<task>"        PRE-FLIGHT: where to work, what not to touch, locked decisions
  deep-era onboard               One shot: init + setup-ide + CI + skill
  deep-era global                Machine setup: wire MCP into 6 IDEs + skill, once per PC
  deep-era ide [name]            ONE command: detect IDEs, wire MCP into project, print end-to-end brief
  deep-era ide [name]            ONE command: detect IDEs, wire MCP into project, print end-to-end brief
  deep-era init [dir]            Install into a project (map + AGENTS.md + rules)
  deep-era doctor [dir]          Full scan + tests + guard + deps + ERROR-REPORT.md
  deep-era check                 1-COMMAND AUDIT: tests+security+guard+deps in 30s
  deep-era heal                  End-to-end: snapshot + safe-fix + re-check
  deep-era review                Audit ONLY changed files (git diff scope)
  deep-era demo                  Self-proof: catch planted bugs live
  deep-era receipt               ONE-file proof of the last session
  deep-era status                Whole platform state, one screen
  deep-era recall <query>        Project memory: recall past chats/decisions
  deep-era remember <k> <txt>    Project memory: save (k=chat|decision|fix|error|note)
  deep-era remember --global <txt>  Lesson for ALL projects (recalled everywhere)
  deep-era projects [dir]        All deep-era projects + health, one screen
  deep-era context <query>       Token saver: show only relevant files
  deep-era search <query>        Ranked code search (names + content + hubs)
  deep-era fix                   SAFE auto-fix (snapshot+gitignore+map) - never touches logic
  deep-era setup-ide [dir]       MCP configs for 25+ clients (.deep-era/ide/)
  deep-era snapshot [label]      Take a backup (restore if broken)
  deep-era snapshots             List backups
  deep-era prune                 Keep newest 5 snapshots, delete the rot
  deep-era diff <id>           What changed since snapshot <id>
  deep-era restore <id>        Restore a snapshot
  deep-era rules               Show the checklist pack for this project's stack
  deep-era graph               ARCHITECTURE.md from real imports (Mermaid)
  deep-era timeline            Project history from logs (one screen)
  deep-era costs               AI spend so far (tokens + $ estimate)
  deep-era memory              Memory stats: entries by kind + top terms
  deep-era skill               SKILL pack (8 installable skills)
  deep-era skill --add <git>   Install any standard skills repo (validated)
  deep-era ci                  Create GitHub Action gate (runs check on every PR)
  deep-era hook                Install git pre-commit hook running check (blocks bad commits)
  deep-era watch               Re-run check on every file change
  deep-era perf [dir]          Engine speed table (ms)
  deep-era links               Check all URLs in docs/code (online best-effort)
  deep-era browser             Playwright MCP bridge for browser-driven verify
  deep-era sbom                CycloneDX SBOM of direct deps (.deep-era/sbom.json)
  deep-era update [--apply]    Check github:aureonagios/deep-era for a newer release (--apply installs it)
  deep-era serve               Run the project, probe it, observe, shut down
  deep-era fetch <url>         Fetch a docs URL to text (stdlib, capped)
  deep-era research <query>    Instant-answer research (best-effort, honest)
  deep-era ui [port]           Live Autonomous Command Center & Web Dashboard
  deep-era skills [query]      Search the 410 Autonomous Agent Skills vault
  deep-era hunt [port]         Port hunter & socket conflict resolver
  deep-era guard               Secret Guardian: scan for leaked keys & tokens
  deep-era docker [port]       Generate multi-stage production Docker scaffold
  deep-era memory-bank [add]   Structured persistent project memory bank
  deep-era memory-bank status  Is the bank encrypted at rest?
  deep-era memory-bank encrypt Encrypt an existing plaintext bank (needs DEEP_ERA_KEY)
  deep-era mcp                 MCP server (stdio) - 16 tools
`);
    return;
  }
  if (cmd === "--version" || cmd === "-v" || cmd === "version") {
    // Agents check versions this way. No --version flag existed, so every agent
    // asking "is this install fresh?" got "Unknown command" instead of an answer.
    console.log(require("../package.json").version);
    return;
  }
  if (cmd === "init") {
    const { runInit } = require("../src/init");
    await runInit(targetDir);
    return;
  }
  if (cmd === "doctor") {
    const { runDoctor } = require("../src/doctor");
    await runDoctor(targetDir);
    return;
  }
  if (cmd === "check") {
    // ONE COMMAND: audit any AI's work in 30 seconds — inside your own IDE.
    // --hook-mode (git pre-commit): offline-lite, no network calls, still strict.
    if (process.argv.includes("--hook-mode")) process.env.DEEP_ERA_OFFLINE = "1";
    const cwd0 = process.cwd();
    const { buildMap } = require("../src/map");
    const { verifyProject } = require("../src/verify");
    const { securityScan } = require("../src/security");
    const { guardScan } = require("../src/guard");
    const { auditDeps, auditOsv, auditLicenses } = require("../src/deps");
    const { readJson } = require("../src/logger");
    let map = readJson(cwd0, "map.json", null);
    if (!map) map = buildMap(cwd0);
    const v = verifyProject(cwd0, map);
    const s = securityScan(cwd0, map.files);
    const g = guardScan(cwd0, map.files);
    const d = [...auditDeps(cwd0), ...(await Promise.resolve(auditOsv(cwd0)).catch(() => [])), ...(await Promise.resolve(auditLicenses(cwd0)).catch(() => []))];
    const { auditLinks } = require("../src/links");
    const li = await Promise.resolve(auditLinks(cwd0, map.files)).catch(() => []);
    const vf = v.filter((x) => !x.ok).length;
    const bad = [...s, ...g, ...d].filter((x) => x.sev === "critical" || x.sev === "high").length;
    if (process.argv.includes("--json")) {
      console.log(JSON.stringify({ result: vf || bad ? "FAIL" : "PASS", verifyPass: v.length - vf, verifyTotal: v.length, security: s.length, guard: g.length, deps: d.length, links: li.length }));
      if (vf || bad) process.exitCode = 1;
      return;
    }
    console.log(`[deep-era check] verify: ${v.length - vf}/${v.length} pass | security: ${s.length} | guard: ${g.length} | deps: ${d.length} | links: ${li.length}${map.counts.truncated ? " | map TRUNCATED (see .deep-eraignore)" : ""}`);
    try {
      const { spendReport } = require("../src/spend");
      const sp = spendReport(cwd0);
      console.log(`[deep-era check] AI spend so far: ${sp.tokens.toLocaleString()} tokens (~${Object.values(sp.estimate)[1]} at standard rate)`);
    } catch {}
    v.filter((x) => !x.ok).forEach((x) => console.log(`  ! FAIL ${x.cmd}\n${(x.output || "").slice(0, 600)}`));
    [...g, ...s, ...d, ...li].slice(0, 12).forEach((x) => console.log(`  ! [${x.sev}] ${x.file}: ${x.msg}`));
    if (vf || bad) { console.log(`RESULT: FAIL — do not accept the AI's work. Open ERROR-REPORT.md.`); process.exitCode = 1; }
    else console.log(`RESULT: PASS — work is clean.`);
    // Staleness notice: cache-only here, so the gate never touches the network.
    // (Live refresh happens in `start` and `update`.) Skipped for machine output.
    if (!process.argv.includes("--hook-mode")) {
      try {
        const { stalenessNotice } = require("../src/selfupdate");
        const note = await stalenessNotice(undefined, 0, true);
        if (note) console.log(`[deep-era] ${note}`);
      } catch {}
    }
    return;
  }
  if (cmd === "fix") {
    const { safeFix } = require("../src/fix");
    const actions = await safeFix(process.cwd());
    console.log(`[deep-era] fix done:`);
    actions.forEach((a) => console.log(`  - ${a}`));
    console.log(`Next: deep-era doctor`);
    return;
  }
  if (cmd === "setup-ide") {
    const { runSetupIde } = require("../src/setupIde");
    runSetupIde(targetDir);
    return;
  }
  if (cmd === "context") {
    const query = process.argv.slice(3).join(" ");
    const cwd0 = process.cwd();
    const { buildMap } = require("../src/map");
    const { getRelevant, readSnippets } = require("../src/context");
    const { readJson } = require("../src/logger");
    let map = readJson(cwd0, "map.json", null);
    if (!map) map = buildMap(cwd0);
    const rel = getRelevant(cwd0, map, query, 8);
    const pack = readSnippets(cwd0, rel);
    console.log(`[deep-era] context "${query}" -> ${rel.length} files, ${pack.chars} chars (no full scan, tokens saved)`);
    rel.forEach((r) => console.log(`  - ${r.file} (${(r.imports || []).length} imports, ${((r.importedBy || []).length)} used-by)`));
    return;
  }
  if (cmd === "guide") {
    // The pre-flight briefing: where to look, what not to touch, what this project
    // already decided. Run this BEFORE letting an agent start editing.
    const task = process.argv.slice(3).join(" ");
    const cwd0 = process.cwd();
    const { buildMap } = require("../src/map");
    const { buildBrief } = require("../src/guidance");
    const { readJson } = require("../src/logger");
    const { logStep } = require("../src/logger");
    let map = readJson(cwd0, "map.json", null);
    if (!map) map = buildMap(cwd0);
    if (!task) {
      console.log('[deep-era] guide: say what you are about to do. Example:\n  deep-era guide "add rate limiting to the mcp server"');
      process.exitCode = 1;
      return;
    }
    const b = buildBrief(cwd0, map, task);
    console.log(b.brief);
    logStep(cwd0, `guide [${b.taskClass}/${b.confidence}]: ${task.slice(0, 80)} -> ${b.likelyTouch.map((x) => x.file).join(", ") || "no match"}`);
    if (b.taskClass === "unknown" || b.likelyTouch.length === 0) process.exitCode = 1;
    return;
  }
  if (cmd === "search") {
    const query = process.argv.slice(3).join(" ");
    const cwd0 = process.cwd();
    const { buildMap } = require("../src/map");
    const { getRelevant } = require("../src/context");
    const { readJson } = require("../src/logger");
    const fs2 = require("fs");
    const path2 = require("path");
    let map = readJson(cwd0, "map.json", null);
    if (!map) map = buildMap(cwd0);
    const rel = getRelevant(cwd0, map, query, 12);
    // Content hits: rank files containing query tokens in code (not just names).
    const toks = query.toLowerCase().split(/[^a-z0-9_./-]+/).filter((t) => t.length > 2);
    const scored = rel.map((f) => {
      let hits = 0;
      try {
        const txt = fs2.readFileSync(path2.join(cwd0, f.file), "utf8").slice(0, 20000).toLowerCase();
        for (const t of toks) if (txt.includes(t)) hits++;
      } catch {}
      return { f, hits };
    }).sort((a, b) => b.hits - a.hits);
    console.log(`[deep-era] search "${query}" -> top ${scored.length}:`);
    scored.forEach(({ f, hits }) => console.log(`  ${hits > 0 ? "*" : "-"} ${f.file} (${hits} content hits, used by ${(f.importedBy || []).length})`));
    return;
  }
  if (cmd === "recall") {
    const { recall } = require("../src/memory");
    const r = recall(process.cwd(), process.argv.slice(3).join(" "));
    console.log(`[deep-era] memory: ${r.entries.length}/${r.total} entries, ${r.chars} chars (budget 4000)`);
    r.entries.forEach((e) => console.log(`  [${e.at.slice(0, 16)}|${e.kind}] ${e.text.slice(0, 160)}`));
    return;
  }
  if (cmd === "graph") {
    const { runGraph } = require("../src/graph");
    runGraph(process.cwd(), {
      full: process.argv.includes("--full"),
      for: (() => { const i = process.argv.indexOf("--for"); return i >= 0 ? process.argv[i + 1] : null; })(),
    });
    return;
  }
  if (cmd === "timeline") {
    const { runTimeline } = require("../src/timeline");
    const lines = runTimeline(process.cwd());
    if (process.argv.includes("--json")) console.log(JSON.stringify(lines));
    return;
  }
  if (cmd === "memory") {
    const sub = process.argv[3];
    if (sub === "export") {
      const { exportMemory } = require("../src/memory");
      console.log(`[deep-era] memory exported: ${exportMemory(process.cwd(), process.argv[4])}`);
      return;
    }
    if (sub === "import") {
      const { importMemory } = require("../src/memory");
      if (!process.argv[4]) { console.error("Usage: deep-era memory import <file>"); process.exit(1); }
      const r = importMemory(process.cwd(), process.argv[4]);
      console.log(`[deep-era] memory imported: ${r.added} new, ${r.skipped} duplicates skipped`);
      return;
    }
    const { readAll, readLessons } = require("../src/memory");
    const all = readAll(process.cwd());
    const lessons = readLessons();
    const byKind = {};
    const freq = {};
    for (const e of all) {
      byKind[e.kind] = (byKind[e.kind] || 0) + 1;
      for (const t of ((e.text || "").toLowerCase().match(/[a-z]{4,}/g) || [])) {
        if (!["that", "this", "with", "from", "have", "will", "what", "when"].includes(t)) freq[t] = (freq[t] || 0) + 1;
      }
    }
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 8);
    console.log(`[deep-era] memory: ${all.length} local entries, ${lessons.length} global lessons`);
    for (const [k, n] of Object.entries(byKind)) console.log(`  - ${k}: ${n}`);
    console.log(`  top terms: ${top.map(([t, n]) => `${t}(${n})`).join(", ") || "-"}`);
    return;
  }
  if (cmd === "costs") {
    const { spendReport } = require("../src/spend");
    const r = spendReport(process.cwd());
    console.log(`[deep-era] AI spend: ${r.calls} calls, ${r.chars.toLocaleString()} chars ≈ ${r.tokens.toLocaleString()} tokens`);
    for (const [t, c] of Object.entries(r.byTool)) console.log(`  - ${t}: ${c.toLocaleString()} chars`);
    for (const [tier, v] of Object.entries(r.estimate)) console.log(`  = ${v} at ${tier}`);
    console.log(`Note: ${r.note}`);
    return;
  }
  if (cmd === "heal") {
    // End-to-end healing loop: backup → safe fixes → verify → before/after proof.
    const cwd0 = process.cwd();
    const { createSnapshot } = require("../src/snapshot");
    const { safeFix } = require("../src/fix");
    const { buildMap } = require("../src/map");
    const { verifyProject } = require("../src/verify");
    const { securityScan } = require("../src/security");
    const { guardScan } = require("../src/guard");
    const { auditDeps } = require("../src/deps");
    const { readJson } = require("../src/logger");
    const count = (cwd) => {
      let map = readJson(cwd, "map.json", null);
      if (!map) map = buildMap(cwd);
      const bad = [...securityScan(cwd, map.files), ...guardScan(cwd, map.files), ...auditDeps(cwd)]
        .filter((x) => x.sev === "critical" || x.sev === "high").length;
      const vf = verifyProject(cwd, map).filter((x) => !x.ok).length;
      return vf + bad;
    };
    const before = count(cwd0);
    const snap = createSnapshot(cwd0, "pre-heal");
    console.log(`[deep-era] heal: snapshot ${snap.id}, ${before} issues before`);
    const actions = await safeFix(cwd0);
    actions.forEach((a) => console.log(`  - ${a}`));
    const { runDoctor } = require("../src/doctor");
    await runDoctor(cwd0);
    const after = count(cwd0);
    console.log(`[deep-era] heal: ${before} → ${after} issues. ${after === 0 ? "HEALED." : "Remaining need code fixes (see ERROR-REPORT.md). Snapshot restores if needed: " + snap.id}`);
    return;
  }
  if (cmd === "review") {
    const { runReview } = require("../src/review");
    runReview(process.cwd());
    return;
  }
  if (cmd === "receipt") {
    const { runReceipt } = require("../src/receipt");
    runReceipt(process.cwd());
    return;
  }
  if (cmd === "status") {
    const { runStatus } = require("../src/receipt");
    runStatus(process.cwd());
    return;
  }
  if (cmd === "demo") {
    const { runDemo } = require("../src/demo");
    await runDemo();
    return;
  }
  if (cmd === "rules") {    const { buildMap } = require("../src/map");
    const { renderPack } = require("../src/stacks");
    const { readJson } = require("../src/logger");
    let map = readJson(process.cwd(), "map.json", null);
    if (!map) map = buildMap(process.cwd());
    console.log(renderPack(map.stack.kind));
    return;
  }
  if (cmd === "projects") {
    const { runProjects } = require("../src/projects");
    runProjects(targetDir);
    return;
  }
  if (cmd === "remember") {
    if (process.argv[3] === "--global") {
      const { rememberGlobal } = require("../src/memory");
      const e = rememberGlobal(process.argv.slice(4).join(" "));
      console.log(`[deep-era] lesson saved globally (every project will recall it)`);
      return;
    }
    const { remember } = require("../src/memory");
    const kind = process.argv[3] || "note";
    const text = process.argv.slice(4).join(" ");
    if (!text) { console.error("Usage: deep-era remember <chat|decision|fix|error|note> <text>"); process.exit(1); }
    const e = remember(process.cwd(), kind, text);
    console.log(`[deep-era] remembered [${e.kind}]: ${e.text.slice(0, 160)}`);
    return;
  }
  if (cmd === "global") {
    const { runGlobal } = require("../src/global");
    runGlobal();
    return;
  }
  if (cmd === "ide") {
    // ONE command: detect installed IDEs, wire MCP into the project, print the
    // end-to-end brief. `deep-era ide [name]` narrows to one client.
    // Operates on the current project (like guide/context), not targetDir — the
    // first argument is the IDE name, so it must not be mistaken for a path.
    const { runIde } = require("../src/ide");
    const name = process.argv[3] && !process.argv[3].startsWith("-") ? process.argv[3] : null;
    runIde(process.cwd(), { name });
    return;
  }
  if (cmd === "prompt") {
    // The one paste that turns a generic agent into one that routes, remembers,
    // verifies and refuses. Printed rather than hidden in a file so it can be piped
    // straight into a clipboard or a chat box.
    const fs2 = require("fs");
    const path2 = require("path");
    const candidates = [
      path2.join(targetDir, "PROMPT.md"),
      path2.join(__dirname, "..", "PROMPT.md"),
    ];
    let file = null;
    for (const c of candidates) { if (fs2.existsSync(c)) { file = c; break; } }
    if (!file) {
      console.error("[deep-era] prompt: PROMPT.md not found (looked in the project and in the package).");
      process.exitCode = 1;
      return;
    }
    const raw = fs2.readFileSync(file, "utf8");
    // `--raw` strips the fence and the surrounding prose so it can be piped into an
    // agent verbatim. Default output is the whole file, which is what a human reads.
    if (process.argv.includes("--raw")) {
      const m = raw.match(/```\n([\s\S]*?)\n```/);
      process.stdout.write((m ? m[1] : raw) + "\n");
    } else {
      process.stdout.write(raw + "\n");
    }
    console.error(`\n[deep-era] prompt: ${file} — paste the boxed text into your agent.`);
    console.error(`[deep-era] for a clean copy with no commentary: deep-era prompt --raw`);
    return;
  }
  if (cmd === "start" || cmd === "try") {
    // THE CONVERSION MOMENT. A new user should not have to read the README to get
    // value: install, wire up, audit, and print the findings in one command. If this
    // prints real bugs on their code in under a second, they stay. If it prints
    // nothing, they leave — so it must never overstate what it found.
    const { runInit } = require("../src/init");
    const { runSetupIde } = require("../src/setupIde");
    const { runCi } = require("../src/ci");
    console.log("[deep-era] setting up (rules + IDE wiring + CI gate)...");
    await runInit(targetDir);
    runSetupIde(targetDir);
    runCi(targetDir);
    try {
      // One command sets up everything: wire detected IDEs into the project too,
      // so the agent's editor speaks MCP without a manual copy-paste round.
      const { runIde } = require("../src/ide");
      runIde(targetDir, {});
    } catch {}
    console.log("");
    console.log("[deep-era] auditing your project now...");
    console.log("");
    const { buildMap } = require("../src/map");
    const { securityScan } = require("../src/security");
    const { guardScan } = require("../src/guard");
    const { semanticScan } = require("../src/semantics");
    const { slopScan } = require("../src/slop");
    const { verifyProject } = require("../src/verify");
    const map = buildMap(targetDir);
    const verify = verifyProject(targetDir, map);
    const findings = [
      ...securityScan(targetDir, map.files),
      ...guardScan(targetDir, map.files),
      ...semanticScan(targetDir, map.files),
      ...slopScan(targetDir, map.files),
    ];
    const vf = verify.filter((v) => !v.ok).length;
    const bySev = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const f of findings) if (bySev[f.sev] !== undefined) bySev[f.sev]++;
    const real = bySev.critical + bySev.high;

    console.log(`Scanned ${map.counts.total} files in your project.`);
    console.log(`  ${bySev.critical} critical   ${bySev.high} high   ${bySev.medium} medium   ${bySev.low} low`);
    console.log("");
    if (findings.length) {
      console.log("Here is what a blind AI developer would have shipped:");
      for (const f of findings.slice(0, 12)) {
        console.log(`  [${f.sev}] ${f.file}${f.line ? ":" + f.line : ""} — ${f.msg.slice(0, 90)}`);
      }
      if (findings.length > 12) console.log(`  ...and ${findings.length - 12} more (run \`deep-era doctor\` for all)`);
      console.log("");
    }
    if (real > 0) {
      console.log(`${real} of these are serious. Any AI agent working on this project should be told:`);
      console.log('  "Read AGENTS.md in this project and obey it fully."');
      console.log("");
    } else if (findings.length > 0) {
      console.log("No critical or high findings. Worth wiring into CI anyway — it costs ~0.4s.");
      console.log("");
    } else {
      console.log("Nothing found. Either your code is clean, or deep-era does not see this");
      console.log("stack yet. Be suspicious of a clean bill of health from any tool, including this one.");
      console.log("");
    }
    console.log("Next:");
    console.log('  deep-era guide "<what you are about to build>"   tell your agent where to work');
    console.log("  deep-era check                                one-command audit from now on");
    console.log("  deep-era doctor                               full report with fixes");
    console.log("  deep-era prompt --raw                         the one paste for your AI agent");
    try {
      const { stalenessNotice } = require("../src/selfupdate");
      const note = await stalenessNotice();
      if (note) console.log(`[deep-era] ${note}`);
    } catch {}
    return;
  }
  if (cmd === "onboard") {
    const { runInit } = require("../src/init");
    const { runSetupIde } = require("../src/setupIde");
    const { runCi } = require("../src/ci");
    const { runSkill } = require("../src/skill");
    const cwd0 = process.cwd();
    await runInit(cwd0);
    runSetupIde(cwd0);
    runCi(cwd0);
    runSkill(cwd0);
    console.log(`[deep-era] onboard done: rules + 25 IDEs + CI gate + skill.`);
    console.log(`Next: give any AI the 1-prompt from README, then run: deep-era check`);
    return;
  }
  if (cmd === "hook") {
    const { runHook } = require("../src/hook");
    runHook(process.cwd(), path.join(__dirname, "cli.js"));
    return;
  }
  if (cmd === "ci") {
    const { runCi } = require("../src/ci");
    runCi(process.cwd());
    return;
  }
  if (cmd === "fetch") {
    const url = process.argv[3];
    if (!url) { console.error("Usage: deep-era fetch <url>"); process.exit(1); }
    const { fetchText } = require("../src/net");
    const fs3 = require("fs");
    const path3 = require("path");
    const r = await fetchText(url);
    if (!r.ok) { console.log(`[deep-era] fetch failed: ${r.error}`); process.exitCode = 1; return; }
    const dir = path3.join(process.cwd(), ".deep-era", "research");
    fs3.mkdirSync(dir, { recursive: true });
    const slug = url.replace(/[^a-z0-9]+/gi, "-").slice(0, 60) + ".md";
    fs3.writeFileSync(path3.join(dir, slug), `# Fetched: ${url}\n\n${r.text}\n`);
    console.log(`[deep-era] fetched ${r.text.length} chars -> .deep-era/research/${slug}`);
    return;
  }
  if (cmd === "research") {
    const q = process.argv.slice(3).join(" ");
    if (!q) { console.error("Usage: deep-era research <query>"); process.exit(1); }
    const { instantAnswer } = require("../src/net");
    const r = await instantAnswer(q);
    if (!r.ok) { console.log(`[deep-era] research: ${r.error}`); return; }
    console.log(`[deep-era] research (${r.source}):\n${r.text}`);
    return;
  }
  if (cmd === "serve") {
    const { runServe } = require("../src/serve");
    await runServe(process.cwd());
    return;
  }
  if (cmd === "update") {
    // Source of truth is the GitHub repo (the package was never published to npm,
    // so the old registry check 404'd forever). Default = check and report.
    // --apply = reinstall the global package. Nothing installs silently, ever.
    const { runUpdate } = require("../src/selfupdate");
    await runUpdate({ apply: process.argv.includes("--apply") });
    return;
  }
  if (cmd === "sbom") {
    const { runSbom } = require("../src/sbom");
    runSbom(process.cwd());
    return;
  }
  if (cmd === "browser") {
    const { runBrowser } = require("../src/browser");
    runBrowser(process.cwd());
    return;
  }
  if (cmd === "links") {
    const { buildMap } = require("../src/map");
    const { auditLinks } = require("../src/links");
    const { readJson } = require("../src/logger");
    let lmap = readJson(process.cwd(), "map.json", null);
    if (!lmap) lmap = buildMap(process.cwd());
    const found = await auditLinks(process.cwd(), lmap.files);
    if (!found.length) console.log("[deep-era] links: all clean (or offline — re-run online).");
    found.forEach((x) => console.log(`  ! [${x.sev}] ${x.file}: ${x.msg}`));
    return;
  }
if (cmd === "perf") {
    process.env.DEEP_ERA_SELFTEST = "1"; // engine speed only - no nested test-suite run
    const { buildMap } = require("../src/map");
    const { guardScan } = require("../src/guard");
    const { securityScan } = require("../src/security");
    const { verifyProject } = require("../src/verify");
    const { getRelevant, readSnippets } = require("../src/context");
    const T = (fn) => { const t = process.hrtime.bigint(); const o = fn(); return { ms: Number(process.hrtime.bigint() - t) / 1e6, o }; };
    const m = T(() => buildMap(targetDir)); const map = m.o;
    const g = T(() => guardScan(targetDir, map.files));
    const s = T(() => securityScan(targetDir, map.files));
    const v = T(() => verifyProject(targetDir, map));
    const rel = getRelevant(targetDir, map, process.argv[4] || "main", 8);
    const c = T(() => readSnippets(targetDir, rel));
    console.log(`[deep-era perf] ${targetDir} (${map.counts.total} files)`);
    for (const [n, r] of [["map", m], ["guard+dup", g], ["security", s], ["verify", v], ["context", c]]) {
      console.log(`${r.ms.toFixed(1).padStart(9)} ms  ${n}`);
    }
    return;
  }
  if (cmd === "skill") {
    if (process.argv[3] === "--add" && process.argv[4]) {
      const { addSkill } = require("../src/skill");
      addSkill(process.cwd(), process.argv[4]);
      return;
    }
    if (process.argv[3] && !process.argv[3].startsWith("-")) {
      const { getSkill } = require("../src/skills");
      const s = getSkill(process.argv[3], targetDir);
      if (s) {
        console.log(`\n=== SKILL: ${s.name || s.id} [${s.category}] ===\n`);
        console.log(s.content || s.description);
        return;
      }
    }
    const { runSkill } = require("../src/skill");
    runSkill(process.cwd());
    return;
  }
  if (cmd === "snapshots") {
    const { listSnapshots } = require("../src/snapshot");
    const ids = listSnapshots(process.cwd());
    console.log(`[deep-era] snapshots (${ids.length}):`);
    ids.forEach((id) => console.log(`  - ${id}`));
    return;
  }
  if (cmd === "diff") {
    const { diffSnapshot } = require("../src/snapshot");
    const id = process.argv[3];
    if (!id) { console.error("Usage: deep-era diff <snapshot-id>"); process.exit(1); }
    const d = diffSnapshot(process.cwd(), id);
    console.log(`[deep-era] diff vs ${id}: +${d.added.length} added, -${d.removed.length} removed, ~${d.modified.length} modified`);
    [...d.added.map((f) => `  + ${f}`), ...d.removed.map((f) => `  - ${f}`), ...d.modified.map((f) => `  ~ ${f}`)].slice(0, 30).forEach((l) => console.log(l));
    return;
  }
  if (cmd === "watch") {
    const { execSync } = require("child_process");
    console.log(`[deep-era] watching ${process.cwd()} — Ctrl+C to stop`);
    let busy = false, queued = false;
    const run = () => {
      if (busy) { queued = true; return; }
      busy = true;
      try { execSync("node bin/cli.js check", { cwd: process.cwd(), stdio: "inherit" }); }
      catch { /* check already printed FAIL */ }
      busy = false;
      if (queued) { queued = false; run(); }
    };
    let timer = null;
    fs.watch(process.cwd(), { recursive: true }, (ev, file) => {
      if (!file || file.includes(".deep-era") || file.includes("node_modules") || file.includes(".git")) return;
      clearTimeout(timer);
      timer = setTimeout(() => { console.log(`\n[deep-era] change: ${file}`); run(); }, 800);
    });
    run();
    return;
  }
  if (cmd === "prune") {
    const { pruneSnapshots } = require("../src/snapshot");
    const r = pruneSnapshots(process.cwd());
    console.log(`[deep-era] prune: kept ${r.kept}, dropped ${r.dropped} old snapshots`);
    return;
  }
  if (cmd === "snapshot") {
    const { createSnapshot } = require("../src/snapshot");
    const s = createSnapshot(process.cwd(), process.argv[3] || "manual");
    console.log(`[deep-era] snapshot ${s.id} (${s.files} files)`);
    return;
  }
  if (cmd === "restore") {
    const { restoreSnapshot } = require("../src/snapshot");
    const id = process.argv[3];
    if (!id) { console.error("Usage: deep-era restore <id>"); process.exit(1); }
    const r = restoreSnapshot(process.cwd(), id);
    console.log(`[deep-era] restored ${r.restored} files from ${r.id}`);
    return;
  }
  if (cmd === "hunt") {
    const { scanCommonPorts, isPortAvailable, findAvailablePort, getProcessOnPort, killProcessOnPort } = require("../src/hunt");
    const pArg = process.argv[3];
    if (pArg) {
      const port = parseInt(pArg, 10);
      if (process.argv[4] === "--kill") {
        const k = killProcessOnPort(port);
        console.log(`[deep-era hunt] kill port ${port}:`, k);
        return;
      }
      const avail = await isPortAvailable(port);
      const proc = !avail ? getProcessOnPort(port) : null;
      console.log(`[deep-era hunt] port ${port}: ${avail ? "AVAILABLE" : "OCCUPIED"}${proc ? ` (PID ${proc.pid})` : ""}`);
      return;
    }
    const ports = await scanCommonPorts();
    console.log(`[deep-era hunt] port scan:`);
    for (const p of ports) {
      console.log(`  ${p.port}: ${p.status}${p.pid ? ` (PID: ${p.pid})` : ""}`);
    }
    const nextFree = await findAvailablePort(3000);
    console.log(`\nNext recommended free port: ${nextFree}`);
    return;
  }
  if (cmd === "guard-secrets" || cmd === "guard") {
    const { scanDirectorySecrets } = require("../src/guardian");
    const findings = scanDirectorySecrets(targetDir);
    if (!findings.length) {
      console.log(`[deep-era guard] 100% CLEAN — zero leaked secrets found.`);
    } else {
      console.log(`[deep-era guard] FOUND ${findings.length} POTENTIAL SECRETS:`);
      for (const f of findings) {
        console.log(`  ! [${f.sev.toUpperCase()}] ${f.file}:${f.line}:${f.col} -> ${f.name} (${f.snippet})`);
      }
      if (findings.some((f) => f.sev === "critical")) process.exitCode = 1;
    }
    return;
  }
  if (cmd === "docker") {
    const { writeDockerFiles } = require("../src/docker");
    const port = parseInt(process.argv[3], 10) || 3000;
    const r = writeDockerFiles(process.cwd(), port);
    console.log(`[deep-era docker] Generated production Docker scaffold for ${r.stack.toUpperCase()}:`);
    for (const f of r.files) console.log(`  + ${f}`);
    return;
  }
  if (cmd === "memory-bank" || cmd === "mb") {
    const { searchMemories, addMemory, exportMarkdown, deleteMemory, bankSecurityStatus, migrateToEncrypted } = require("../src/memorybank");
    const sub = process.argv[3];
    if (sub === "status") {
      const s = bankSecurityStatus(process.cwd());
      console.log(`[deep-era memory-bank] storage: ${s.state}`);
      console.log(`  encrypted at rest: ${s.encrypted ? "yes (AES-256-GCM)" : "no"}`);
      console.log(`  key available:      ${s.hasKey ? "yes (DEEP_ERA_KEY)" : "no"}`);
      console.log(`  ${s.advice}`);
      return;
    }
    if (sub === "encrypt" || sub === "migrate") {
      const r = migrateToEncrypted(process.cwd());
      if (r.migrated) {
        console.log(`[deep-era memory-bank] encrypted ${r.entries} entries as AES-256-GCM.`);
        console.log(`  Keep DEEP_ERA_KEY set or this data becomes unreadable.`);
      } else {
        console.log(`[deep-era memory-bank] not migrated: ${r.reason}`);
      }
      return;
    }
    if (sub === "add") {
      const kind = process.argv[4] || "decision";
      const title = process.argv[5] || "Note";
      const content = process.argv.slice(6).join(" ") || "";
      const item = addMemory({ kind, title, content, tags: [kind] }, process.cwd());
      console.log(`[deep-era memory-bank] saved ${item.id} [${item.kind}]: ${item.title}`);
      return;
    }
    if (sub === "export") {
      console.log(exportMarkdown(process.cwd()));
      return;
    }
    if (sub === "del") {
      const id = process.argv[4];
      const ok = deleteMemory(id, process.cwd());
      console.log(`[deep-era memory-bank] delete ${id}: ${ok ? "OK" : "NOT FOUND"}`);
      return;
    }
    const q = process.argv[3] || "";
    const results = searchMemories(q, null, process.cwd());
    console.log(`[deep-era memory-bank] ${results.length} memories:`);
    for (const m of results) {
      console.log(`  - [${m.kind}] ${m.title} (${m.id})`);
      if (m.content) console.log(`    ${m.content.slice(0, 100)}`);
    }
    return;
  }
  if (cmd === "skills") {
    const { searchSkills, listCategories, getCatalog, clearCatalogCache } = require("../src/skills");
    const q = process.argv.slice(3).join(" ");
    if (process.argv.includes("--reindex")) {
      clearCatalogCache();
      const { reindexSkills } = require("../src/skillindex");
      const r = reindexSkills(process.cwd());
      console.log(`[deep-era skills] reindexed: ${r.indexed} skills -> ${r.catalogPath}`);
      if (r.rejected.length) {
        console.log(`  rejected ${r.rejected.length} (showing 5):`);
        for (const x of r.rejected.slice(0, 5)) console.log(`  - ${x.dir}: ${x.error}`);
      }
      return;
    }
    if (!q) {
      const cat = getCatalog(process.cwd());
      const categories = listCategories(process.cwd());
      console.log(`[deep-era skills] ${cat.skills.length} skills indexed (${Object.keys(categories).length} categories):`);
      for (const [k, count] of Object.entries(categories)) {
        console.log(`  - ${k.padEnd(16)} : ${count} skills`);
      }
      console.log(`\nUsage: deep-era skills <query>   (e.g. deep-era skills docker)`);
      console.log(`       deep-era skill <name>     (e.g. deep-era skill tailwind-design-system)`);
      console.log(`       deep-era skills --reindex (rebuild index from installed skills)`);
      console.log(`       deep-era skills --audit   (coverage: orphans, missing triggers, duplicates)`);
      return;
    }
    if (process.argv.includes("--audit")) {
      const { auditCatalog } = require("../src/skillindex");
      const a = auditCatalog(process.cwd());
      console.log(`[deep-era skills] audit: ${a.total} skills, ${a.orphans.length} orphans (top-${a.topN} self-retrieval), ${a.withoutTriggers.length} without triggers, ${a.duplicates.length} duplicate ids.`);
      if (a.withoutTriggers.length) console.log(`  no triggers (${a.withoutTriggers.length}, showing 5): ${a.withoutTriggers.slice(0, 5).join(", ")}`);
      if (a.duplicates.length) console.log(`  duplicates (${a.duplicates.length}, showing 5): ${a.duplicates.slice(0, 5).join(", ")}`);
      if (a.emptyDescription.length) console.log(`  empty description (${a.emptyDescription.length}, showing 5): ${a.emptyDescription.slice(0, 5).join(", ")}`);
      if (a.orphans.length) {
        console.log(`  orphans (${a.orphans.length}, showing 8) — no task query surfaces these:`);
        for (const x of a.orphans.slice(0, 8)) console.log(`  - ${x.id}  (tried: "${x.query}")`);
      } else {
        console.log(`  every skill is reachable by its own keywords.`);
      }
      return;
    }
    const results = searchSkills(q, 15, process.cwd());
    console.log(`[deep-era skills] search "${q}" (${results.length} matches):`);
    for (const s of results) {
      console.log(`  * ${s.id.padEnd(35)} [${s.category}] - ${s.description.slice(0, 80)}...`);
    }
    return;
  }
  if (cmd === "ui" || cmd === "dashboard") {
    const { startDashboardServer } = require("../src/dashboard");
    const portPref = parseInt(process.argv[3], 10) || 8300;
    const { port, url } = await startDashboardServer(process.cwd(), portPref);
    console.log(`\n[deep-era dashboard] 🚀 Autonomous Command Center running at:`);
    console.log(`  --> ${url}`);
    console.log(`  (Press Ctrl+C to stop)\n`);
    return new Promise(() => {});
  }
  if (cmd === "mcp") {
    const { runMcp } = require("../mcp/server");
    await runMcp();
    return;
  }
  console.error(`Unknown command: ${cmd}. Run: deep-era help`);
  process.exit(1);
}

main().catch((e) => {
  console.error("[deep-era] FATAL:", e && e.message ? e.message : e);
  process.exit(1);
});
