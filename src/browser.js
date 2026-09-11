const fs = require("fs");
const path = require("path");

// Browser bridge: deep-era bundles NO browser (honest — a 35KB CLI cannot).
// Instead it wires the standard Playwright MCP server into every client,
// plus a skill teaching the run-drive-verify loop (serve app -> drive page ->
// read console -> fix). Browser muscle from Playwright, brains from deep-era.
function playwrightEntry() {
  return { command: "npx", args: ["-y", "@playwright/mcp@latest"] };
}

function runBrowser(cwd) {
  const dir = path.join(cwd, ".deep-era", "browser");
  fs.mkdirSync(dir, { recursive: true });
  const e = playwrightEntry();
  const files = {
    "playwright.json": JSON.stringify({ mcpServers: { playwright: e } }, null, 2),
    "playwright.vscode.json": JSON.stringify({ servers: { playwright: e } }, null, 2),
    "playwright.opencode.json": JSON.stringify({ mcp: { playwright: { type: "local", command: ["npx", "-y", "@playwright/mcp@latest"], enabled: true } } }, null, 2),
  };
  for (const [name, body] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), body);
  }
  const how = `# Browser use (Playwright MCP bridge)

deep-era has no bundled browser. Wire the standard one:

1. Pick your client's shape from .deep-era/browser/ (playwright.json = default mcpServers, .vscode / .opencode variants included).
2. Merge it into your client's MCP config (deep-era setup-ide shows where).
3. Needs: Node 18+ and one-time browser download (Playwright handles it).
4. Then follow the deep-era-browse skill: serve the app -> drive the page ->
   read console errors -> screenshot critical path -> fix -> re-verify.
`;
  fs.writeFileSync(path.join(dir, "BROWSER.md"), how);
  console.log(`[deep-era] browser bridge ready: .deep-era/browser/ (playwright.json + vscode/opencode shapes + BROWSER.md)`);
  console.log(`Pair it with: deep-era serve  +  deep-era-browse skill`);
  return Object.keys(files);
}

module.exports = { runBrowser, playwrightEntry };
