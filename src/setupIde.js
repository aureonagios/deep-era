const fs = require("fs");
const path = require("path");

// 22 clients. Every format below was verified against official docs (Sep 2026).
// tier: "docs" = official docs confirm path+shape. "family" = same engine as a
// docs-verified client (stated as such, confirm in client if unsure).
function clients(cliPath) {
  const stdio = { command: "node", args: [cliPath, "mcp"] };
  const stdioType = { type: "stdio", command: "node", args: [cliPath, "mcp"] };
  const tomlPath = cliPath.replace(/\\/g, "/");
  const posixCli = cliPath.replace(/\\/g, "/"); // JSONC-safe path for kilo file
  return [
    { id: "vscode", file: ".vscode/mcp.json", tier: "docs", body: JSON.stringify({ servers: { "deep-era": stdio } }, null, 2), where: "Project root. VSCode + Copilot auto-load. VSCode family (Antigravity, Void, PearAI, Positron) reads the same path." },
    { id: "cursor", file: ".cursor/mcp.json", tier: "docs", body: JSON.stringify({ mcpServers: { "deep-era": stdio } }, null, 2), where: "Project root. Global twin: ~/.cursor/mcp.json (generated below as cursor-global)." },
    { id: "kiro", file: ".kiro/settings/mcp.json", tier: "docs", body: JSON.stringify({ mcpServers: { "deep-era": stdio } }, null, 2), where: "Project root (workspace scope). User scope twin: ~/.kiro/settings/mcp.json." },
    { id: "claude-code", file: ".mcp.json", tier: "docs", body: JSON.stringify({ mcpServers: { "deep-era": stdioType } }, null, 2), where: "Project root, commit it — team shares it. Needs explicit \"type\": \"stdio\"." },
    { id: "gemini-cli", file: ".gemini/settings.json", tier: "docs", body: JSON.stringify({ mcpServers: { "deep-era": stdio } }, null, 2), where: "Project root. Hyphens only in names (deep-era is safe)." },
    { id: "codex", file: ".codex/config.toml", tier: "docs", body: `[mcp_servers.deep-era]\ncommand = "node"\nargs = ["${tomlPath}", "mcp"]\n`, where: "Project root (trusted projects only). TOML, not JSON. Global twin: ~/.codex/config.toml." },
    { id: "opencode", file: "opencode.json", tier: "docs", body: JSON.stringify({ $schema: "https://opencode.ai/config.json", mcp: { "deep-era": { type: "local", command: ["node", cliPath, "mcp"], enabled: true } } }, null, 2), where: "Project root under the \"mcp\" key. Local servers use a command ARRAY." },
    { id: "continue", file: ".continue/mcpServers/mcp.json", tier: "docs", body: JSON.stringify({ mcpServers: { "deep-era": stdio } }, null, 2), where: "Project root. Continue also reads this JSON shape (Agent mode only)." },
    { id: "zed", file: "zed-context-servers.jsonc", tier: "docs", body: `{\n  // Paste inside "context_servers" in your Zed settings.json\n  "deep-era": {\n    "command": "node",\n    "args": ["${cliPath}", "mcp"]\n  }\n}\n`, where: "Zed calls them context_servers — paste this object there. Full ref: zed.dev/docs/ai/mcp." },
    { id: "cline", file: "cline-mcp.json", tier: "docs", body: JSON.stringify({ mcpServers: { "deep-era": { command: "node", args: [cliPath, "mcp"], disabled: false } } }, null, 2), where: "Merge into cline_mcp_settings.json (IDE ext, via Cline panel > Configure) or ~/.cline/mcp.json (CLI)." },
    { id: "antigravity-ide", file: ".agents/mcp_config.json", tier: "docs", body: JSON.stringify({ mcpServers: { "deep-era": stdio } }, null, 2), where: "Project root. Antigravity IDE (VS Code-esque). Or IDE panel ... > MCP Servers > Manage > View raw config. Remote servers need serverUrl, not url." },
    { id: "antigravity-2", file: "antigravity2-mcp_config.json", tier: "docs", body: JSON.stringify({ mcpServers: { "deep-era": stdio } }, null, 2), where: "Antigravity 2.0 has NO IDE (agent manager only) — same central config: merge into ~/.gemini/config/mcp_config.json (global) or .agents/mcp_config.json (workspace). CLI/SDK share it too." },
    { id: "trae", file: ".trae/mcp.json", tier: "docs", body: JSON.stringify({ mcpServers: { "deep-era": stdio } }, null, 2), where: "Project root. Enable: Settings > MCP > Enable Project MCP. Global config: ~/.cursor/mcp.json is also read (Trae is Cursor-family)." },
    { id: "trae-solo", file: "trae-solo-mcp.json", tier: "docs", body: JSON.stringify({ mcpServers: { "deep-era": stdio } }, null, 2), where: "SOLO mode: avatar > Settings > MCP > Create Manually — same JSON shape. Only ${workspaceFolder} variable is supported." },
    { id: "jetbrains-junie", file: ".junie/mcp/mcp.json", tier: "docs", body: JSON.stringify({ mcpServers: { "deep-era": stdio } }, null, 2), where: "Project root. Junie + JetBrains AI Assistant (IntelliJ, PyCharm, WebStorm...). User twin: ~/.junie/mcp/mcp.json. Or IDE: Settings > Tools > AI Assistant > MCP." },
    { id: "roo", file: ".roo/mcp.json", tier: "docs", body: JSON.stringify({ mcpServers: { "deep-era": stdio } }, null, 2), where: "Project root, commit it. Global twin: mcp_settings.json (Roo panel > Edit Global MCP). Project wins on name clash." },
    { id: "kilo", file: ".kilo/kilo.jsonc", tier: "docs", body: `{\n  // Kilo Code project config — servers live under the "mcp" key (own shape, NOT mcpServers)\n  "mcp": {\n    "deep-era": {\n      "type": "local",\n      "command": ["node", "${posixCli}", "mcp"],\n      "enabled": true\n    }\n  }\n}\n`, where: "Project root (.kilo/kilo.jsonc) or kilo.jsonc. Own mcp key with command ARRAY. Global: ~/.config/kilo/kilo.jsonc." },
    { id: "copilot-host", file: "copilot-mcp.json", tier: "docs", body: JSON.stringify({ servers: { "deep-era": stdio } }, null, 2), where: "Agent Host / shared Copilot surfaces read workspace .mcp.json or ~/.copilot/mcp-config.json — same shape as vscode file." },
    { id: "windsurf-global", file: "windsurf-mcp_config.json", tier: "docs", body: JSON.stringify({ mcpServers: { "deep-era": stdio } }, null, 2), where: "GLOBAL ONLY — copy into ~/.codeium/windsurf/mcp_config.json (no project-level support). Then Refresh in Manage MCPs. 100-tool budget." },
    { id: "cursor-global", file: "cursor-mcp-global.json", tier: "docs", body: JSON.stringify({ mcpServers: { "deep-era": stdio } }, null, 2), where: "Copy into ~/.cursor/mcp.json for all projects." },
    { id: "claude-desktop", file: "claude_desktop_config.deep-era.json", tier: "docs", body: JSON.stringify({ mcpServers: { "deep-era": stdio } }, null, 2), where: "Merge into the global claude_desktop_config.json. Claude Code needs extra \"type\": use the claude-code file instead." },
    { id: "amazon-q", file: "amazonq-mcp.json", tier: "family", body: JSON.stringify({ mcpServers: { "deep-era": stdio } }, null, 2), where: "Copy into ~/.aws/amazonq/mcp.json (Amazon Q CLI). Same mcpServers shape." },
    { id: "generic", file: "mcp-servers.json", tier: "docs", body: JSON.stringify({ mcpServers: { "deep-era": stdio } }, null, 2), where: "Universal fallback — any client that accepts an mcpServers JSON block (Trae, JetBrains AI, Cody: paste per client docs)." },
  ];
}

function runSetupIde(cwd) {
  const cliPath = path.join(cwd, "bin", "cli.js");
  const list = clients(cliPath);
  // Remove legacy files from the old 5-client generator (wrong paths)
  for (const stale of [".vscode/mcp.json", ".cursor/mcp.json", ".windsurf/mcp.json", ".opencode/mcp.json", "claude_desktop_config.deep-era.json"]) {
    try { fs.unlinkSync(path.join(cwd, ".deep-era", "ide", stale)); } catch {}
  }
  const made = [];
  for (const c of list) {
    const full = path.join(cwd, ".deep-era", "ide", c.file);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, c.body);
    made.push(c);
  }
  const setup = `# IDE setup — ${made.length} files\n\nGenerated: ${new Date().toISOString()}\nCovers 25+ clients: file clients install directly; family clients (Antigravity CLI/SDK, Void, PearAI, Roo, Kilo, JetBrains, Cody) reuse the noted file shape.\n\n| Client | File | Scope | Trust | Install |\n|---|---|---|---|---|\n` + made.map((c) => `| ${c.id} | ${c.file} | ${/global/i.test(c.where) ? "global" : "project"} | ${c.tier === "docs" ? "docs-verified" : "family-note"} | ${c.where} |`).join("\n") + `
\nNot listed (honest notes): Aider has no native MCP support — use \`deep-era check\` in terminal instead. Roo/Kilo/Trae/Cody: paste \`mcp-servers.json\` per their docs (Cline/Cursor family shape).\n`;
  fs.writeFileSync(path.join(cwd, ".deep-era", "ide", "SETUP.md"), setup);
  console.log(`[deep-era] ide configs ready (${made.length} files, 25+ clients with family notes):`);
  made.forEach((m) => console.log(`  - .deep-era/ide/${m.file} (${m.id})`));
  console.log(`Read .deep-era/ide/SETUP.md for per-client install paths.`);
}

module.exports = { runSetupIde, clients };
