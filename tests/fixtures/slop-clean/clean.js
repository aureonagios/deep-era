// Clean code that superficially resembles slop but is legitimate.
// deep-era must report ZERO findings for this file, or the rules are useless.
const { logInfo } = require("./logger");

// Real behaviour: validation plus a different call. Not a passthrough.
function getUserFull(id, opts) {
  const user = loadUser(id);
  if (!user) throw new Error("missing");
  return logInfo(Object.assign({}, user, opts));
}

// Standard iteration is not an indirection chain.
const names = ["a", "b", "c"].map((n) => n.trim()).filter(Boolean).join(",");

// A nested reduce is meaningful, not noise.
function total(items, tax) {
  return items.reduce((memo, item) => memo + item.price, 0) + tax;
}

// Argument is genuinely transformed, so it must not count as a wrapper.
function withPrefix(id) {
  return loadUser("usr_" + id);
}

// A long function with a clear job is fine.
function summarise(report) {
  const lines = [];
  for (const row of report.rows) {
    if (!row.total) continue;
    lines.push(`${row.name}: ${row.total}`);
  }
  const sum = lines.reduce((memo, line) => memo + line.length, 0);
  return { lines, sum };
}

module.exports = { getUserFull, names, total, withPrefix, summarise };