// Zero-dependency Memory Bank for AI Deep Era (CommonJS, Node >= 18)
// RULE: user may speak any language. All code, comments, logs and replies: ENGLISH ONLY.
const fs = require("fs");
const path = require("path");

function getStoragePath(dir = process.cwd()) {
  const storeDir = path.join(dir, ".deep-era");
  if (!fs.existsSync(storeDir)) {
    try { fs.mkdirSync(storeDir, { recursive: true }); } catch {}
  }
  return path.join(storeDir, "memory_bank.json");
}

function loadMemoryBank(dir = process.cwd()) {
  const p = getStoragePath(dir);
  if (!fs.existsSync(p)) return { version: 1, entries: [] };
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return { version: 1, entries: [] };
  }
}

function saveMemoryBank(bank, dir = process.cwd()) {
  const p = getStoragePath(dir);
  fs.writeFileSync(p, JSON.stringify(bank, null, 2), "utf8");
}

function addMemory(entry, dir = process.cwd()) {
  const bank = loadMemoryBank(dir);
  const item = {
    id: "mem_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
    kind: entry.kind || "decision",
    title: entry.title || "Untitled Note",
    content: entry.content || "",
    tags: Array.isArray(entry.tags) ? entry.tags : [],
    createdAt: new Date().toISOString()
  };
  bank.entries.unshift(item);
  saveMemoryBank(bank, dir);
  return item;
}

function searchMemories(query = "", kind = null, dir = process.cwd()) {
  const bank = loadMemoryBank(dir);
  const q = (query || "").trim().toLowerCase();
  return bank.entries.filter((e) => {
    if (kind && e.kind !== kind) return false;
    if (!q) return true;
    const matchTitle = (e.title || "").toLowerCase().includes(q);
    const matchContent = (e.content || "").toLowerCase().includes(q);
    const matchTags = (e.tags || []).some((t) => t.toLowerCase().includes(q));
    return matchTitle || matchContent || matchTags;
  });
}

function deleteMemory(id, dir = process.cwd()) {
  const bank = loadMemoryBank(dir);
  const before = bank.entries.length;
  bank.entries = bank.entries.filter((e) => e.id !== id);
  saveMemoryBank(bank, dir);
  return bank.entries.length < before;
}

function exportMarkdown(dir = process.cwd()) {
  const bank = loadMemoryBank(dir);
  let md = "# Project Memory Bank & Architecture Invariants\n\n";
  md += `*Generated at: ${new Date().toISOString()} | Total Memories: ${bank.entries.length}*\n\n`;

  const groups = {};
  for (const e of bank.entries) {
    groups[e.kind] = groups[e.kind] || [];
    groups[e.kind].push(e);
  }

  for (const [k, items] of Object.entries(groups)) {
    md += `## ${k.toUpperCase()} (${items.length})\n\n`;
    for (const item of items) {
      md += `### ${item.title}\n`;
      md += `*ID: \`${item.id}\` | Tags: ${item.tags.join(", ") || "none"} | Date: ${item.createdAt}*\n\n`;
      md += `${item.content}\n\n---\n\n`;
    }
  }
  return md;
}

module.exports = {
  loadMemoryBank,
  addMemory,
  searchMemories,
  deleteMemory,
  exportMarkdown
};
