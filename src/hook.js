const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Git pre-commit hook: runs `deep-era check`-lite (verify+security+guard, no
// network) and blocks the commit on critical/high. Bypass honestly with
// --no-verify. Existing hooks are backed up, never overwritten blindly.
function hookPath(cwd) {
  try {
    const root = execSync("git rev-parse --show-toplevel", { cwd, timeout: 8000 }).toString().trim();
    return { root, hook: path.join(root, ".git", "hooks", "pre-commit") };
  } catch {
    return null;
  }
}

function runHook(cwd, cliAbs) {
  const h = hookPath(cwd);
  if (!h) {
    console.error("[deep-era] hook: not a git repo — nothing to guard.");
    process.exitCode = 1;
    return;
  }
  const body = `#!/bin/sh
# deep-era pre-commit gate (installed by: deep-era hook)
# Blocks critical/high findings. Bypass: git commit --no-verify
node "${cliAbs}" check --hook-mode
STATUS=$?
if [ $STATUS -ne 0 ]; then
  echo "[deep-era] commit blocked — fix findings or re-run: deep-era doctor" >&2
  exit 1
fi
`;
  if (fs.existsSync(h.hook)) {
    const cur = fs.readFileSync(h.hook, "utf8");
    if (cur.includes("deep-era")) {
      console.log("[deep-era] hook: deep-era gate already installed.");
      return h.hook;
    }
    fs.copyFileSync(h.hook, h.hook + ".deep-era.bak");
    console.log("[deep-era] hook: existing hook backed up (.pre-commit.deep-era.bak). Chaining after it.");
    fs.writeFileSync(h.hook, cur.replace(/\s+$/, "") + "\n\n" + body);
  } else {
    fs.writeFileSync(h.hook, body);
    console.log("[deep-era] hook: installed git pre-commit gate.");
  }
  try { fs.chmodSync(h.hook, 0o755); } catch {}
  console.log("Bypass honestly when needed: git commit --no-verify");
  return h.hook;
}

module.exports = { runHook, hookPath };
