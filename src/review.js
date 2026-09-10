const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Scoped review: audit ONLY what changed (git working tree + staged).
// Full-repo scans cry wolf on legacy code; review judges the AI's actual diff.
function changedFiles(cwd) {
  try {
    const out = execSync("git status --short", { cwd, timeout: 15000 }).toString();
    const files = [];
    for (const line of out.split("\n")) {
      const m = line.match(/^.. (.+?)( -> (.+))?$/);
      if (!m) continue;
      const f = (m[3] || m[1]).trim().replace(/"/g, "");
      if (f && fs.existsSync(path.join(cwd, f))) files.push(f.replace(/\\/g, "/"));
    }
    return [...new Set(files)].slice(0, 50);
  } catch {
    return null; // not a git repo — caller says so honestly
  }
}

function runReview(cwd) {
  const changed = changedFiles(cwd);
  if (changed === null) {
    console.log("[deep-era] review: not a git repo — run check instead (full audit).");
    return { changed: null };
  }
  if (!changed.length) {
    console.log("[deep-era] review: working tree clean — nothing to review.");
    return { changed: [] };
  }
  const { buildMap } = require("./map");
  const { verifyProject } = require("./verify");
  const { securityScan } = require("./security");
  const { guardScan } = require("./guard");
  const map = buildMap(cwd);
  const names = new Set(changed);
  // Full scan for correct cross-file answers (imports, tests), then filter to the diff.
  // Judging only scoped files against a scoped map would cry wolf on unchanged neighbors.
  const v = verifyProject(cwd, { ...map, files: map.files.filter((f) => names.has(f.file)) });
  const findings = [...securityScan(cwd, map.files), ...guardScan(cwd, map.files)].filter((x) => names.has(x.file));
  const vf = v.filter((x) => !x.ok).length;
  const bad = findings.filter((x) => x.sev === "critical" || x.sev === "high").length;
  console.log(`[deep-era] review: ${changed.length} changed file(s)`);
  changed.forEach((f) => console.log(`  ~ ${f}`));
  findings.slice(0, 15).forEach((x) => console.log(`  ! [${x.sev}] ${x.file}: ${x.msg} (${x.rule})`));
  console.log(`verify: ${v.length - vf}/${v.length} | findings: ${findings.length}`);
  console.log(`RESULT: ${vf || bad ? "FAIL — fix your diff." : "PASS — safe to commit."}`);
  if (vf || bad) process.exitCode = 1;
  return { changed, verifyFails: vf, findings: findings.length };
}

module.exports = { runReview, changedFiles };
