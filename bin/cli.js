#!/usr/bin/env node
// Deep-Era CLI. User may speak any language — all code and output is ENGLISH ONLY.
const fs = require("fs");
const path = require("path");

const cmd = process.argv[2];
const targetDir = process.argv[3] && !process.argv[3].startsWith("-") ? path.resolve(process.argv[3]) : process.cwd();

async function main() {
  if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") {
    console.log(`
AI Deep Era v0.43.0 - give the blind AI developer eyes (no frontend, proof in your IDE)

Usage:
  deep-era onboard             One shot: init + setup-ide + CI + skill
  deep-era global              Machine setup: wire MCP into 6 IDEs + skill, once per PC
  deep-era init [dir]          Install into a project (map + AGENTS.md + rules)
  deep-era doctor [dir]        Full scan + tests + guard + deps + ERROR-REPORT.md
  deep-era check               1-COMMAND AUDIT: tests+security+guard+deps in 30s
  deep-era heal                End-to-end: snapshot + safe-fix + re-check
  deep-era review              Audit ONLY changed files (git diff scope)
  deep-era demo                Self-proof: catch planted bugs live
  deep-era recall <query>      Project memory: recall past chats/decisions
  deep-era remember <k> <txt>  Project memory: save (k=chat|decision|fix|error|note)
  deep-era remember --global <txt>  Lesson for ALL projects (recalled everywhere)
  deep-era projects [dir]      All deep-era projects + health, one screen
  deep-era context <query>     Token saver: show only relevant files
  deep-era search <query>      Ranked code search (names + content + hubs)
  deep-era fix                 SAFE auto-fix (snapshot+gitignore+map) — never touches logic
  deep-era setup-ide [dir]     MCP configs for 25+ clients (.deep-era/ide/)
  deep-era snapshot [label]    Take a backup (restore if broken)
  deep-era snapshots           List backups
  deep-era prune               Keep newest 5 snapshots, delete the rot
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
  deep-era browser             Playwright MCP bridge for browser-driven verify
  deep-era sbom                CycloneDX SBOM of direct deps (.deep-era/sbom.json)
  deep-era update              Check npm registry for a newer deep-era (best-effort)
  deep-era serve               Run the project, probe it, observe, shut down
  deep-era fetch <url>         Fetch a docs URL to text (stdlib, capped)
  deep-era research <query>    Instant-answer research (best-effort, honest)
  deep-era mcp                 MCP server (stdio) - 15 tools
`);
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
    const vf = v.filter((x) => !x.ok).length;
    const bad = [...s, ...g, ...d].filter((x) => x.sev === "critical" || x.sev === "high").length;
    if (process.argv.includes("--json")) {
      console.log(JSON.stringify({ result: vf || bad ? "FAIL" : "PASS", verifyPass: v.length - vf, verifyTotal: v.length, security: s.length, guard: g.length, deps: d.length }));
      if (vf || bad) process.exitCode = 1;
      return;
    }
    console.log(`[deep-era check] verify: ${v.length - vf}/${v.length} pass | security: ${s.length} | guard: ${g.length} | deps: ${d.length}${map.counts.truncated ? " | map TRUNCATED (see .deep-eraignore)" : ""}`);
    try {
      const { spendReport } = require("../src/spend");
      const sp = spendReport(cwd0);
      console.log(`[deep-era check] AI spend so far: ${sp.tokens.toLocaleString()} tokens (~${Object.values(sp.estimate)[1]} at standard rate)`);
    } catch {}
    v.filter((x) => !x.ok).forEach((x) => console.log(`  ! FAIL ${x.cmd}\n${(x.output || "").slice(0, 600)}`));
    [...g, ...s, ...d].slice(0, 12).forEach((x) => console.log(`  ! [${x.sev}] ${x.file}: ${x.msg}`));
    if (vf || bad) { console.log(`RESULT: FAIL — do not accept the AI's work. Open ERROR-REPORT.md.`); process.exitCode = 1; }
    else console.log(`RESULT: PASS — work is clean.`);
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
    const https = require("https");
    const { version } = require("../package.json");
    console.log(`[deep-era] installed: ${version}. Checking registry...`);
    const req = https.get("https://registry.npmjs.org/deep-era/latest", { timeout: 12000 }, (res) => {
      let body = "";
      res.on("data", (c) => { body += c; });
      res.on("end", () => {
        try {
          const latest = JSON.parse(body).version;
          if (latest === version) console.log(`[deep-era] up to date (${version}).`);
          else console.log(`[deep-era] update available: ${version} -> ${latest}. Run: npm i -g deep-era@latest`);
        } catch {
          console.log(`[deep-era] registry unreadable (offline?) — staying on ${version}.`);
        }
      });
    });
    req.on("timeout", () => { req.destroy(); console.log(`[deep-era] registry timeout (offline?) — staying on ${version}.`); });
    req.on("error", (e) => console.log(`[deep-era] registry unreachable (${e.code || "offline"}) — staying on ${version}.`));
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
  if (cmd === "perf") {
    process.env.DEEP_ERA_SELFTEST = "1"; // engine speed only — no nested test-suite run
    const dir = targetDir;
    const { buildMap } = require("../src/map");
    const { guardScan } = require("../src/guard");
    const { securityScan } = require("../src/security");
    const { verifyProject } = require("../src/verify");
    const { getRelevant, readSnippets } = require("../src/context");
    const T = (fn) => { const t = process.hrtime.bigint(); const o = fn(); return { ms: Number(process.hrtime.bigint() - t) / 1e6, o }; };
    const m = T(() => buildMap(dir)); const map = m.o;
    const g = T(() => guardScan(dir, map.files));
    const s = T(() => securityScan(dir, map.files));
    const v = T(() => verifyProject(dir, map));
    const rel = getRelevant(dir, map, process.argv[4] || "main", 8);
    const c = T(() => readSnippets(dir, rel));
    console.log(`[deep-era perf] ${dir} (${map.counts.total} files)`);
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
