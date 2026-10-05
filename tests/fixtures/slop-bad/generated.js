// Slop fixture: deliberately over-engineered AI-style code. deep-era must flag it.
// Also included: legitimate code that must NOT be flagged.
const { passthrough, deep, parse } = require("./util");
const { logInfo } = require("./logger");

// --- SLOP: passthrough wrappers ------------------------------------------------
function getUser(id) { return fetchUser(id); }
function getUserSafe(id) { return fetchUser(id); }
function getUserSlow(id) { return fetchUser(id); }

// --- SLOP: indirection --------------------------------------------------------
function build() {
  const config = settings;          // renames for nothing
  const opts = config;              // again
  return load(opts);
}

// --- SLOP: call chain ---------------------------------------------------------
const result = wrap(clean(transform(read(raw))));

// --- CLEAN: this must never be flagged -----------------------------------------
function getUserFull(id, opts) {
  const user = await fetchUser(id);
  if (!user) throw new Error("missing");
  return logInfo({ ...user, ...opts });
}

const names = ["a", "b", "c"].map((n) => n.trim()).filter(Boolean).join(",");

function reducer(acc, x) {
  return acc.reduce((memo, item) => memo + item.price, 0) + x;
}

// Real transformation: arguments are NOT passed through unchanged.
function withPrefix(id) {
  return fetchUser(`usr_${id}`);
}

module.exports = {
  getUser, getUserSafe, getUserSlow, build, result,
  getUserFull, names, reducer, withPrefix,
};