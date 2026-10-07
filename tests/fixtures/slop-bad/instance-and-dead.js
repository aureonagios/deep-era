// slop-indirection and slop-dead-code had no seeded instance, so nothing had ever
// watched them fire -- the same blind spot that let `unused-local` ship dead. This
// file gives each one a real instance.
//
// Note on dead code: slop-dead-code deliberately skips tests/fixtures/ and refuses
// to judge a file set smaller than four, so it is exercised through a generated
// temp project in tests/run.js rather than from here. Judging reachability inside
// a fixture is meaningless anyway -- a fixture is read by the scanner, never called.

// --- SLOP: indirection -------------------------------------------------------
// Both names are read AFTER the rename, which is what makes the reader translate
// twice. (A rename used only as an initial value is how a loop variable is declared,
// and the engine correctly stays quiet on those.)
function loadSettings() {
  const options = settings;
  const opts = options;
  return readConfig(opts, options);
}

// --- CLEAN: a rename that actually does work must not be flagged --------------
function normalizeEmail(raw) {
  const trimmed = raw.trim();
  return trimmed.toLowerCase();
}

module.exports = { loadSettings, normalizeEmail };