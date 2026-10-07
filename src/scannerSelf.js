// Files that hold detector patterns as string literals.
//
// Every scanner in this project keeps its own trigger words in its source: security.js
// holds the password regex, guardian.js holds the unfinished-work markers in its
// placeholder pattern, claims.js names the completion words it hunts for. Scanning a
// detector as suspect code is a guaranteed false positive -- every rule reports itself.
//
// It is also how two scanners ended up with two separate, drifting exemption lists,
// and a newly written scanner tripped its own rules on the day it was added. One list,
// shared, with the reason recorded once.
module.exports = new Set([
  "src/security.js",
  "src/guardian.js",
  "src/claims.js",
  "src/semantics.js",
  "src/slop.js",
  "src/guard.js",
  "src/scanrules.js",
  ".deep-era/RULES.md",
  "AGENTS.md",
]);