// Zero-dependency skills engine for AI Deep Era (CommonJS, Node >= 18)
// RULE: user may speak any language. All code, comments, logs and replies: ENGLISH ONLY.
const fs = require("fs");
const path = require("path");

function findCatalogPath(cwd = process.cwd()) {
  // Static vault catalogs only. The per-project catalog
  // (<cwd>/.deep-era/skills/catalog.json) is handled separately in getCatalog,
  // which merges it OVER these — keeping it here too would make getCatalog read
  // the same file twice and, worse, mistake it for the fallback.
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
let cachedCatalogKey = "";

function clearCatalogCache() {
  // The MCP server is long-lived and tests share one process: a reindex (or a
  // switch of project) must never keep serving yesterday's catalog.
  cachedCatalog = null;
  cachedCatalogKey = "";
}

function readCatalogFile(p) {
  try {
    const c = JSON.parse(fs.readFileSync(p, "utf8"));
    return Array.isArray(c.skills) ? c : { total: 0, skills: [] };
  } catch {
    return { total: 0, skills: [] };
  }
}

function getCatalog(cwd = process.cwd()) {
  // Project-installed skills (reindexed by `skills --reindex`) merge OVER the static
  // vault catalogs: user intent wins on id collision, everything stays searchable.
  // Before this, installing a skill never made it findable — the catalogs no code
  // wrote were the only ones read.
  const key = String(cwd);
  if (cachedCatalog && cachedCatalogKey === key) return cachedCatalog;
  const seen = new Set();
  const skills = [];
  const projectCatalog = path.join(cwd, ".deep-era", "skills", "catalog.json");
  const fallback = findCatalogPath(cwd);
  const sources = [projectCatalog];
  if (fallback) sources.push(fallback);
  for (const base of sources) {
    if (!fs.existsSync(base)) continue;
    for (const s of readCatalogFile(base).skills) {
      const id = String(s.id || s.name || "");
      if (!id || seen.has(id)) continue;
      seen.add(id);
      skills.push(s);
    }
  }
  cachedCatalog = { total: skills.length, skills };
  cachedCatalogKey = key;
  return cachedCatalog;
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

  // Search for SKILL.md file. Project-installed skills (.deep-era/skills) come
  // first: before this, `skill --add` copied files somewhere nothing ever read.
  const searchDirs = [
    path.join(cwd, ".deep-era", "skills", match.id),
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

// --- trigger matching --------------------------------------------------------
// The catalog already carries a `triggers` array on every skill, generated from that
// skill's own description. Nothing read it, which meant a project with 410 skills
// installed still behaved as if it had none: the agent had to know a skill existed and
// remember its name. Matching on triggers lets `guide_task` say "these skills apply to
// what you are about to do" instead of leaving discovery to chance.

// Words too common to carry signal. Without this filter a task like "fix the login bug"
// ranks every skill whose blurb mentions "fix" or "the".
const STOPWORDS = new Set([
  "you", "are", "the", "and", "for", "with", "this", "that", "from", "use", "using",
  "use", "when", "your", "their", "its", "into", "a", "an", "of", "to", "in", "on",
  "by", "as", "at", "be", "is", "it", "or", "not", "but", "can", "will", "should",
  "expert", "master", "specializing", "specializes", "pro", "who", "which", "every",
  "must", "never", "always", "also", "then", "than", "them", "they", "we", "our",
  // Generic verbs name an ACTION, not a SUBJECT. "fix a typo" must not rank an
  // accessibility audit, and "review my PR" must not rank a landing-page audit. The
  // subject noun is what identifies a skill; without this every task matched whatever
  // skill happened to share its verb.
  "fix", "add", "make", "get", "set", "run", "new", "change", "update", "remove",
  "create", "build", "write", "read", "check", "test", "help", "need", "want", "do",
  "implement", "refactor", "clean", "move", "handle", "start", "stop", "use-case",
]);

// A skill needs more than a generic verb to be a recommendation. Anything scoring only
// on one weak token is noise that would teach the agent to ignore the whole section.
const MIN_SCORE = 14;

function taskTokens(taskText) {
  return [...new Set(
    String(taskText || "")
      .toLowerCase()
      .split(/[^a-z0-9+#.-]+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
  )];
}

// Rank skills against a task using name, category, tags and triggers.
// Returns [] rather than a weak match: telling an agent to load a skill that is only
// loosely related costs it context and teaches it to ignore the suggestion.
function matchSkills(taskText, limit = 5, cwd = process.cwd()) {
  const catalog = getCatalog(cwd);
  const tokens = taskTokens(taskText);
  if (!tokens.length) return [];
  const scored = [];
  for (const s of catalog.skills || []) {
    const name = String(s.name || s.id || "").toLowerCase();
    const cat = String(s.category || "").toLowerCase();
    const desc = String(s.description || "").toLowerCase();
    const tags = (Array.isArray(s.tags) ? s.tags : []).map((t) => String(t).toLowerCase());
    const triggers = (Array.isArray(s.triggers) ? s.triggers : []).map((t) => String(t).toLowerCase());
    const triggerSet = new Set(triggers);
    let score = 0;
    const hits = [];
    let strongHits = 0;   // name or exact-trigger matches, which are real intent
    let nameStrong = 0;   // matched on the skill NAME, the most reliable identifier
    for (const t of tokens) {
      // An exact trigger hit is a strong signal the catalog offers.
      if (triggerSet.has(t)) { score += 16; strongHits++; hits.push(t); continue; }
      // The skill NAME is the most reliable identifier there is, so an exact or
      // near-exact name match must outrank a trigger hit. Catalog trigger lists are
      // derived from prose descriptions and are not exhaustive: the `postgresql`
      // skill has no "postgres" trigger even though the name says it plainly.
      const nameBare = name.replace(/[^a-z0-9]/g, "");
      const tokenBare = t.replace(/[^a-z0-9]/g, "");
      if (nameBare === tokenBare) { score += 20; strongHits += 2; nameStrong += 2; hits.push(t); continue; }
      // Substring matching on a squashed name produces nonsense: "k8ssecuritypolicies"
      // contains the letters "typo" inside "podsecuritypolicy", so "fix a typo" matched
      // a Kubernetes skill. Compare on word boundaries instead, using the original
      // hyphen/underscore/space separated name.
      const nameWords = name.split(/[^a-z0-9]+/).filter(Boolean);
      if (nameWords.some((w) => w === tokenBare) && tokenBare.length > 3) { score += 14; strongHits++; nameStrong++; hits.push(t); continue; }
      // Prefix matching catches the common shorthand: users write "postgres" for the
      // `postgresql` skill, "k8s" for `kubernetes-*`, "a11y" for accessibility. The
      // longer string must be at least 4 characters and the shorter at least 3, or
      // three-letter words collide with everything.
      if (nameWords.some((w) => w.length >= 4 && tokenBare.length >= 3 && (w.startsWith(tokenBare) || tokenBare.startsWith(w)))) {
        score += 14; strongHits++; nameStrong++; hits.push(t); continue;
      }
      if (nameWords.some((w) => w.length > 4 && (w.startsWith(tokenBare) || tokenBare.startsWith(w)))) { score += 10; strongHits++; nameStrong++; hits.push(t); continue; }
      if (name.includes(t)) { score += 8; strongHits++; nameStrong++; hits.push(t); continue; }
      if (tags.some((x) => x === t)) { score += 6; hits.push(t); continue; }
      if (cat === t) { score += 5; hits.push(t); continue; }
      if (cat.includes(t)) { score += 3; hits.push(t); continue; }
      // Same boundary rule as the name: a trigger like "podsecuritypolicy" must not
      // match the word "typo" hiding inside it.
      const trigBare = triggers.map((x) => x.replace(/[^a-z0-9]/g, ""));
      const tokenBare2 = t.replace(/[^a-z0-9]/g, "");
      if (trigBare.some((x) => x === tokenBare2)) { score += 2; hits.push(t); continue; }
      if (tags.some((x) => x.includes(t))) { score += 1; hits.push(t); continue; }
      if (desc.includes(t)) { score += 1; }
    }
    // One incidental word is not a recommendation. Trigger lists are generated from
    // prose, so a Kubernetes security skill legitimately contains the word "typo"
    // somewhere in its description, and a secret-scanning skill contains "leak". Those
    // A skill that only matched weakly is not a recommendation, and neither is one that
    // matched a single incidental word. Trigger lists are generated from prose, so a
    // Kubernetes security skill legitimately contains the word "leak" somewhere and a
    // secret scanner contains "leak" too, without either being about a database pool.
    //
    // A suggestion is credible when any of these hold:
    //   * two or more strong signals (name or exact-trigger matches),
    //   * a very high score, meaning an exact skill-name match,
    //   * one strong signal plus corroboration from a second task word, or
    //   * three or more task words matched in total.
    // `nameStrong` counts matches on the skill NAME specifically. A user who types
    // "postgres" means the postgresql skill, and that has to survive the gate even
    // though it is a single word.
    const credible = strongHits >= 2 || score >= 20 || (strongHits >= 1 && hits.length >= 2)
      || hits.length >= 3 || nameStrong >= 1;
    if (score >= MIN_SCORE && credible) {
      scored.push({ id: s.id, name: s.name, category: s.category, score, matched: [...new Set(hits)].slice(0, 5), description: s.description });
    }
  }
  scored.sort((a, b) => b.score - a.score || String(a.id).localeCompare(String(b.id)));
  return scored.slice(0, limit);
}

module.exports = {
  findCatalogPath,
  getCatalog,
  clearCatalogCache,
  searchSkills,
  getSkill,
  listCategories,
  matchSkills,
  taskTokens,
  STOPWORDS
};
