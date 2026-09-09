// Memory v0.5 — never forget a single project chat/decision, while keeping tokens low.
// Store: .deep-era/logs/memory.jsonl (append-only). Recall: keyword-scored + char budget.
const fs = require("fs");
const path = require("path");

function memFile(cwd) {
  return path.join(cwd, ".deep-era", "logs", "memory.jsonl");
}

function remember(cwd, kind, text) {
  const clean = (text || "").toString().slice(0, 2000).trim();
  if (!clean) throw new Error("empty memory");
  if (!["chat", "decision", "fix", "error", "note"].includes(kind)) kind = "note";
  // Dedupe: same kind+text twice = noise, skip (saves tokens forever)
  const existing = readAll(cwd, 500);
  if (existing.some((e) => e.kind === kind && e.text === clean)) {
    return { at: existing.find((e) => e.kind === kind && e.text === clean).at, kind, text: clean, duplicate: true };
  }
  const entry = { at: new Date().toISOString(), kind, text: clean, weight: weightOf(kind, clean) };
  fs.mkdirSync(path.dirname(memFile(cwd)), { recursive: true });
  fs.appendFileSync(memFile(cwd), JSON.stringify(entry) + "\n");
  compact(cwd);
  return entry;
}

// Importance: decisions and errors outrank chats — the AI recalls what matters first
function weightOf(kind, text) {
  let w = 1;
  if (kind === "decision") w = 5;
  else if (kind === "error") w = 3;
  else if (kind === "fix") w = 2;
  if (text.length > 500) w += 1;
  return w;
}

// Auto-compact: file grows past 400 lines → keep all decisions/errors, squeeze old chats.
// Local, instant, no embeddings, no cloud — better than mem0 for a coding loop.
function compact(cwd) {
  try {
    const raw = fs.readFileSync(memFile(cwd), "utf8").split("\n").filter(Boolean);
    if (raw.length <= 400) return;
    const all = raw.map((l) => JSON.parse(l));
    const keep = all.filter((e) => e.kind === "decision" || e.kind === "error");
    const chats = all.filter((e) => e.kind !== "decision" && e.kind !== "error").slice(-150);
    const merged = [...keep, ...chats].sort((a, b) => (a.at < b.at ? -1 : 1)).slice(-400);
    fs.writeFileSync(memFile(cwd), merged.map((e) => JSON.stringify(e)).join("\n") + "\n");
  } catch { /* memory must never break the build */ }
}

function readAll(cwd, maxEntries = 500) {
  try {
    const lines = fs.readFileSync(memFile(cwd), "utf8").split("\n").filter(Boolean);
    return lines.slice(-maxEntries).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}

// Coding thesaurus: "bug" should find "error" and "fix" memories.
// Curated, offline, zero-dep — a slice of semantic search without embeddings.
const SYNONYMS = {
  bug: ["error", "fix", "broken", "fail"],
  error: ["bug", "fix", "broken", "fail", "exception"],
  fix: ["error", "bug", "patch", "repair"],
  fail: ["error", "bug", "broken"],
  auth: ["login", "token", "secret", "password"],
  login: ["auth", "token", "session"],
  token: ["auth", "secret", "key"],
  secret: ["token", "key", "password"],
  slow: ["performance", "perf", "latency", "speed"],
  performance: ["slow", "perf", "speed", "latency"],
  test: ["verify", "check", "spec"],
  verify: ["test", "check", "audit"],
  deploy: ["release", "publish", "ship"],
  docs: ["readme", "guide", "comment"],
  refactor: ["cleanup", "restructure", "simplify"],
  limit: ["cap", "throttle", "quota"],
  memory: ["recall", "remember", "context"],
};

function expandQuery(q) {
  const out = [...q];
  for (const tok of q) {
    for (const s of (SYNONYMS[tok] || [])) if (!out.includes(s)) out.push(s);
  }
  return out;
}

// Distributional expansion: words that OFTEN appear together in THIS project's
// memory are related here (a tiny, local, honest slice of distributional semantics).
// E.g. if "webhook" co-occurs with "discord" 3+ times, querying "discord" recalls webhooks.
function expandDistributional(all, q) {
  const co = {};
  for (const e of all) {
    const toks = [...new Set(((e.text || "").toLowerCase().match(/[a-z0-9_./-]{3,}/g) || []))];
    for (const a of toks) {
      co[a] = co[a] || {};
      for (const b of toks) {
        if (a !== b) co[a][b] = (co[a][b] || 0) + 1;
      }
    }
  }
  const out = [...q];
  for (const tok of q) {
    const rel = Object.entries(co[tok] || {}).filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]).slice(0, 2);
    for (const [w] of rel) if (!out.includes(w)) out.push(w);
  }
  return out;
}

// recall: decisions ALWAYS included (locks must hold), rest TF-IDF ranked, total <= budget chars.
// Rare query words (e.g. "webhook") outrank common ones (e.g. "fix") — relevance without embeddings.
function recall(cwd, query, budget = 4000) {
  const all = readAll(cwd);
  const decisions = all.filter((e) => e.kind === "decision").slice(-10);
  const q0 = (query || "").toLowerCase().split(/[^a-z0-9_./-]+/).filter(Boolean);
  const q = expandDistributional(all, expandQuery(q0));
  // Document frequency over memory texts for IDF
  const df = {};
  const toksOf = all.map((e) => {
    const set = new Set(((e.text || "").toLowerCase().match(/[a-z0-9_./-]{3,}/g) || []));
    for (const t of set) df[t] = (df[t] || 0) + 1;
    return set;
  });
  const N = all.length || 1;
  const idf = (t) => Math.log((N + 1) / ((df[t] || 0) + 1)) + 1;
  const rest = all.filter((e) => e.kind !== "decision");
  const scored = rest.map((e) => {
    const idx = all.indexOf(e);
    const t = toksOf[idx];
    const raw = (e.text || "").toLowerCase();
    let s = (e.weight || 1) * 0.5;
    for (const tok of q) {
      if (t.has(tok)) s += 2 * idf(tok);
      else if (raw.includes(tok)) s += 0.5; // stemming fallback, weak vote
    }
    return { e, s };
  });
  scored.sort((a, b) => b.s - a.s || (a.e.at < b.e.at ? 1 : -1));
  const picked = scored.filter((x) => x.s > 0).slice(0, 12).map((x) => x.e);
  // Empty query = fresh session: take the last 6
  const base = q.length ? picked : rest.slice(-6);
  const out = [];
  let used = 0;
  for (const e of [...decisions, ...base]) {
    const line = `[${e.at.slice(0, 16)}|${e.kind}] ${e.text}`;
    if (used + line.length > budget) break;
    if (out.some((o) => o.text === e.text && o.kind === e.kind)) continue;
    out.push(e);
    used += line.length;
  }
  return { entries: out, chars: used, total: all.length };
}

module.exports = { remember, recall, readAll };
