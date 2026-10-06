// Skill catalog indexer: makes INSTALLED skills discoverable.
// RULE: user may speak any language. All code, comments, logs and replies: ENGLISH ONLY.
const fs = require("fs");
const path = require("path");
const { STOPWORDS } = require("./skills");

// WHY THIS EXISTS: installing a skill never made it findable. `skill --add` copied
// files into .deep-era/skills/, but matchSkills/searchSkills only read static
// catalog.json files that no code ever wrote — so an installed skill behaved exactly
// like a missing one. This module closes that gap: parse every installed SKILL.md,
// build the catalog the matcher already understands, write it next to the skills.
//
// WHAT IT NEVER DOES: execute anything. Indexing reads frontmatter + description
// text only. Skill scripts/, if present, are never listed, never run. Installing a
// skill collection is the user's explicit choice; deep-era treats the content as
// documentation to rank, nothing more.

function skillsRoot(cwd) {
  return path.join(cwd || process.cwd(), ".deep-era", "skills");
}

function catalogPath(cwd) {
  return path.join(skillsRoot(cwd), "catalog.json");
}

// Tolerant frontmatter reader. Real-world SKILL.md files vary: deep-era's own
// `name:`/`description:` block, or richer variants with domain/tags/triggers lists
// and multi-line descriptions. Normalizes CRLF first (cloned repos vary).
// Returns {ok, entry?} or {ok:false, error} — never throws.
function parseSkillFrontmatter(skillDir) {
  const full = path.join(skillDir, "SKILL.md");
  let txt = "";
  try {
    txt = fs.readFileSync(full, "utf8").replace(/\r\n/g, "\n");
  } catch {
    return { ok: false, error: "no SKILL.md in " + path.basename(skillDir) };
  }
  const m = txt.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return { ok: false, error: "SKILL.md frontmatter must open with --- name:/description:" };
  const head = m[1];
  const get = (key) => {
    const r = head.match(new RegExp("^" + key + ":\\s*(.+?)\\s*$", "m"));
    return r ? r[1].replace(/^['"]|['"]$/g, "").trim() : "";
  };
  const name = get("name");
  if (!/^[a-z0-9-]+$/.test(name)) return { ok: false, error: "frontmatter needs name: (lowercase, digits, hyphens)" };
  // description: first line plus indented continuation lines, stopping at the next
  // `key:`, list item, or fence. Single-line descriptions work unchanged.
  let description = get("description");
  if (!description) return { ok: false, error: "frontmatter needs description:" };
  const lines = head.split("\n");
  const di = lines.findIndex((l) => /^\s*description:/.test(l));
  if (di !== -1) {
    for (let i = di + 1; i < lines.length; i++) {
      const l = lines[i];
      if (/^\s*-\s+/.test(l) || /^[a-zA-Z_][\w-]*\s*:/.test(l) || l.trim() === "---") break;
      if (/^\s+\S/.test(l)) description += " " + l.trim();
      else break;
    }
  }
  const tags = [];
  const tagBlock = head.match(/^tags:\s*\n((?:\s*-\s*.+\n?)+)/m);
  if (tagBlock) {
    for (const line of tagBlock[1].split("\n")) {
      const t = line.match(/^\s*-\s*(.+?)\s*$/);
      if (t) tags.push(t[1].replace(/^['"]|['"]$/g, ""));
    }
  }
  const trigBlock = head.match(/^triggers:\s*\n((?:\s*-\s*.+\n?)+)/m);
  const triggers = [];
  if (trigBlock) {
    for (const line of trigBlock[1].split("\n")) {
      const t = line.match(/^\s*-\s*(.+?)\s*$/);
      if (t) triggers.push(t[1].replace(/^['"]|['"]$/g, "").toLowerCase());
    }
  }
  const category = get("category") || get("domain") || get("subdomain") || "general";
  const body = txt.slice(m[0].length).trim();
  if (!body) return { ok: false, error: "SKILL.md has no body" };
  return { ok: true, entry: { name, description, tags, triggers, category } };
}

// Significant words from name + description + tags, minus noise. Uses the same
// STOPWORDS the matcher uses, so indexed triggers speak the matcher's language.
function deriveTriggers(name, description, tags) {
  const seen = new Set();
  const out = [];
  const push = (w) => {
    const t = String(w || "").toLowerCase().replace(/[^a-z0-9+#.-]/g, "");
    if (t.length > 2 && !STOPWORDS.has(t) && !seen.has(t)) { seen.add(t); out.push(t); }
  };
  for (const w of String(name).split(/[^a-z0-9]+/i)) push(w);
  for (const t of tags || []) for (const w of String(t).split(/[^a-z0-9]+/)) push(w);
  for (const w of String(description || "").split(/[^a-z0-9+#.-]+/).slice(0, 400)) {
    if (out.length >= 24) break;
    push(w);
  }
  return out;
}

function listSkillDirs(root) {
  let entries = [];
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch { return []; }
  return entries.filter((e) => e.isDirectory()).map((e) => path.join(root, e.name));
}

// Raw read of one catalog file (no merge, no dedupe) for structural checks.
function readRawCatalog(file) {
  try {
    const c = JSON.parse(fs.readFileSync(file, "utf8"));
    return Array.isArray(c.skills) ? c.skills : [];
  } catch {
    return [];
  }
}

// Build a catalog object from skill directories. Pure function of the dirs given —
// no network, no side effects — so tests can run it on fixtures.
function buildSkillCatalog(dirs, source) {
  const skills = [];
  const rejected = [];
  for (const dir of dirs || []) {
    const parsed = parseSkillFrontmatter(dir);
    if (!parsed.ok) {
      rejected.push({ dir: path.basename(dir), error: parsed.error });
      continue;
    }
    const e = parsed.entry;
    const triggers = (e.triggers && e.triggers.length ? e.triggers : deriveTriggers(e.name, e.description, e.tags)).slice(0, 24);
    skills.push({
      id: e.name,
      name: e.name,
      description: e.description,
      category: e.category,
      tags: e.tags,
      triggers,
      path: path.basename(dir),
      ...(source ? { source } : {}),
    });
  }
  skills.sort((a, b) => String(a.id).localeCompare(String(b.id)));
  return {
    version: 1,
    generated_at: new Date().toISOString(),
    total_skills: skills.length,
    skills,
    rejected,
  };
}

// Scan a project's installed skills and (re)write its catalog. Scans
// .deep-era/skills first (installed via `skill --add`, wins on id collision),
// then .agents/skills (vendored/shared). Writes .deep-era/skills/catalog.json.
function reindexSkills(cwd) {
  const root = cwd || process.cwd();
  const { clearCatalogCache } = require("./skills");
  const seen = new Set();
  const skills = [];
  const rejected = [];
  for (const base of [path.join(root, ".deep-era", "skills"), path.join(root, ".agents", "skills")]) {
    for (const dir of listSkillDirs(base)) {
      const parsed = parseSkillFrontmatter(dir);
      const id = parsed.ok ? parsed.entry.name : path.basename(dir);
      if (seen.has(id)) continue;
      seen.add(id);
      if (!parsed.ok) {
        rejected.push({ dir: path.basename(dir), error: parsed.error });
        continue;
      }
      const e = parsed.entry;
      const triggers = (e.triggers && e.triggers.length ? e.triggers : deriveTriggers(e.name, e.description, e.tags)).slice(0, 24);
      skills.push({
        id: e.name, name: e.name, description: e.description,
        category: e.category, tags: e.tags, triggers, path: path.basename(dir),
      });
    }
  }
  skills.sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const catalog = {
    version: 1,
    generated_at: new Date().toISOString(),
    total_skills: skills.length,
    skills,
  };
  const dest = catalogPath(root);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, JSON.stringify(catalog, null, 2));
  clearCatalogCache();
  return { catalogPath: dest, indexed: skills.length, rejected };
}

// Coverage audit: is every skill actually reachable? A skill no task query can find
// is shelfware — installed, indexed, and invisible. For each skill, its own top-3
// triggers become the query; missing the top-N means no realistic task will surface
// it either, because real tasks match worse than the skill's own keywords.
// Also reports trigger-less entries, duplicate ids, and empty descriptions.
// Pure read of the merged catalog — never writes, never executes.
function auditCatalog(cwd, opts) {
  const { getCatalog, clearCatalogCache, matchSkills } = require("./skills");
  const o = opts || {};
  const topN = o.topN || 5;
  const root = cwd || process.cwd();
  clearCatalogCache();
  const catalog = getCatalog(root);
  const skills = (catalog && catalog.skills) || [];
  // Duplicates are checked against the RAW project file, not the merged view:
  // merging dedupes by design (project shadows vault = override, not error).
  // Same id twice in one file is ambiguity no override explains.
  const rawProject = readRawCatalog(path.join(root, ".deep-era", "skills", "catalog.json"));
  const seenRaw = new Set();
  const duplicates = [];
  for (const s of rawProject) {
    const id = String(s.id || s.name || "");
    if (!id) continue;
    if (seenRaw.has(id)) {
      if (!duplicates.includes(id)) duplicates.push(id);
      continue;
    }
    seenRaw.add(id);
  }
  const seen = new Set();
  const withoutTriggers = [];
  const emptyDescription = [];
  const orphans = [];
  for (const s of skills) {
    const id = String(s.id || s.name || "");
    if (!id || seen.has(id)) continue; // merged view already deduped; dupes reported above
    seen.add(id);
    const triggers = Array.isArray(s.triggers) ? s.triggers.filter(Boolean) : [];
    if (!triggers.length) {
      withoutTriggers.push(id);
      continue; // nothing to query with — unreachable by construction
    }
    if (!String(s.description || "").trim()) emptyDescription.push(id);
    // Two tiers: a terse 3-word query, then a descriptive 5-word one. Skills whose
    // distinctive terms sit past position 3 (e.g. five siblings all starting
    // "building-threat-intelligence-…") are reachable by realistic sentences even
    // when a terse query drowns them in siblings. Only unreachable-by-both counts.
    const q3 = triggers.slice(0, 3).join(" ");
    let ranked = [];
    try {
      ranked = matchSkills(q3, topN, root).map((x) => String(x.id));
    } catch {
      orphans.push({ id, query: q3 });
      continue;
    }
    if (ranked.includes(id)) continue;
    let ranked5 = [];
    try {
      ranked5 = matchSkills(triggers.slice(0, 5).join(" "), topN, root).map((x) => String(x.id));
    } catch { /* fall through to orphan */ }
    if (!ranked5.includes(id)) orphans.push({ id, query: q3 });
  }
  clearCatalogCache();
  return {
    total: skills.length,
    withTriggers: skills.length - withoutTriggers.length,
    withoutTriggers,
    orphans,
    duplicates,
    emptyDescription,
    topN,
    orphanRate: skills.length ? +(orphans.length / skills.length).toFixed(3) : 0,
  };
}

module.exports = {
  parseSkillFrontmatter,
  deriveTriggers,
  buildSkillCatalog,
  reindexSkills,
  auditCatalog,
  listSkillDirs,
  catalogPath,
  skillsRoot,
};
