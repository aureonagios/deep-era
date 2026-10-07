// The claim-vs-reality gap: code that says it did something it never did.
//
// Every rule here was written against a real, observed failure -- an AI shipping a
// demo that reports success it never produced. They share one shape: a *claim* of
// an effect (stored, sent, measured, executed, encrypted) with no operation that
// could produce it. Detection alone is half the job, so each rule also has a
// "looks like this but is fine" carve-out proven by the paired clean fixture.
//
// Precision is the whole game here. A scanner that cries wolf on `await sleep(50)`
// in a retry backoff, or on a `console.log` in a CLI, gets switched off -- and then
// the real fabrication ships. Every exemption below was written after a false
// accusation, not before.
const fs = require("fs");
const path = require("path");

const CODE_EXT = /\.(js|ts|tsx|jsx|mjs|cjs|py|go|rs|java|php|rb|cs|dart|swift|kt|cpp|h|hpp|cc)$/;

function readIfSmall(cwd, file, max = 250000) {
  try {
    const st = fs.statSync(path.join(cwd, file));
    if (st.size === 0 || st.size > max) return null;
    return fs.readFileSync(path.join(cwd, file), "utf8");
  } catch {
    return null;
  }
}

// Lines that are obviously a human writing about the rule, not code tripping it.
function isComment(line) {
  return /^\s*(\/\/|#|\*|\/\*|<!--|;)/.test(line);
}

// --- 1. synthetic-latency -----------------------------------------------------
// A sleep standing in for work that never happens. `sleep_for(150)` followed by a
// "done" claim is a fabricated measurement: the number is the sleep, not the work.
//
// Exempt, because all of these are real and legitimate:
//   - named as a timeout/retry/backoff/poll/jitter/cooldown (waiting IS the work)
//   - a test asserting on timing behaviour
//   - a zero duration (a scheduling yield), not a wall-clock wait
//
// Bare `sleep_for(150)` with no unit is the C++ idiom and means MICROseconds --
// treating it as seconds made the duration 150000ms and it slipped past the cap
// below, which is how the seeded case went unnoticed at first.
const SLEEP_CALL = /\b(?:sleep_for|time\.sleep|usleep|nanosleep|std::this_thread::sleep_for|sleep)\s*\(\s*(\d+(?:\.\d+)?)\s*(ms|us|ns|s|m)?\s*(?:\)\s*;|\)\s*\))/;
const BARE_SLEEP_US = /^\s*(?:std::this_thread::)?sleep_for\s*\(\s*\d+\s*\)\s*;/;
const SLEEP_IS_WAITING = /\b(timeout|timed_?out|retry|retries|backoff|back_off|poll|polling|heartbeat|jitter|cooldown|cool_down|debounce|throttle|quota|rate_?limit|settle|grace|yield)\w*/i;

function scanSyntheticLatency(cwd, files, out) {
  let hits = 0;
  for (const f of files) {
    if (!CODE_EXT.test(f.file)) continue;
    if (f.file.startsWith("tests/fixtures/")) continue;
    const txt = readIfSmall(cwd, f.file);
    if (!txt) continue;
    const lines = txt.split("\n");
    for (let i = 0; i < lines.length && hits < 12; i++) {
      const line = lines[i];
      if (isComment(line)) continue;
      const m = SLEEP_CALL.exec(line);
      if (!m) continue;
      const amount = parseFloat(m[1]);
      // A bare `sleep_for(150)` is the C++ microsecond idiom; only spell out units
      // for the others, because `time.sleep(0.15)` in Python is seconds.
      const unit = m[2] || (BARE_SLEEP_US.test(line) ? "us" : "s");
      // A zero sleep is a scheduling yield, not a fake measurement.
      if (amount === 0) continue;
      if (SLEEP_IS_WAITING.test(line)) continue;
      if (/(^|\/)(tests?|__tests__|spec)\//.test(f.file) || /\.(test|spec)\.[jt]sx?$/.test(f.file)) continue;
      // Only flag durations small enough to be a stand-in for real work. A 30s
      // sleep in a script is usually a genuine pause; a 150us one is theatre.
      const ms = unit === "s" ? amount * 1000 : unit === "m" ? amount * 60000 : unit === "ns" ? amount / 1e6 : amount;
      if (ms > 2000) continue;
      // Heuristic, but load-bearing: a sleep whose next few lines claim a result.
      const after = lines.slice(i + 1, i + 4).join(" ");
      const claimsResult = /\b(latency|elapsed|duration|took|measured|benchmark|throughput|ready|done|complete|success|saved|stored|sent|executed)\w*/i.test(after)
        || /\b(latency|elapsed|took|measured|ready|done|success)\w*/i.test(line);
      if (!claimsResult) continue;
      hits++;
      out.push({
        sev: "high", rule: "synthetic-latency", file: f.file, line: i + 1,
        msg: `\`${m[0].trim()}\` sits next to a success/measurement claim. A sleep does not do work -- it only makes the wait look long. Time the real operation, or drop the claim.`,
      });
    }
  }
}

// --- 2. stub-claims-success ---------------------------------------------------
// The worst of the five: the program prints that it stored/sent/executed something
// while the only statement is a print. Nothing is written, nothing is sent, and the
// user is told it worked.
//
// Requires the claim AND the absence of any effect in a window around it -- a genuine
// call to a write/send/exec/file/network primitive clears it, because by then the line
// does what it says.
//
// The window looks BACK as well as forward. Two measured false accusations on the
// clean fixture: `vault.insert(record)` sits two lines above the print that reports
// it, and `handle.write(...)` one line above. Checking only forward flagged both --
// the effect existed, the scanner had simply not looked far enough to see it.
const SUCCESS_VERB = /\b(success(ful(ly)?)?|added|saved|stored|persisted|committed|sent|uploaded|executed|processed|written|inserted|queued|dispatched|published|recorded|registered|done)\b/i;
const REAL_EFFECT = /\b(write|append|insert|save|store|persist|commit|send|post|put|publish|emit|dispatch|exec|spawn|request|fetch|axios|requests\.|db\.|cursor\.|session\.|collection\.|pipe|queue|socket|unlink|rename|mkdir|open\s*\()/i;
// Any call at all counts as work. A fabricated `print("saved")` body calls nothing
// but the print; an honest one calls something. Kept deliberately dumb on purpose --
// see the note at the use site for the measured false accusations that a smarter
// whitelist produced.
//
// No `return` alternative: Python fixtures use `return True` as a stub tell, and a
// function that only returns a constant has still done nothing.
const ANY_CALL = /\b[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*\s*\(/;
// The function's own signature is a call-shaped match, not work. `def add_to_vault(record):`
// reads as a call to `add_to_vault` and satisfied the rule, which is how the seeded
// Python fabrication came back clean. Return types and pointers count, so the C++
// shape `int execute_pending_order(const Order& order) {` is covered too.
const DEF_LINE = /^\s*(?:[\w:<>*&\[\]]+\s+)?(?:def|async\s+def|class|function|func|fn|auto|void|int|bool|string|double|float)\s+[A-Za-z_$][\w$]*\s*\(.*$/;
const PRINT_ONLY = /^\s*(?:std::)?(?:cout|cerr)\s*<<|^\s*(?:console\.(?:log|info|warn|error|debug)|print|println|printf|fmt\.Print(?:f|ln)?|log\.(?:Print|Printf|Println))\s*\(/;

// The nearest line above `start` that opens a brace, or -1 when the walk hits a
// top-level statement first (nothing encloses this claim).
function findBraceLine(lines, start) {
  for (let i = start; i >= 0; i--) {
    if (isComment(lines[i])) continue;
    if (/[{}]\s*$/.test(lines[i])) return i;
    if (/^\S/.test(lines[i]) && i < start) return -1;
  }
  return -1;
}

// Evidence comes from the ENCLOSING FUNCTION, not a line window. A window was
// tried first and is the wrong tool: widening it to 5 lines silenced four real CLI
// reports on this repo, while narrowing it to 2 flagged six. Any fixed width
// guesses wrong in both directions. The honest question is "does this function do
// anything at all?", and the answer is the whole body.
function enclosingFunctionBody(lines, start) {
  // Python and other brace-less languages: the nearest `def`/`class` above is the
  // boundary. Without this the brace scan found nothing, fell back to a blind
  // 12-line lookback, and read a COMMENT mentioning the print -- so the seeded
  // Python fabrication came back clean.
  if (/^\s*(def|async def|class)\s/.test(lines[start] || "")) return lines.slice(start).join("\n");
let pyOpen = -1;
  for (let i = start; i >= 0; i--) {
    // A comment is not a boundary. Skipping it matters: the walk stops at the first
    // line starting in column 0, and a top-level comment before the `def` ended the
    // search early, so the body fell back to a blind lookback that swept the comment
    // in with the code -- and a comment naming an effect call then read as work.
    if (isComment(lines[i])) continue;
    if (/^\s*(def|async def|class)\s+\w+.*:\s*$/.test(lines[i])) { pyOpen = i; break; }
    if (/^\S/.test(lines[i]) && i < start) break;
  }
  // Find the nearest opening brace above, then its matching close.
  const open = pyOpen !== -1 ? pyOpen : findBraceLine(lines, start);
    if (open === -1) return lines.slice(Math.max(0, start - 12), start + 3).join("\n");
  if (pyOpen !== -1) {
    // Python body ends where indentation drops back to the def's own level.
    const indent = (lines[pyOpen].match(/^\s*/) || [""])[0].length;
    for (let i = pyOpen + 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      if ((lines[i].match(/^\s*/) || [""])[0].length <= indent) return lines.slice(pyOpen, i).join("\n");
    }
    return lines.slice(pyOpen).join("\n");
  }
  let depth = 0;
  for (let i = open; i < lines.length; i++) {
    depth += (lines[i].match(/\{/g) || []).length;
    depth -= (lines[i].match(/\}/g) || []).length;
    if (i > open && depth <= 0) return lines.slice(open, i + 1).join("\n");
    if (i === open && depth <= 0) return lines.slice(open, start + 3).join("\n");
  }
  return lines.slice(open, start + 3).join("\n");
}

// Drop comments before looking for effect calls. A comment reading "nothing is
// stored anywhere" is prose, not code, and matching it hid a real fabrication: the
// seeded `add_to_vault` came back clean because its own comment happened to contain
// the words the rule looks for.
function stripComments(txt) {
  return txt
    .split("\n")
    .map((l) => l.replace(/\/\/.*$/, "").replace(/(^|\s)#.*$/, "$1"))
    .join("\n");
}

function scanStubClaimsSuccess(cwd, files, out) {
  let hits = 0;
  for (const f of files) {
    if (!CODE_EXT.test(f.file)) continue;
    if (f.file.startsWith("tests/fixtures/")) continue;
    const txt = readIfSmall(cwd, f.file);
    if (!txt) continue;
    const lines = txt.split("\n");
    for (let i = 0; i < lines.length && hits < 12; i++) {
      const line = lines[i];
      if (isComment(line)) continue;
      if (!PRINT_ONLY.test(line)) continue;
      if (!SUCCESS_VERB.test(line)) continue;
      // Evidence lives in the function this line belongs to, comments removed.
      const body = stripComments(enclosingFunctionBody(lines, i));
      // Strip the print being evaluated: a print of "success" is not a send. Strip the
      // definition line too, for the reason on DEF_LINE.
      const withoutClaim = body.split("\n").filter((l) => !PRINT_ONLY.test(l) && !DEF_LINE.test(l)).join("\n");
      // A fabricated claim's function calls nothing but the print. An honest one calls
      // something -- `vault.insert(...)`, `safeFix(...)`, `exchange.submit(...)`.
      //
      // Whitelisting "real" callee names was tried and is the wrong tool: `safeFix`
      // is a local domain function that no static list could know, so four honest CLI
      // reports were flagged as fabrications on this repo. "Did it call anything" is
      // the question that generalises across every language and every domain.
      if (REAL_EFFECT.test(withoutClaim) || ANY_CALL.test(withoutClaim)) continue;
      // A verb inside the printed string is the claim being made, not evidence for it.
// `printf("Order sent successfully")` contains "sent" -- if the line itself counted
// as effect evidence, every print of a success word would silence the rule, which is
// exactly backwards. The claim is removed from the evidence, not counted as work.
      if (REAL_EFFECT.test(stripComments(line).replace(SUCCESS_VERB, ""))) continue;
      // A bare log line in a CLI reporting a command that genuinely ran is fine.
      // The tell is the claim about a *persistent* effect with no call that makes it.
      if (/\b(exit|version|usage|help|starting|listening|ready|found|loaded|cached)\b/i.test(line) && !/\b(success|added|saved|stored|persisted|committed|sent|uploaded|inserted|published|recorded)\b/i.test(line)) continue;
      hits++;
      out.push({
        sev: "critical", rule: "stub-claims-success", file: f.file, line: i + 1,
        msg: `Reports success (${(line.match(SUCCESS_VERB) || ["?"])[0]}) but no write, send or exec appears around it. Nothing was persisted. Call the real operation, or say plainly that this is a prototype.`,
      });
    }
  }
}

// --- 3. hardcoded-market-data -------------------------------------------------
// A constant shaped like a real market value. Safe in a test fixture, dangerous in
// a trading path: if a stale price ever reaches an order, real money moves at the
// wrong number. The dollar amount alone is not enough (invoice totals, prices in
// configs) -- it has to look like a *quote*: a 5-6 digit value with decimals, or a
// value assigned to a name that says price/quote/rate/tick.
// `\b` cannot open a match after an underscore -- `_` is a word character, so
// `CURRENT_BTC_PRICE` and `BTC_USD_PRICE` (exactly the names a trading file uses)
// never matched at all. Measured: the guard existed, the rule just never saw the most
// common real-world spelling of the thing it was written to catch.
const QUOTE_NAME = /((?:price|quote|quote_?price|last_?price|mark_?price|mid_?price|spot_?price|ask|bid|last_?tick|exchange_?rate|fx_?rate|rate_?price|ticker)\w*)\s*(?:=|:)\s*(\d[\d,]*\.?\d*)/i;
const DOC_EXEMPT = /(example|sample|fixture|dummy|fake|placeholder|mock|test|spec|\.md$|README|CHANGELOG)/i;

function scanHardcodedMarketData(cwd, files, out) {
  let hits = 0;
  for (const f of files) {
    if (!CODE_EXT.test(f.file)) continue;
    if (f.file.startsWith("tests/fixtures/")) continue;
    if (/(^|\/)(tests?|__tests__|spec)\//.test(f.file) || /\.(test|spec)\.[jt]sx?$/.test(f.file)) continue;
    if (DOC_EXEMPT.test(f.file)) continue;
    const txt = readIfSmall(cwd, f.file);
    if (!txt) continue;
    const lines = txt.split("\n");
    for (let i = 0; i < lines.length && hits < 10; i++) {
      const line = lines[i];
      if (isComment(line)) continue;
      const m = QUOTE_NAME.exec(line);
      if (!m) continue;
      const raw = String(m[2]).replace(/,/g, "");
      const val = parseFloat(raw);
      if (!Number.isFinite(val) || val <= 0) continue;
      // Integer-ish small numbers are configuration (a port, a retry count), not a quote.
      if (val < 1000) continue;
      // No currency symbol and no decimals on a 4-digit-plus number is a count,
      // an ID, or a limit -- not a price.
      if (!/[.,]\d/.test(raw)) continue;
      hits++;
      out.push({
        sev: "critical", rule: "hardcoded-market-data", file: f.file, line: i + 1,
        msg: `\`${m[1]}\` is a hardcoded quote-shaped constant (${raw}). If this ever reaches an order path it trades real money at a stale number. Read it from the feed or the config; never inline it.`,
      });
    }
  }
}

// --- 4. installed-but-unused --------------------------------------------------
// `pip install torch` is not a working model. This catches a declared dependency
// the code never actually uses -- the exact shape of "installed, therefore done".
//
// Measured against a real miss before being written: a declared-but-unimported
// package was reported here that WAS used, dynamically, via `importlib.import_module`.
// So dynamic-import forms are exempt rather than reported.
const DYNAMIC_IMPORT = /\b(importlib\.import_module|__import__|require\s*\(\s*[a-zA-Z_$][\w$]*\s*\)|import_module\s*\()/;

function scanInstalledButUnused(cwd, files, out) {
  // Declared deps with the file that declares them.
  const declared = new Map();
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf8"));
    for (const n of Object.keys(Object.assign({}, pkg.dependencies, pkg.devDependencies))) declared.set(n, "package.json");
  } catch {}
  try {
    for (const line of fs.readFileSync(path.join(cwd, "requirements.txt"), "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const m = t.match(/^([A-Za-z0-9_.-]+)/);
      if (m) declared.set(m[1], "requirements.txt");
    }
  } catch {}
  if (!declared.size) return;

  // Which names the source actually mentions.
  const mentioned = new Set();
  let anyDynamic = false;
  for (const f of files) {
    if (!CODE_EXT.test(f.file)) continue;
    if (f.file.startsWith("tests/fixtures/")) continue;
    const txt = readIfSmall(cwd, f.file, 400000);
    if (!txt) continue;
    if (DYNAMIC_IMPORT.test(txt)) anyDynamic = true;
    for (const name of declared.keys()) {
      const stem = name.replace(/[-_]/g, "[-_]");
      if (new RegExp(`(?:require\\s*\\(\\s*["']|from\\s+["']|import\\s+)${stem.replace(/[-]/g, "\\-")}(?:[/"'])`).test(txt)) mentioned.add(name);
    }
  }
  // Dynamic import anywhere means any package could be loaded at runtime; reporting
  // an accusation here would be a guess, and a wrong accusation is worse than a miss.
  if (anyDynamic) return;

  let hits = 0;
  for (const [name, manifest] of declared) {
    if (mentioned.has(name) || hits >= 10) continue;
    hits++;
    out.push({
      sev: "medium", rule: "installed-but-unused", file: manifest,
      msg: `\`${name}\` is declared as a dependency but no source file imports it. Declaring a package is not using it -- if this is meant to be wired up, the import is missing; if not, drop the dependency.`,
    });
  }
}

// --- 5. marker-pretending-to-be-done -----------------------------------------
// A task marker next to a completion claim. `TODO: implement` sitting above a
// function that reports the feature works is a stub wearing a working label.
//
// Comment lines are skipped when finding the marker itself is wrong: in Python and
// JavaScript a task marker IS a comment, so that rule would never fire anywhere.
// What matters is where the *completion claim* sits: in code, not in prose. So the
// marker may be a comment, but the claim must be an executable line -- otherwise a
// sentence like "a stub that claims success" gets accused.
function scanMarkerPretendingDone(cwd, files, out) {
  let hits = 0;
  for (const f of files) {
    if (!CODE_EXT.test(f.file)) continue;
    if (f.file.startsWith("tests/fixtures/")) continue;
    const txt = readIfSmall(cwd, f.file);
    if (!txt) continue;
    const lines = txt.split("\n");
    for (let i = 0; i < lines.length && hits < 12; i++) {
      const line = lines[i];
      // A marker is an assertion that THIS code is unfinished. "stub" and
      // "placeholder" are words people also write ABOUT things, and that reading
      // produced a measured false accusation ("the work the stub only claimed").
      // The canonical markers are unambiguous, so those are the ones this trusts.
      if (!/\b(TODO|FIXME|XXX|HACK|not implemented|unimplemented)\b/i.test(line)) continue;
      // The claim has to be code that runs. A comment describing the problem is not
      // the problem.
      // "returns?" used to be in this list and matched every `return` statement in the
// language, which is a statement rather than a completion claim. It made any function
// containing an unfinished-work marker look finished. A claim is a word about state
// ("complete", "ready", "done"), not a control-flow keyword.
const CLAIMS_DONE = /\b(implemented|complete[ds]?|finished|ready|working|done|successful|success|production|shipped|enabled)\b/i;
const after = lines.slice(i + 1, i + 6).filter((l) => !isComment(l)).join(" ");
      const claimsDone = CLAIMS_DONE.test(after);
      if (!claimsDone) continue;
      hits++;
      out.push({
        sev: "high", rule: "marker-pretending-done", file: f.file, line: i + 1,
        msg: `Unfinished-work marker followed by a completion claim in code. Either finish the work or stop claiming it is done -- a stub that reports success is worse than an honest gap.`,
      });
    }
  }
}

// Scanner sources hold their own trigger words as literals -- claims.js contains
// "TODO" and "stub" in its regexes, guardian.js in its placeholder pattern -- so
// scanning them as suspect code is a guaranteed false positive. One shared list with
// security.js, so a new scanner cannot forget to exempt itself.
const SCANNER_SOURCES = require("./scannerSelf");

function claimScan(cwd, files) {
  const out = [];
  const targets = files.filter((f) => !SCANNER_SOURCES.has(f.file));
  scanSyntheticLatency(cwd, targets, out);
  scanStubClaimsSuccess(cwd, targets, out);
  scanHardcodedMarketData(cwd, targets, out);
  scanInstalledButUnused(cwd, targets, out);
  scanMarkerPretendingDone(cwd, targets, out);
  return out;
}

// The rule ids this module implements, for the corpus test that refuses to let a
// rule exist here without a seeded instance. Derived from the exported scanner
// names so a sixth scanner cannot be added without the test noticing.
const RULE_IDS = {
  scanSyntheticLatency: "synthetic-latency",
  scanStubClaimsSuccess: "stub-claims-success",
  scanHardcodedMarketData: "hardcoded-market-data",
  scanInstalledButUnused: "installed-but-unused",
  scanMarkerPretendingDone: "marker-pretending-done",
};

function claimRuleIds() {
  return Object.values(RULE_IDS);
}

module.exports = { claimScan, claimRuleIds, stripComments, scanSyntheticLatency, scanStubClaimsSuccess, scanHardcodedMarketData, scanInstalledButUnused, scanMarkerPretendingDone };