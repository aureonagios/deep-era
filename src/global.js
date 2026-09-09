const fs = require("fs");
const os = require("os");
const path = require("path");
const { execSync } = require("child_process");
const { SKILL_MD } = require("./skill");

// MACHINE-LEVEL setup: wire deep-era into the PC once, every project benefits.
// Per-project files (AGENTS.md, map) still live in each repo — but the agent
// connection (global MCP entries + shared skill) is installed ONCE here.
function resolveBin() {
  try {
    const cmd = process.platform === "win32" ? "where deep-era" : "which deep-era";
    const hit = execSync(cmd, { timeout: 8000 }).toString().split(/\r?\n/).filter(Boolean)[0];
    if (hit) return hit.trim();
  } catch {}
  return "deep-era"; // on PATH via npm -g; clients resolve it at launch
}

function mergeMcpFile(full, entry) {
  let obj = {};
  let had = false;
  try {
    obj = JSON.parse(fs.readFileSync(full, "utf8"));
    had = true;
  } catch {}
  if (had) {
    try { fs.copyFileSync(full, full + ".deep-era.bak"); } catch {}
  }
  obj.mcpServers = obj.mcpServers || {};
  obj.mcpServers["deep-era"] = entry;
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, JSON.stringify(obj, null, 2));
  return had ? "merged (backup: .deep-era.bak)" : "created";
}

function claudeDesktopPath(home) {
  if (process.platform === "win32") return path.join(home, "AppData", "Roaming", "Claude", "claude_desktop_config.json");
  if (process.platform === "darwin") return path.join(home, "Library", "Application Support", "Claude", "claude_desktop_config.json");
  return path.join(home, ".config", "Claude", "claude_desktop_config.json");
}

function runGlobal(homeDir, binCmd) {
  const home = homeDir || os.homedir();
  const bin = binCmd || resolveBin();
  const entry = { command: bin, args: ["mcp"] };
  const targets = [
    ["cursor", path.join(home, ".cursor", "mcp.json")],
    ["windsurf", path.join(home, ".codeium", "windsurf", "mcp_config.json")],
    ["claude-desktop", claudeDesktopPath(home)],
    ["kiro", path.join(home, ".kiro", "settings", "mcp.json")],
    ["cline-cli", path.join(home, ".cline", "mcp.json")],
    ["junie", path.join(home, ".junie", "mcp", "mcp.json")],
  ];
  const results = [];
  for (const [id, full] of targets) {
    try {
      const how = mergeMcpFile(full, entry);
      results.push({ id, path: full, status: how });
    } catch (e) {
      results.push({ id, path: full, status: `skipped: ${e.message}` });
    }
  }
  // Shared skill for the Antigravity family (real path from official docs pattern)
  try {
    const dir = path.join(home, ".gemini", "skills", "deep-era-audit");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "SKILL.md"), SKILL_MD);
    results.push({ id: "antigravity-skill", path: path.join(dir, "SKILL.md"), status: "installed" });
  } catch (e) {
    results.push({ id: "antigravity-skill", path: "(skill)", status: `skipped: ${e.message}` });
  }
  console.log(`[deep-era] global setup (${home}):`);
  results.forEach((r) => console.log(`  - ${r.id}: ${r.status}\n    ${r.path}`));
  console.log(`Per-project files (AGENTS.md etc.) still come from: deep-era onboard`);
  return results;
}

module.exports = { runGlobal };
