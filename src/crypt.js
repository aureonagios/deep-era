// crypt.js — zero-dependency encryption for the project's sensitive data.
//
// WHY: the memory bank holds decisions the user approved, the session logs hold what
// an AI was asked to do, and both are readable by anything that gets hold of the
// folder (a synced drive, a stolen laptop, a public repo, a CI artefact). Those files
// can contain credentials, customer names, unreleased plans, and anything an agent
// was told. Encrypting at rest means a leaked file is not a leaked secret.
//
// CHOICES, and why each one matters:
//
//   * AES-256-GCM, not AES-CBC. GCM is authenticated: it detects tampering, so an
//     attacker cannot flip ciphertext bits to change what decrypts to.
//   * scrypt to derive the key from a passphrase. A raw passphrase is not a key;
//     scrypt makes brute-forcing it expensive on purpose (N=2^15 needs real memory).
//   * A fresh 12-byte IV per encryption, prepended to the ciphertext. Reusing an IV
//     with the same key in GCM destroys confidentiality outright.
//   * The authentication tag travels with the data. Losing it means refusing to
//     decrypt rather than returning garbage that looks like plaintext.
//   * Zero dependencies: Node's built-in crypto only. This project promises no
//     runtime dependencies and that promise is worth more than a convenience here.
//
// WHAT THIS DOES NOT DO, stated plainly: it does not protect against an attacker who
// already has your passphrase, and it does not hide the existence or size of the
// data. Encryption is not secrecy, it is protection against a leaked file.
const crypto = require("crypto");

const ALGO = "aes-256-gcm";
const IV_BYTES = 12;
const SALT_BYTES = 16;
const KEY_BYTES = 32;
// scrypt cost. N=32768,r=8,p=1 needs ~32 MB and ~100 ms per derivation. That price is
// correct for deriving a key ONCE and is wrong per record: sealing 450 memory entries
// took 70 seconds in testing, which is unusable inside a coding loop.
//
// The fix is one salt per installation, stored next to the data, and one derived key
// cached per process. This is standard practice: a random 16-byte salt defeats rainbow
// tables and cross-installation precomputation, while a per-record salt only ever
// mattered for deriving multiple independent keys from the same passphrase, which is
// not what a local tool does. Uniqueness that GCM actually requires comes from the IV,
// which is still fresh on every single encryption.
const SCRYPT = { N: 32768, r: 8, p: 1, maxmem: 128 * 1024 * 1024 };
const PREFIX = "de256"; // marks an encrypted blob so we never try to parse it as JSON

const KEY_CACHE = new Map();

function deriveKey(passphrase, salt) {
  let entry = KEY_CACHE.get(passphrase);
  if (!entry) { entry = { salt: null, key: null }; KEY_CACHE.set(passphrase, entry); }
  if (entry.key && entry.salt && entry.salt.equals(salt)) return entry.key;
  const key = crypto.scryptSync(Buffer.from(String(passphrase), "utf8"), salt, KEY_BYTES, SCRYPT);
  entry.salt = salt;
  entry.key = key;
  return key;
}

// One salt per project, created on first use. Stored beside the encrypted data, which is
// correct: the salt is not secret, it only has to be unique per installation.
function saltFor(saltPath) {
  const fs = require("fs");
  const path = require("path");
  if (saltPath) {
    try { return Buffer.from(fs.readFileSync(saltPath, "utf8").trim(), "base64"); } catch {}
  }
  return crypto.randomBytes(SALT_BYTES);
}

function ensureSalt(saltPath) {
  const fs = require("fs");
  const path = require("path");
  if (!saltPath) return crypto.randomBytes(SALT_BYTES);
  try { fs.mkdirSync(path.dirname(saltPath), { recursive: true }); } catch {}
  const existing = (() => { try { return fs.readFileSync(saltPath, "utf8").trim(); } catch { return ""; } })();
  if (existing) return Buffer.from(existing, "base64");
  const salt = crypto.randomBytes(SALT_BYTES);
  fs.writeFileSync(saltPath, salt.toString("base64"), { encoding: "utf8", mode: 0o600 });
  return salt;
}

// Returns a string: PREFIX | version | iv | tag | ciphertext, all base64.
// The salt is NOT in the blob: it lives once per installation in saltPath, so a single
// scrypt derivation is amortised across every record instead of repeated per record.
function encrypt(plaintext, passphrase, saltPath) {
  if (!passphrase || String(passphrase).length < 8) {
    throw new Error("passphrase required (min 8 characters)");
  }
  const salt = ensureSalt(saltPath);
  const iv = crypto.randomBytes(IV_BYTES);
  const key = deriveKey(passphrase, salt);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(Buffer.from(String(plaintext), "utf8")), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, "1", iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(".");
}

// Returns the plaintext, or throws. Never returns partially-decrypted garbage.
function decrypt(blob, passphrase, saltPath) {
  if (!isEncrypted(blob)) throw new Error("not an encrypted blob");
  const parts = String(blob).split(".");
  if (parts[0] !== PREFIX || parts[1] !== "1") throw new Error("unrecognised encrypted format");
  const iv = Buffer.from(parts[2], "base64");
  const tag = Buffer.from(parts[3], "base64");
  const data = Buffer.from(parts[4], "base64");
  const salt = saltFor(saltPath);
  const key = deriveKey(passphrase, salt);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  // A wrong passphrase or tampered ciphertext throws here, which is the point.
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

function isEncrypted(blob) {
  return typeof blob === "string" && blob.startsWith(PREFIX + ".1.") && blob.split(".").length === 5;
}

// Where does the key come from? An env var is the only option that does not write the
// secret next to the data it protects, which would defeat the entire exercise.
function passphraseFromEnv() {
  return process.env.DEEP_ERA_KEY || "";
}

// Guarded file helpers: callers never see a half-written file, because a crash between
// truncate and write would destroy the very data being protected.
function writeEncrypted(filePath, plainObject, passphrase) {
  const fs = require("fs");
  const path = require("path");
  const blob = encrypt(JSON.stringify(plainObject), passphrase, saltPathFor(filePath));
  const tmp = filePath + ".tmp";
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(tmp, blob, { encoding: "utf8", mode: 0o600 });
  fs.renameSync(tmp, filePath); // atomic on the same filesystem
  try { fs.chmodSync(filePath, 0o600); } catch {} // owner-only where supported
  return true;
}

function readEncrypted(filePath, passphrase) {
  const fs = require("fs");
  let raw;
  try { raw = fs.readFileSync(filePath, "utf8"); } catch { return null; }
  if (!isEncrypted(raw)) return null; // caller decides whether to migrate it
  try { return JSON.parse(decrypt(raw, passphrase, saltPathFor(filePath))); } catch { return null; }
}

function saltPathFor(filePath) {
  return filePath + ".salt";
}

module.exports = {
  encrypt, decrypt, isEncrypted, writeEncrypted, readEncrypted,
  passphraseFromEnv, saltPathFor, ALGO,
};