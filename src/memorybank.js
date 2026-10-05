// Zero-dependency Memory Bank for AI Deep Era (CommonJS, Node >= 18)
// RULE: user may speak any language. All code, comments, logs and replies: ENGLISH ONLY.
//
// SECURITY: this file holds decisions the user approved, which routinely include
// credentials, customer names, and unreleased plans. When DEEP_ERA_KEY is set the bank
// is stored as AES-256-GCM ciphertext (see crypt.js) with owner-only file permissions.
// Without the key it stays plaintext, because silently refusing to save would lose the
// user's data, and silently saving plaintext after the user asked for encryption would
// be worse. The mode is recorded in the file so `deep-era bank status` can tell you
// which one you are in.
const fs = require("fs");
const path = require("path");
const crypt = require("./crypt");

function getStoragePath(dir = process.cwd()) {
  const storeDir = path.join(dir, ".deep-era");
  if (!fs.existsSync(storeDir)) {
    try { fs.mkdirSync(storeDir, { recursive: true }); } catch {}
  }
  return path.join(storeDir, "memory_bank.json");
}

const EMPTY = () => ({ version: 1, entries: [] });

function loadMemoryBank(dir = process.cwd(), passphrase = crypt.passphraseFromEnv()) {
  const p = getStoragePath(dir);
  if (!fs.existsSync(p)) return EMPTY();
  let raw = "";
  try { raw = fs.readFileSync(p, "utf8"); } catch { return EMPTY(); }
  if (crypt.isEncrypted(raw)) {
    if (!passphrase) return EMPTY(); // locked: no key, so nothing is readable
    // The salt lives beside the bank, not inside the blob, so it must be passed in.
    try { return JSON.parse(crypt.decrypt(raw, passphrase, crypt.saltPathFor(p))); } catch { return EMPTY(); }
  }
  try { return JSON.parse(raw); } catch { return EMPTY(); }
}

function saveMemoryBank(bank, dir = process.cwd(), passphrase = crypt.passphraseFromEnv()) {
  const p = getStoragePath(dir);
  const json = JSON.stringify(bank, null, 2);
  if (passphrase) {
    crypt.writeEncrypted(p, bank, passphrase);
    return;
  }
  fs.writeFileSync(p, json, "utf8");
}

// Is the stored bank encrypted, and can this process read it?
function bankSecurityStatus(dir = process.cwd()) {
  const p = getStoragePath(dir);
  let encrypted = false;
  try { encrypted = crypt.isEncrypted(fs.readFileSync(p, "utf8")); } catch {}
  const hasKey = !!crypt.passphraseFromEnv();
  return {
    encrypted,
    hasKey,
    state: !encrypted ? "plaintext" : (hasKey ? "encrypted" : "encrypted-locked"),
    advice: !encrypted
      ? "Set DEEP_ERA_KEY to store this bank as AES-256-GCM ciphertext."
      : (hasKey ? "Encrypted with the key from DEEP_ERA_KEY." : "Encrypted, but DEEP_ERA_KEY is not set, so this bank cannot be read."),
  };
}

// One-time migration of an existing plaintext bank. Refuses to run twice, and refuses
// without a key, because rewriting plaintext data with no way to read it back would
// destroy the user's history.
function migrateToEncrypted(dir = process.cwd(), passphrase = crypt.passphraseFromEnv()) {
  const p = getStoragePath(dir);
  if (!fs.existsSync(p)) return { migrated: false, reason: "no bank yet" };
  let raw = "";
  try { raw = fs.readFileSync(p, "utf8"); } catch { return { migrated: false, reason: "cannot read" }; }
  if (crypt.isEncrypted(raw)) return { migrated: false, reason: "already encrypted" };
  if (!passphrase) return { migrated: false, reason: "DEEP_ERA_KEY not set — refusing to encrypt data you could then not read" };
  let parsed;
  try { parsed = JSON.parse(raw); } catch { return { migrated: false, reason: "bank is corrupt JSON, fix it first" }; }
  crypt.writeEncrypted(p, parsed, passphrase);
  return { migrated: true, entries: (parsed.entries || []).length };
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
  saveMemoryBank,
  addMemory,
  searchMemories,
  deleteMemory,
  exportMarkdown,
  bankSecurityStatus,
  migrateToEncrypted
};
