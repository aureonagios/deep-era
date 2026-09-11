# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 0.x (latest) | Yes — update with `npm i -g deep-era@latest` (`deep-era update` tells you) |

## Reporting a Vulnerability

**Do not open a public issue** for suspected vulnerabilities.

1. Run `deep-era doctor --sarif` and `deep-era check` on your project — attach outputs.
2. Open a GitHub issue titled `[security]` **without** exploit details, or contact the maintainer via the repo.
3. We aim to acknowledge within 72 hours and ship a fix with a test (every security fix in this repo ships with a regression test — see `tests/`).

## What deep-era already enforces (every run)

- Secrets/key/token scan + high-entropy strings + `.env` leak guard
- Hijacked-package blocklist + OSV.dev CVE lookup (cached, offline-safe)
- SQL/command injection sinks, weak crypto, XSS sinks (plus Python AST precision)
- `deep-era-allow:` file-level suppression (auditable, like `nosec`)
- Findings carry CWE + OWASP Top 10 tags; SARIF for code-scanning

## Scope notes (honest)

- Static analysis only — no DAST, no penetration testing.
- CVE coverage = offline blocklist + OSV.dev best-effort (needs network for fresh data).
- AI-generated code must still pass `deep-era check` — the tool proves, the human decides.
