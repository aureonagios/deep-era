# Changelog

> The README shows only the latest version. Everything else lives here, newest first.
> Older than this file: `git log --oneline`.

## v0.57: every skill has to prove it can be found

1228 skills across two vaults (410 vendored + 818 installed) are worth nothing if no
task query surfaces them. `skills --audit` checks each skill against its own keywords:
reachable in the top-5, or listed as an orphan with the exact query that failed.
Measured: 0 orphans, 0 missing triggers, 0 duplicate ids on both vaults.

Getting there exposed two real bugs, both fixed: vendored trigger lists carry junk
words ("you", "are") and whole hyphenated ids that can never match a cleaned query,
so matching now compares on word boundaries; and the credibility gate demanded
corroboration even for exact hits, so single-word lookups silently returned nothing.

## v0.56: installed skills are discoverable, collections supported

Until now, `skill --add` copied files somewhere nothing ever read: the matcher only
read static catalogs that no code wrote, and single-skill validation rejected every
multi-skill collection (the layout large public vaults use). So installing skills
changed nothing observable.

Now `skill --add <git-url>` accepts single-skill repos AND `skills/` collections
(validated per member, bad members reported not fatal), auto-reindexes, and the new
indexer makes everything searchable: `match_skills`, `skills <query>`, and
`guide_task` all see installed skills immediately. Proven against a real 818-skill
vault: 818/818 install, indexed, matched by task, content readable.

Scope, stated plainly: deep-era only READS skill content to rank it — scripts inside
skills are never listed, never executed. Installing a third-party collection is your
explicit choice (some vaults are offensive security content); the agent's REFUSE
rules still govern what gets used.

## v0.55: fewer false alarms, start sets up everything

**The audit stopped crying wolf twice — and `start` is now truly one command.**

Proven on a real project (2 High + 8 Medium in one scan): `rm -rf /var/lib/apt/lists/*`
is standard Dockerfile hygiene, not danger — the old pattern matched any `rm -rf /...`
and flagged it High. Now only bare root, home, `/*`, and unquoted variables match
(14-case matrix pinned by tests). Same scan also proved `import ssl` is stdlib, so it
joined the never-flag set.

Also fixed in the same pass: a bare third-party import with zero manifests anywhere is
no longer called "hallucinated" — it may simply be undeclared, so it gets its own
honest low-severity rule (`unlisted-dependency`) instead of the accusation.

And one command sets up everything by itself: `deep-era start` now wires detected
IDEs into the project and points at the agent paste, `deep-era --version` answers the
question every agent asks first, and the PROMPT carries install/setup/update steps so
no one is told anything twice.

## v0.54: one-command IDE wiring + self-update that works

`deep-era ide` detects which IDEs are actually installed (markers on disk, never
guesses), writes each one's MCP config into the project (merging with a backup, never
overwriting), and prints the agent brief: stack, files, rules location, last audit
verdict, memory count, and the loop.

And `deep-era update` finally works: the package was never published to npm, so the
old registry check 404'd forever while stale installs ran in silence. The source of
truth is now the GitHub repo itself — `update` checks it, `--apply` reinstalls from
it, and `start`/`check` print a one-line notice when a newer release exists. Nothing
installs without `--apply`, and the `check` gate never touches the network.

## v0.53: secret scanning runs everywhere, placeholders stop crying wolf

`guardian.js` (entropy scan, provider tokens, exact `line:col`) used to live behind one
standalone command. `check`, `doctor`, `review`, and the MCP `security_check` /
`review_changes` tools never ran it, so the platform's own best secret scanner was
invisible to its own audit. Now merged into all four, with same-family dedup that
keeps the highest-severity report instead of the first one found.

And `SECRET_KEY="your-secret-key-here"` no longer flags. Weak-but-real values still
flag. Both directions pinned by tests.

## v0.52: the prompt is the product, and 410 skills finally get used

`deep-era prompt` prints the one paste that makes any agent route, remember,
verify and refuse — and `PROMPT.md` ships in the npm tarball, so it works for
every user, not just this repo. The prompt states the specific failure modes the
engines detect (empty catches, floating promises, dead branches, tests that cannot
fail, passthrough layers, dead code) as FAILURES, plus the tool's own limits: no
type checking, some rules deliberately absent, and a clean result means
"nothing found", never "correct".

Skills: the catalog carried a `triggers` array on all 410 skills and nothing read
it. `guide_task` now recommends the ones that apply and refuses when none do.
Three new MCP tools brought the total to 19: `match_skills`, `get_skill`,
`list_skills`.

## v0.51: your data is encrypted, and your 410 skills actually get used

### Encryption at rest (AES-256-GCM, still zero dependencies)

The memory bank holds decisions you approved. The session log holds what an AI was
asked to do. Both routinely contain credentials, customer names, and unreleased plans.
A leaked file was a leaked secret.

```bash
export DEEP_ERA_KEY="your-passphrase"     # never stored next to the data
deep-era memory-bank encrypt               # one-time migration
deep-era memory-bank status                # what state am I in?
```

On disk, the decision `RATE LIMIT locked at 100/min` becomes:

```
de256.1.Kj7f...A2x9.Qw4n...   (no plaintext anywhere in the file)
```

Design choices worth stating, because the defaults matter:

| Choice | Why |
|---|---|
| **AES-256-GCM**, not CBC | GCM is authenticated: tampering is detected, so flipping ciphertext bits cannot change what decrypts |
| **scrypt** for the key | A passphrase is not a key. scrypt makes brute force expensive (32 MB per attempt) |
| **Fresh 12-byte IV** every record | IV reuse with one key destroys GCM confidentiality outright |
| **Auth tag travels with the data** | Losing it means refusing to decrypt, never returning garbage that looks like plaintext |
| **One salt per installation** | Deriving per record cost 155 ms each — 70 seconds to seal 450 entries. Now 1.24 ms: 0.55 s for the same work, 125x faster |
| **Index fields stay readable** | `kind` and `at` stay unencrypted so `timeline` and stats keep working without the key |
| **Atomic writes** | A crash mid-save cannot corrupt what is already on disk |
| **Migration refuses without a key** | Encrypting data you could then not read would destroy your history |

What it does not do: protect against someone who already has your passphrase, or hide
the size and existence of the data. A wrong key returns nothing rather than a guess.

### 410 skills that finally get used

The vault shipped with a `triggers` array on all 410 skills, and **nothing read it.**
A project with 410 skills installed behaved exactly like one with none: the agent had to
know a skill existed and remember its name.

`guide_task` now recommends the ones that apply, and refuses when none do:

```
SKILLS THAT APPLY (4 of the installed catalog) — load before you start:
  - sql-optimization-patterns  [data-ai]  matched: slow, database, queries, indexing
  - python-performance-optimization  [development]  matched: optimize, slow
  - database-optimizer  [infrastructure]  matched: optimize, database
  Load with: deep-era skill sql-optimization-patterns
```

Three new MCP tools (19 total): `match_skills`, `get_skill`, `list_skills`.

Matching is deliberately hard to fool. Measured on this repo, 10/10:

| Task | Result |
|---|---|
| `audit accessibility of the checkout page` | `awesome-accessibility-audit`, `wcag-audit-patterns` |
| `investigate a postgres connection pool` | `postgresql` (matches "postgres" to "postgresql") |
| `deploy to kubernetes with zero downtime` | `k8s-manifest-generator` |
| `fix a typo in a variable name` | **refuses** |
| `blah blah random nonsense` | **refuses** |

Two bugs found by testing rather than reasoning:

- `"k8ssecuritypolicies"` contains the letters `typo` inside `podsecuritypolicy`, so
  "fix a typo" matched a Kubernetes skill. Matching now compares on word boundaries.
- Suggestions were emitted twice, because an edit left a second `push` in place.

Both are pinned by tests. The refusal cases matter most: a wrong suggestion costs the
agent context and, worse, teaches it to skim past the whole section.

### Honest limits

- Trigger lists are generated from prose and are not exhaustive. There is no dedicated
  SQL-injection skill, so "fix the SQL injection" correctly returns nothing rather than
  a security-adjacent guess.
- `.agents/skills/` is **not committed**. 410 third-party skills with no LICENSE and no
  provenance inside an MIT repository is legal risk for zero benefit — the engines never
  read them. Install them separately.
- Encryption covers the memory bank and the session log. Snapshots are left in the clear
  on purpose: a backup you cannot decrypt when you need it is not a backup.

## v0.50: one command, and honest output


`deep-era start` installs, wires your IDE, adds the CI gate, audits the project you are
standing in, and prints what a blind AI developer would have shipped. Real output, from
a throwaway Express app with an OpenAI key, a SQL injection, an empty `catch`, an
unawaited promise, an `if (true)` guard, and three `assert.ok(true)`:

```
Scanned 7 files in your project.
  1 critical   7 high   2 medium   0 low

Here is what a blind AI developer would have shipped:
  [critical] src/server.js:28 — Possible OpenAI/API key
  [high] src/server.js:8 — Possible SQL injection (string concat)
  [high] src/server.js:31 — Always-true guard returning `true`
  [high] tests/app.test.js:2 — `assert.ok(true)` can never fail

8 of these are serious. Any AI agent working on this project should be told:
  "Read AGENTS.md in this project and obey it fully."
```

## v0.49: it finds the code nobody wants to maintain


Ask any developer what is wrong with AI-written code and the answer is never "it does
not compile". It is this, said almost verbatim in the most-upvoted thread on the topic:

> *"the code that is generated is usually humongous... huge amounts of types and
> indirection and functions, calling functions and doing all sorts of nonsense which
> can be done manually, much simpler with fewer lines of code"*
>
> *"It's also hard to tell them not to use AI because **the code does work**."*

That second line is the whole problem. The code runs, so every existing gate passes —
and then somebody spends days untangling it:

> *"increasing my per-hour rate until I'm comfortable spending hundreds of hours
> unspaghettifying code"*

`src/slop.js` detects the structural habits that make code expensive to own:

| Rule | Catches | Severity |
|---|---|---|
| `slop-passthrough` | `function a(x) { return b(x); }` — a layer that adds a name and a stack frame, not behaviour. 3+ in a file means renames cost two edits | medium |
| `slop-dead-code` | A function no caller in the repository ever reaches. Still costs reading, maintenance, and reviewer attention | medium |
| `slop-indirection` | `const config = settings;` — a variable renamed to another name so the reader translates twice | low |
| `slop-chain` | `wrap(clean(transform(read(raw))))` — call levels with nothing in between, forcing the reader to hold the whole nest in their head | low |

**This is not a style linter.** Prettier and ESLint own formatting; duplicating them
would only produce noise. These are the four structural tells that distinguish
"written by a machine that did not have to maintain it" from code a person chose.

### It found slop in its own author

The honest part: run against this repository, the first version of this file reported
**14 findings, all false** — `let closed = false`, `let dirty = false`. Those declare
state, they do not alias anything. After the literal guard it reported **3, all real**,
and all three were genuine slop that I had written myself an hour earlier:

- `const dir = targetDir;` in `bin/cli.js` — an alias for no reason
- `const lineStart = offset;` in `src/semantics.js` — read exactly once
- `const start = offset;` in the same file — same thing

All three are fixed. The tool is now clean on the codebase that wrote it, and every
rule has a test asserting **both** directions, because a linter that cries wolf is
worse than no linter.

## v0.48: it tells the agent WHERE to work, before it writes a line


v0.47 could tell you your code was wrong. **It could not stop your agent from
starting wrong.** `get_context` ranked files by filename substring, so an agent asked
to "add rate limiting to the API" got whichever file happened to contain the word
`api` — often a test or a config. It then guessed, edited the wrong place, and shipped
slop. Guessing the location is where slop actually starts.

`deep-era guide "<what you are about to do>"` — and the MCP tool `guide_task`, which
an agent should call first — answers before any edit:

```
$ deep-era guide "fix the broken link checker in deep era"
TASK CLASS: bugfix
WHY IT MATTERS: Read the failing test FIRST and make it fail before changing anything...

READ FIRST — this repo's own rules (obey them over your defaults):
  - AGENTS.md
  - ARCHITECTURE.md

LIKELY TOUCH — read these before writing anything:
  - src/links.js  (code-js)  [name~"link"]

ALSO AFFECTED — these import what you are about to change:
  - bin/cli.js  (imports src/fix.js — check it still works)
  - src/doctor.js  (imports src/links.js — check it still works)

DO NOT EDIT without an explicit instruction:
  - (^|\/)(node_modules|vendor|\.venv|venv)\/  — third-party code, not yours
  - package-lock\.json$|...  — lockfile, regenerated by the package manager
  - (^|\/)tests?\/fixtures?\/  — fixture, holds deliberately broken input

LOCKED DECISIONS in this project — violating these is a failure:
  - RATE LIMIT locked at 100/min. Reason: infra cost ceiling, user approved

FAILED BEFORE in this project — do not repeat:
  - deploy failed twice: missing STRIPE_KEY env var

ORDER OF WORK (do not reorder):
  1. reproduce   2. locate   3. fix   4. prove
```

Six things it gets right that nothing else does:

1. **Routes by subject, not by verb.** "fix the reactor" does not send the agent to
   `src/fix.js`. Verbs like *fix*, *add*, *update* are stripped before matching.
2. **Says "search" instead of guessing.** For a task with no name match, it returns
   nothing and tells the agent to search by content. Inventing six plausible files is
   worse than admitting it does not know.
3. **Knows your project's own rules.** `AGENTS.md`, `CONTRIBUTING.md`, `.cursorrules`,
   the eslint/prettier config that actually exists. Local convention beats the agent's
   training data.
4. **Protects the files you never meant to touch.** Vendored code, build output,
   lockfiles, minified bundles, and deep-era's own fixtures.
5. **Surfaces locked decisions.** The agent cannot contradict a decision you approved
   three sessions ago because it never read that session.
6. **Names the callers.** Changing a hub without checking its importers is the most
   common way a "small fix" breaks something unrelated.

### The independent-verification point

Every tool in this category has the same hole, and the sharpest comment on Hacker News
about it was: *"You cannot have AI doing code generation and code review together.
Never both."*

**Deep-era contains no AI.** It is static analysis, zero dependencies, ~100 ms. The
same binary catches the same bugs whether a human, Cursor, Claude, or GPT wrote the
code. That is the whole point: it is the part of your pipeline that is not the model.

## What v0.47 adds: it reads the code, not just the syntax


v0.46 could prove a file *parses*. It could not prove the code inside it is *sane*.
Three bugs that an AI writes constantly passed every v0.46 gate:

```ts
// Every one of these was reported as PASS by v0.46.
const x: number = ;                    // TypeScript never parsed at all
return db.doc(id).set(data).catch(() => {});   // rejection dropped, caller told "saved"
fetch("/api/sync", { method: "POST" });        // never awaited, never handled
function isValid(u) { if (true) return true; } // validation that never validates
assert.ok(true);                        // a test that cannot fail
```

`deep-era check` now fails on all five. Two new engines, still zero dependencies:

| Engine | What it proves | Rules |
|---|---|---|
| `src/tsparse.js` | TypeScript / TSX / JSX actually parse | balanced and correctly nested brackets, terminated strings / templates / comments, dangling operators. Reports the exact `line:col`. It does **not** type-check, and says so. |
| `src/semantics.js` | The code does what it appears to do | `swallowed-exception`, `floating-promise`, `dead-branch`, `tautological-test`, `empty-test`, `always-passing-suite` |

Measured on the bug fixtures: **9 findings where v0.46 produced 0**, and **0 false
positives on this repository** (which is deliberately defensive on every optional
read, so it is the hardest available false-positive test). Both directions are
asserted in `tests/run.js`.

**Honest limits, stated up front.** `semantics.js` reports only what cannot be
intentional. Distinguishing "this author deliberately tolerates a failure" from
"the AI forgot to handle it" needs type information and intent that a regex cannot
recover, so best-effort wrappers and defensive degradation are deliberately *not*
reported. An earlier draft flagged 65 findings on this repo; all 65 were false. A
linter that cries wolf is worse than no linter, so the rule was narrowed until every
remaining finding was real.
