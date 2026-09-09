const fs = require("fs");
const path = require("path");

// Token-saver engine: never hand the AI the whole codebase, only what is relevant.
function getRelevant(cwd, map, query, limit = 8) {
  const q = (query || "").toLowerCase().split(/[^a-z0-9_./-]+/).filter(Boolean);
  if (!q.length) return map.files.filter((f) => f.role.startsWith("code")).slice(0, limit);
  const scored = map.files.map((f) => {
    const name = f.file.toLowerCase();
    let score = 0;
    for (const tok of q) {
      if (name.includes(tok)) score += 3;
      if (f.role.startsWith("code")) score += 0.2;
    }
    // import-graph bonus
    if (f.importedBy && f.importedBy.length) score += Math.min(f.importedBy.length * 0.3, 2);
    return { f, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const top = scored.filter((s) => s.score > 0).slice(0, limit).map((s) => s.f);
  if (!top.length) return map.files.filter((f) => f.role.startsWith("code")).slice(0, limit);
  // Also include 1-hop imports (full context for the AI, still few tokens)
  const byFile = new Map(map.files.map((f) => [f.file, f]));
  const extra = [];
  for (const t of top) {
    for (const dep of (t.imports || [])) {
      if (byFile.has(dep) && !top.find((x) => x.file === dep) && extra.length + top.length < limit + 4) {
        extra.push(byFile.get(dep));
      }
    }
  }
  return top.concat(extra);
}

function readSnippets(cwd, files, maxChars = 12000) {
  let used = 0;
  const out = [];
  for (const f of files) {
    if (used >= maxChars) break;
    try {
      const full = path.join(cwd, f.file);
      const st = fs.statSync(full);
      if (st.size > 60000) {
        out.push({ file: f.file, truncated: true, text: fs.readFileSync(full, "utf8").slice(0, 2000) });
        used += 2000;
      } else {
        const txt = fs.readFileSync(full, "utf8").slice(0, 4000);
        out.push({ file: f.file, text: txt });
        used += txt.length;
      }
    } catch {}
  }
  return { snippets: out, chars: used };
}

module.exports = { getRelevant, readSnippets };
