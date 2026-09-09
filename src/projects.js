const fs = require("fs");
const path = require("path");

// Multi-project registry: one screen showing every deep-era project's health.
// An agent juggling N repos sees instantly where it is needed.
function findProjects(root, depth = 0, out = []) {
  if (depth > 3) return out;
  let entries = [];
  try { entries = fs.readdirSync(root, { withFileTypes: true }); } catch { return out; }
  if (entries.some((e) => e.name === ".deep-era" && e.isDirectory())) {
    out.push(root);
  }
  if (out.length >= 50) return out;
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (["node_modules", ".git", ".deep-era", "dist", "build", "venv", "__pycache__"].includes(e.name)) continue;
    findProjects(path.join(root, e.name), depth + 1, out);
    if (out.length >= 50) break;
  }
  return out;
}

function projectStatus(dir) {
  try {
    const last = JSON.parse(fs.readFileSync(path.join(dir, ".deep-era", "last-doctor.json"), "utf8"));
    const bad = (last.failed || 0);
    return { dir, state: bad ? "FAIL" : "PASS", failed: last.failed || 0, at: (last.at || "").slice(0, 16) };
  } catch {
    return { dir, state: "NEVER", failed: "-", at: "-" };
  }
}

function runProjects(root) {
  const found = findProjects(root || process.cwd());
  console.log(`[deep-era] projects (${found.length}):`);
  for (const dir of found) {
    const s = projectStatus(dir);
    console.log(`  [${s.state}] ${dir}  (fail=${s.failed}, last=${s.at})`);
  }
  const fails = found.filter((d) => projectStatus(d).state === "FAIL").length;
  if (fails) console.log(`[deep-era] ${fails} project(s) need you. cd there and run: deep-era heal`);
  return found;
}

module.exports = { runProjects, findProjects, projectStatus };
