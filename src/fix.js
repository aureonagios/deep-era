const fs = require("fs");
const path = require("path");
const { buildMap } = require("./map");
const { writeJson, logStep } = require("./logger");
const { createSnapshot } = require("./snapshot");

// SAFE auto-fix: only what cannot break. Never touches code logic.
function safeFix(cwd) {
  const actions = [];
  const snap = createSnapshot(cwd, "pre-fix");
  actions.push(`snapshot: ${snap.id} (${snap.files} files backup)`);

  // 1. .gitignore guard
  const giPath = path.join(cwd, ".gitignore");
  let gi = "";
  try { gi = fs.readFileSync(giPath, "utf8"); } catch { gi = ""; }
  const need = [".env", "node_modules/", ".deep-era/snapshots/"];
  const missing = need.filter((n) => !gi.includes(n));
  if (missing.length) {
    fs.writeFileSync(giPath, (gi ? gi.replace(/\s+$/, "") + "\n" : "") + missing.join("\n") + "\n");
    actions.push(`gitignore: added ${missing.join(", ")}`);
  } else {
    actions.push(`gitignore: already ok`);
  }

  // 2. Restore AGENTS.md if missing (never let universal rules break)
  if (!fs.existsSync(path.join(cwd, "AGENTS.md"))) {
    const { runInit } = require("./init");
    // init also refreshes the map
    actions.push(`agents-md: was missing — restored via init`);
    return runInit(cwd).then(() => {
      logStep(cwd, `fix: ${actions.join(" | ")}`);
      return actions;
    });
  }

  // 3. Refresh the map (a stale map = AI hallucination)
  const map = buildMap(cwd);
  writeJson(cwd, "map.json", map);
  actions.push(`map: refreshed (${map.counts.total} files, v${map.version})`);

  logStep(cwd, `fix: ${actions.join(" | ")}`);
  return Promise.resolve(actions);
}

module.exports = { safeFix };
