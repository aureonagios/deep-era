// One command that makes any IDE understand the project end to end.
//
// WHY THIS EXISTS: `setup-ide` dumps 23 config files into .deep-era/ide/ and then
// asks the human to copy-paste-merge-restart per client docs. `global` wires 6 global
// files but knows nothing about the project. Neither tells the agent what to do next.
// So a new user installs everything correctly and still stares at a blank chat box.
// This module closes that gap: detect what is actually installed, wire what can be
// wired safely, and print the rest as copy-paste steps plus the project facts the
// agent needs — one command, no README spelunking.
//
// HONESTY RULES (stated, then enforced by tests):
// - "detected" means a marker was found on disk, never a guess. No marker = not listed.
// - Never overwrite a config the user already has. Merge the deep-era entry with a
//   backup, or skip with an exact manual step.
// - Global writes happen only with --global. Default scope is the project.
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execSync } = require("child_process");

function homeDir() {
  // DEEP_ERA_HOME exists so tests (and portable installs) can point elsewhere.
  // Production uses the real home.
  return process.env.DEEP_ERA_HOME || os.homedir();
}

function exists(p) {
  try { return fs.existsSync(p); } catch { return false; }
}

function binOnPath(bin) {
  try {
    const cmd = process.platform === "win32" ? `where ${bin}` : `which ${bin}`;
    return execSync(cmd, { timeout: 8000, stdio: ["ignore", "pipe", "ignore"] }).toString().trim().length > 0;
  } catch { return false; }
}

// Each entry: how to KNOW it is installed (markers), and what to do about it.
// scope "project" = a file can be written under the project root.
// scope "global"  = only a user-level location exists; print the step (machine-wide wiring is `deep-era global`).
// scope "manual"  = config shape needs a human merge; print the exact step.
function knownIdes(home) {
  return [
    { id: "cursor", label: "Cursor", markers: [{ t: "dir", p: path.join(home, ".cursor") }, { t: "bin", p: "cursor" }], setupId: "cursor", scope: "project" },
    { id: "vscode", label: "VS Code / Copilot", markers: [{ t: "dir", p: path.join(home, ".vscode") }, { t: "bin", p: "code" }], setupId: "vscode", scope: "project" },
    { id: "windsurf", label: "Windsurf", markers: [{ t: "dir", p: path.join(home, ".codeium") }, { t: "bin", p: "windsurf" }], setupId: "windsurf-global", scope: "global", manual: "Copy .deep-era/ide/windsurf-mcp_config.json into ~/.codeium/windsurf/mcp_config.json, then Refresh in Manage MCPs." },
    { id: "claude-code", label: "Claude Code", markers: [{ t: "bin", p: "claude" }], setupId: "claude-code", scope: "project" },
    { id: "gemini-cli", label: "Gemini CLI", markers: [{ t: "bin", p: "gemini" }, { t: "dir", p: path.join(home, ".gemini") }], setupId: "gemini-cli", scope: "project" },
    { id: "codex", label: "Muse", markers: [{ t: "bin", p: "codex" }, { t: "dir", p: path.join(home, ".codex") }], setupId: "codex", scope: "project" },
    { id: "opencode", label: "OpenCode", markers: [{ t: "bin", p: "opencode" }], setupId: "opencode", scope: "project" },
    { id: "kiro", label: "Kiro", markers: [{ t: "dir", p: path.join(home, ".kiro") }, { t: "bin", p: "kiro" }], setupId: "kiro", scope: "project" },
    { id: "cline", label: "Cline", markers: [{ t: "dir", p: path.join(home, ".cline") }], setupId: "cline", scope: "manual", manual: "Merge .deep-era/ide/cline-mcp.json into cline_mcp_settings.json (Cline panel > Configure), or ~/.cline/mcp.json (CLI)." },
    { id: "roo", label: "Roo", markers: [{ t: "dir", p: path.join(home, ".roo") }], setupId: "roo", scope: "project" },
    { id: "kilo", label: "Kilo", markers: [{ t: "dir", p: path.join(home, ".kilo") }, { t: "dir", p: path.join(home, ".config", "kilo") }], setupId: "kilo", scope: "project" },
    { id: "junie", label: "JetBrains Junie", markers: [{ t: "dir", p: path.join(home, ".junie") }], setupId: "jetbrains-junie", scope: "project" },
    { id: "trae", label: "Trae", markers: [{ t: "dir", p: path.join(home, ".trae") }, { t: "bin", p: "trae" }], setupId: "trae", scope: "project" },
    { id: "zed", label: "Zed", markers: [{ t: "bin", p: "zed" }, { t: "dir", p: path.join(home, ".zed") }], setupId: null, scope: "manual", manual: "Paste the object from .deep-era/ide/zed-context-servers.jsonc inside \"context_servers\" in your Zed settings.json (zed.dev/docs/ai/mcp)." },
    { id: "antigravity", label: "Antigravity IDE", markers: [{ t: "dir", p: path.join(home, ".agents") }], setupId: "antigravity-ide", scope: "project" },
    { id: "continue", label: "Continue", markers: [{ t: "dir", p: path.join(home, ".continue") }], setupId: "continue", scope: "project" },
    { id: "claude-desktop", label: "Claude Desktop", markers: [{ t: "file", p: claudeDesktopPath(home) }], setupId: null, scope: "global", manual: "Merge .deep-era/ide/claude_desktop_config.deep-era.json into the global claude_desktop_config.json, or run: deep-era global" },
    { id: "amazon-q", label: "Amazon Q", markers: [{ t: "bin", p: "q" }, { t: "dir", p: path.join(home, ".aws") }], setupId: "amazon-q", scope: "global", manual: "Copy .deep-era/ide/amazonq-mcp.json into ~/.aws/amazonq/mcp.json (Amazon Q CLI)." },
  ];
}

function claudeDesktopPath(home) {
  if (process.platform === "win32") return path.join(home, "AppData", "Roaming", "Claude", "claude_desktop_config.json");
  if (process.platform === "darwin") return path.join(home, "Library", "Application Support", "Claude", "claude_desktop_config.json");
  return path.join(home, ".config", "Claude", "claude_desktop_config.json");
}

function detectInstalledIdes(home) {
  const H = home || homeDir();
  const out = [];
  for (const ide of knownIdes(H)) {
    const hits = [];
    for (const m of ide.markers) {
      if (m.t === "bin") { if (binOnPath(m.p)) hits.push(`binary ${m.p} on PATH`); }
      else if (exists(m.p)) hits.push(`${m.t} ${m.p}`);
    }
    if (hits.length) out.push({ id: ide.id, label: ide.label, scope: ide.scope, setupId: ide.setupId, manual: ide.manual || null, evidence: hits[0] });
  }
  return out;
}

// Project facts the agent needs before its first edit. Everything here is read, not
// claimed: stack + file count from a fresh map, last verdict from the last doctor run,
// memory presence from disk.
function projectBrief(cwd) {
  const brief = { dir: cwd, stack: "unknown", files: 0, agentsMd: false, promptMd: false, lastCheck: null, memories: 0 };
  try {
    const { buildMap } = require("./map");
    const map = buildMap(cwd);
    brief.stack = (map.stack && map.stack.kind) || "unknown";
    brief.files = (map.counts && map.counts.total) || (map.files || []).length;
  } catch {}
  brief.agentsMd = exists(path.join(cwd, "AGENTS.md"));
  brief.promptMd = exists(path.join(cwd, "PROMPT.md"));
  try {
    const last = JSON.parse(fs.readFileSync(path.join(cwd, ".deep-era", "last-doctor.json"), "utf8"));
    brief.lastCheck = { at: last.at || null, failed: last.failed || 0, security: last.security || 0, guard: last.guard || 0 };
  } catch {}
  try {
    const mem = fs.readFileSync(path.join(cwd, ".deep-era", "logs", "memory.jsonl"), "utf8").split("\n").filter(Boolean);
    brief.memories = mem.length;
  } catch {}
  return brief;
}

function wireProjectFile(cwd, cliPath, setupId) {
  // Writes the setup-ide config for one client into the PROJECT (not .deep-era/ide).
  // Existing file with a known servers key => merge + backup. Anything else present
  // => skip with the manual step. Returns {status, path}.
  const { clients } = require("./setupIde");
  const c = clients(cliPath).find((x) => x.id === setupId);
  if (!c) return { status: "no template for this client", path: null };
  const projectFile = {
    "vscode": ".vscode/mcp.json", "cursor": ".cursor/mcp.json", "kiro": ".kiro/settings/mcp.json",
    "claude-code": ".mcp.json", "gemini-cli": ".gemini/settings.json", "codex": ".codex/config.toml",
    "opencode": "opencode.json", "continue": ".continue/mcpServers/mcp.json",
    "antigravity-ide": ".agents/mcp_config.json", "trae": ".trae/mcp.json",
    "jetbrains-junie": ".junie/mcp/mcp.json", "roo": ".roo/mcp.json", "kilo": ".kilo/kilo.jsonc",
    "copilot-host": ".copilot/mcp.json", "amazon-q": null, "generic": "mcp-servers.json",
  }[c.id];
  if (!projectFile) return { status: "no project-level location for this client", path: null };
  const full = path.join(cwd, projectFile);
  if (!exists(full)) {
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, c.body);
    return { status: "created", path: projectFile };
  }
  // Merge, never overwrite: keep a backup, then add the deep-era entry.
  if (/\.json$/.test(projectFile)) {
    try {
      const entry = JSON.parse(c.body);
      const key = entry.mcpServers ? "mcpServers" : "servers";
      const servers = entry[key] || {};
      const target = JSON.parse(fs.readFileSync(full, "utf8"));
      try { fs.copyFileSync(full, full + ".deep-era.bak"); } catch {}
      target[key] = target[key] || {};
      Object.assign(target[key], servers);
      fs.writeFileSync(full, JSON.stringify(target, null, 2));
      return { status: "merged (backup: .deep-era.bak)", path: projectFile };
    } catch {
      return { status: "exists but unreadable — left untouched, merge by hand", path: projectFile };
    }
  }
  return { status: "already exists — left untouched, check it points at deep-era", path: projectFile };
}

function runIde(cwd, opts) {
  const o = opts || {};
  const home = o.homeDir || homeDir();
  const cliPath = path.join(cwd, "bin", "cli.js");
  const found = detectInstalledIdes(home);
  const want = o.name ? found.filter((f) => f.id === o.name || f.label.toLowerCase() === String(o.name).toLowerCase()) : found;
  console.log(`[deep-era] ide: ${found.length} IDE client(s) detected on this machine${o.name ? ` (filter: ${o.name})` : ""}.`);
  const wired = [];
  const manual = [];
  const list = o.name ? (want.length ? want : [{ id: o.name, label: o.name, scope: "unknown", setupId: null, manual: null, evidence: null }]) : found;
  for (const ide of list) {
    if (!ide.evidence) {
      manual.push({ id: ide.id, step: `No install markers found for "${o.name}" — check the spelling, or wire it by hand from .deep-era/ide/SETUP.md.` });
      console.log(`  ? ${ide.id}: not detected on this machine.`);
      continue;
    }
    // Machine-wide (global-scope) wiring lives in one place: `deep-era global`.
    // This command wires the project; for the globals it prints the exact step.
    if (ide.scope === "project" && ide.setupId) {
      const r = wireProjectFile(cwd, cliPath, ide.setupId);
      wired.push({ id: ide.id, ...r });
      console.log(`  + ${ide.label}: ${r.status} (${r.path || "n/a"})`);
    } else {
      const step = ide.manual || "See .deep-era/ide/SETUP.md for the install path.";
      manual.push({ id: ide.id, step });
      console.log(`  = ${ide.label}: manual step needed.`);
      console.log(`    ${step}`);
    }
  }
  if (!found.length && !o.name) {
    console.log(`  (none detected — markers checked under ${home})`);
    console.log(`  Every client still works by hand: deep-era setup-ide, then .deep-era/ide/SETUP.md.`);
  }
  const b = projectBrief(cwd);
  console.log(``);
  console.log(`--- AGENT BRIEF: everything an IDE needs, end to end ---`);
  console.log(`Project: ${b.dir} | stack: ${b.stack} | files: ${b.files}`);
  console.log(`Rules: ${b.agentsMd ? "AGENTS.md (installed — obey it)" : "AGENTS.md MISSING — run: deep-era onboard"}`);
  console.log(`Paste: ${b.promptMd ? "PROMPT.md (or: deep-era prompt --raw)" : "PROMPT.md missing from package — reinstall deep-era"}`);
  if (b.lastCheck) console.log(`Last audit: ${b.lastCheck.failed} failed, ${b.lastCheck.security} security, ${b.lastCheck.guard} guard (${b.lastCheck.at || "unknown time"})`);
  else console.log(`Last audit: none yet — run: deep-era check`);
  console.log(`Memory: ${b.memories} entries recalled on every task (forgetting one is a failure)`);
  console.log(`Loop: guide_task (route) -> recall -> snapshot -> plan -> get_context -> verify_work + security_check + audit_work -> remember. Full text: deep-era prompt --raw`);
  console.log(`Machine-wide wiring (all projects at once): deep-era global`);
  return { detected: found, wired, manual, brief: b };
}

module.exports = { detectInstalledIdes, projectBrief, wireProjectFile, runIde, homeDir, knownIdes };
