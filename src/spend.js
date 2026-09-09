const fs = require("fs");
const path = require("path");

// Spend tracker: every char served to the AI is logged. Nothing estimated silently.
// tokens ≈ chars/4 (standard heuristic, stated). Cost shown at 3 blended rates.
function spendFile(cwd) {
  return path.join(cwd, ".deep-era", "logs", "spend.jsonl");
}

function logSpend(cwd, tool, chars) {
  try {
    fs.mkdirSync(path.dirname(spendFile(cwd)), { recursive: true });
    fs.appendFileSync(spendFile(cwd), JSON.stringify({ at: new Date().toISOString(), tool, chars }) + "\n");
  } catch {}
}

function spendReport(cwd) {
  let entries = [];
  try {
    entries = fs.readFileSync(spendFile(cwd), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  } catch {}
  const byTool = {};
  let chars = 0;
  for (const e of entries) {
    chars += e.chars || 0;
    byTool[e.tool] = (byTool[e.tool] || 0) + (e.chars || 0);
  }
  const tokens = Math.round(chars / 4);
  const cost = (perM) => `$${((tokens / 1e6) * perM).toFixed(2)}`;
  return {
    calls: entries.length, chars, tokens,
    byTool, estimate: { "budget ~$0.50/1M": cost(0.5), "standard ~$3/1M": cost(3), "premium ~$15/1M": cost(15) },
    note: "tokens ≈ chars/4 heuristic. Real billing varies by model — this is a ceiling check, not an invoice.",
  };
}

module.exports = { logSpend, spendReport };
