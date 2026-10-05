// Zero-dependency skills engine for AI Deep Era (CommonJS, Node >= 18)
// RULE: user may speak any language. All code, comments, logs and replies: ENGLISH ONLY.
const fs = require("fs");
const path = require("path");

function findCatalogPath(cwd = process.cwd()) {
  const candidates = [
    path.join(cwd, ".agents", "catalog.json"),
    path.join(__dirname, "..", ".agents", "catalog.json"),
    path.join(process.env.USERPROFILE || process.env.HOME || "", ".agents", "catalog.json"),
    path.join(process.env.USERPROFILE || process.env.HOME || "", ".gemini", "antigravity", "skills", "catalog.json"),
    path.join(process.env.USERPROFILE || process.env.HOME || "", ".gemini", "config", "skills", "catalog.json")
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

let cachedCatalog = null;

function getCatalog(cwd = process.cwd()) {
  if (cachedCatalog) return cachedCatalog;
  const p = findCatalogPath(cwd);
  if (!p) {
    return { total: 0, skills: [] };
  }
  try {
    const raw = fs.readFileSync(p, "utf8");
    cachedCatalog = JSON.parse(raw);
    return cachedCatalog;
  } catch {
    return { total: 0, skills: [] };
  }
}

function searchSkills(query = "", limit = 10, cwd = process.cwd()) {
  const catalog = getCatalog(cwd);
  if (!query || !query.trim()) {
    return catalog.skills.slice(0, limit);
  }
  const tokens = query.toLowerCase().split(/[\s,._-]+/).filter(Boolean);
  
  const scored = [];
  for (const s of catalog.skills) {
    let score = 0;
    const nameLow = (s.name || s.id || "").toLowerCase();
    const descLow = (s.description || "").toLowerCase();
    const catLow = (s.category || "").toLowerCase();
    const tags = Array.isArray(s.tags) ? s.tags : [];

    for (const t of tokens) {
      if (nameLow === t) score += 50;
      else if (nameLow.includes(t)) score += 20;
      if (catLow === t) score += 15;
      if (descLow.includes(t)) score += 5;
      for (const tag of tags) {
        if (typeof tag === "string" && tag.toLowerCase().includes(t)) {
          score += 4;
        }
      }
    }
    if (score > 0) {
      scored.push({ ...s, score });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

function getSkill(nameOrId, cwd = process.cwd()) {
  const catalog = getCatalog(cwd);
  const target = (nameOrId || "").trim().toLowerCase();
  const match = catalog.skills.find(
    (s) => (s.id && s.id.toLowerCase() === target) || (s.name && s.name.toLowerCase() === target)
  );
  if (!match) return null;

  // Search for SKILL.md file
  const searchDirs = [
    path.join(cwd, ".agents", "skills", match.id),
    path.join(__dirname, "..", ".agents", "skills", match.id),
    path.join(process.env.USERPROFILE || process.env.HOME || "", ".gemini", "config", "skills", match.id),
    path.join(process.env.USERPROFILE || process.env.HOME || "", ".gemini", "antigravity", "skills", match.id),
    path.join(process.env.USERPROFILE || process.env.HOME || "", ".agents", "skills", match.id)
  ];

  let content = "";
  let skillFilePath = "";
  for (const d of searchDirs) {
    const f = path.join(d, "SKILL.md");
    if (fs.existsSync(f)) {
      try {
        content = fs.readFileSync(f, "utf8");
        skillFilePath = f;
        break;
      } catch {}
    }
  }

  return {
    ...match,
    filePath: skillFilePath,
    content: content || match.description || ""
  };
}

function listCategories(cwd = process.cwd()) {
  const catalog = getCatalog(cwd);
  const counts = {};
  for (const s of catalog.skills) {
    const c = s.category || "general";
    counts[c] = (counts[c] || 0) + 1;
  }
  return counts;
}

module.exports = {
  findCatalogPath,
  getCatalog,
  searchSkills,
  getSkill,
  listCategories
};
