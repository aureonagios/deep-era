// CWE + OWASP Top 10 (2021) mapping — the language enterprises buy on.
// Every finding carries its weakness ID; reports and SARIF expose them.
const CWE = {
  "sql-injection": { cwe: "CWE-89", owasp: "A03:2021" },
  "sql-concat": { cwe: "CWE-89", owasp: "A03:2021" },
  "sql-fstring": { cwe: "CWE-89", owasp: "A03:2021" },
  "command-injection": { cwe: "CWE-78", owasp: "A03:2021" },
  "child-exec": { cwe: "CWE-78", owasp: "A03:2021" },
  "py-shell": { cwe: "CWE-78", owasp: "A03:2021" },
  "py-eval-exec": { cwe: "CWE-95", owasp: "A03:2021" },
  "eval-js": { cwe: "CWE-95", owasp: "A03:2021" },
  "new-function": { cwe: "CWE-95", owasp: "A03:2021" },
  "inner-html": { cwe: "CWE-79", owasp: "A03:2021" },
  "doc-write": { cwe: "CWE-79", owasp: "A03:2021" },
  "weak-crypto": { cwe: "CWE-327", owasp: "A02:2021" },
  "aws-key": { cwe: "CWE-798", owasp: "A07:2021" },
  "private-key": { cwe: "CWE-798", owasp: "A07:2021" },
  "openai-key": { cwe: "CWE-798", owasp: "A07:2021" },
  "github-token": { cwe: "CWE-798", owasp: "A07:2021" },
  "discord-webhook": { cwe: "CWE-798", owasp: "A07:2021" },
  "no-env-ignore": { cwe: "CWE-538", owasp: "A01:2021" },
  "no-gitignore": { cwe: "CWE-538", owasp: "A01:2021" },
  "passwd-assign": { cwe: "CWE-798", owasp: "A07:2021" },
  "secret-assign": { cwe: "CWE-798", owasp: "A07:2021" },
  "entropy-secret": { cwe: "CWE-798", owasp: "A07:2021" },
  "leak-file": { cwe: "CWE-538", owasp: "A01:2021" },
  "dep-blocklist": { cwe: "CWE-1104", owasp: "A06:2021" },
  "dep-tarball": { cwe: "CWE-1104", owasp: "A06:2021" },
  "osv-cve": { cwe: "CWE-1104", owasp: "A06:2021" },
  "npm-audit": { cwe: "CWE-1104", owasp: "A06:2021" },
  "dep-unpinned": { cwe: "CWE-1104", owasp: "A06:2021" },
  "rm-rf": { cwe: "CWE-78", owasp: "A03:2021" },
  "curl-bash": { cwe: "CWE-494", owasp: "A08:2021" },
  // Semantic and slop rules carry their weakness id here too, not only in RULE_META.
  // Every consumer of a CWE tag -- SARIF, the doctor report, the MCP audit_work
  // payload -- reads THIS map; without these entries the semantic findings reported
  // with no weakness id at all, which on an enterprise dashboard is indistinguishable
  // from noise. Kept in sync with RULE_META by the corpus test.
  "swallowed-exception": { cwe: "CWE-390", owasp: "A09:2021" },
  "floating-promise": { cwe: "CWE-703", owasp: "A09:2021" },
  "dead-branch": { cwe: "CWE-570", owasp: "A04:2021" },
  "unused-local": { cwe: "CWE-563", owasp: "A04:2021" },
  "tautological-test": { cwe: "CWE-1254", owasp: "A04:2021" },
  "empty-test": { cwe: "CWE-1254", owasp: "A04:2021" },
  "always-passing-suite": { cwe: "CWE-1254", owasp: "A04:2021" },
  "slop-passthrough": { cwe: "CWE-561", owasp: "A04:2021" },
  "slop-chain": { cwe: "CWE-561", owasp: "A04:2021" },
  "slop-indirection": { cwe: "CWE-561", owasp: "A04:2021" },
  "slop-dead-code": { cwe: "CWE-561", owasp: "A04:2021" },
};

function tag(rule) {
  return CWE[rule] || null;
}

function tagSuffix(rule) {
  const t = tag(rule);
  return t ? ` [${t.cwe}/${t.owasp}]` : "";
}

module.exports = { tag, tagSuffix };
