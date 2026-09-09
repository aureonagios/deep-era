const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function sha1(p) {
  try { return crypto.createHash("sha1").update(fs.readFileSync(p)).digest("hex").slice(0, 8); }
  catch { return null; }
}

function allFiles(dir, base = "", out = []) {
  let entries = [];
  try { entries = fs.readdirSync(path.join(dir, base), { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const rel = path.join(base, e.name);
    if (e.isDirectory()) allFiles(dir, rel, out);
    else out.push(rel);
  }
  return out;
}

function snapDir(cwd) {
  const d = path.join(cwd, ".deep-era", "snapshots");
  fs.mkdirSync(d, { recursive: true });
  return d;
}

function createSnapshot(cwd, label) {
  const id = new Date().toISOString().replace(/[:.]/g, "-") + (label ? "-" + label.replace(/[^a-z0-9-]+/gi, "") : "");
  const dest = path.join(snapDir(cwd), id);
  fs.mkdirSync(dest, { recursive: true });
  // Backup code+config only (never node_modules) — 1-click restore from the human's IDE
  const skip = new Set(["node_modules", ".git", ".deep-era"]);
  let count = 0;
  function walk(rel) {
    const full = path.join(cwd, rel);
    let entries = [];
    try { entries = fs.readdirSync(full, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (skip.has(e.name)) continue;
      const r = path.join(rel, e.name);
      if (e.isDirectory()) walk(r);
      else {
        try {
          const st = fs.statSync(path.join(cwd, r));
          if (st.size > 200000) continue;
          const d2 = path.join(dest, path.dirname(r));
          fs.mkdirSync(d2, { recursive: true });
          fs.copyFileSync(path.join(cwd, r), path.join(dest, r));
          count++;
          if (count > 300) return;
        } catch {}
      }
    }
  }
  walk("");
  fs.writeFileSync(path.join(dest, ".snapshot.json"), JSON.stringify({ id, at: new Date().toISOString(), files: count }));
  return { id, files: count };
}

function listSnapshots(cwd) {
  try {
    return fs.readdirSync(snapDir(cwd)).filter((n) => !n.startsWith("."));
  } catch { return []; }
}

function restoreSnapshot(cwd, id) {  const src = path.join(snapDir(cwd), id);
  if (!fs.existsSync(src)) throw new Error(`snapshot not found: ${id}`);
  let count = 0;
  function walk(rel) {
    const full = path.join(src, rel);
    let entries = [];
    try { entries = fs.readdirSync(full, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name === ".snapshot.json") continue;
      const r = path.join(rel, e.name);
      if (e.isDirectory()) walk(r);
      else {
        try {
          fs.mkdirSync(path.join(cwd, path.dirname(r)), { recursive: true });
          fs.copyFileSync(path.join(src, r), path.join(cwd, r));
          count++;
        } catch {}
      }
    }
  }
  walk("");
  return { id, restored: count };
}

// Diff a snapshot against NOW: added / removed / modified (sha1).
// The human sees exactly what the AI touched since the backup.
function diffSnapshot(cwd, id) {
  const src = path.join(snapDir(cwd), id);
  if (!fs.existsSync(src)) throw new Error(`snapshot not found: ${id}`);
  const skip = new Set(["node_modules", ".git", ".deep-era"]);
  const snapFiles = new Map();
  for (const f of allFiles(src)) {
    if (f === ".snapshot.json" || f.split(path.sep).some((p) => skip.has(p))) continue;
    snapFiles.set(f, sha1(path.join(src, f)));
  }
  const nowFiles = new Map();
  (function walk(rel) {
    const full = path.join(cwd, rel);
    let entries = [];
    try { entries = fs.readdirSync(full, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (skip.has(e.name)) continue;
      const r = path.join(rel, e.name);
      if (e.isDirectory()) walk(r);
      else if (nowFiles.size < 500) nowFiles.set(r, sha1(path.join(cwd, r)));
    }
  })("");
  const added = [], removed = [], modified = [];
  for (const [f, h] of nowFiles) {
    if (!snapFiles.has(f)) added.push(f);
    else if (snapFiles.get(f) !== h) modified.push(f);
  }
  for (const f of snapFiles.keys()) if (!nowFiles.has(f)) removed.push(f);
  return { id, added, removed, modified };
}

module.exports = { createSnapshot, listSnapshots, restoreSnapshot, diffSnapshot };
