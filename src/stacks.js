// Curated rule packs per stack — marketplace idea, built-in and offline.
// Each pack is a short checklist the agent must honor for that stack.
const PACKS = {
  node: ["No console.log secrets", "Pin dependency versions", "Handle promise rejections", "Validate all req inputs"],
  python: ["Pin requirements with ==", "No bare except", "Use venv, never sudo pip", "Type-hint public functions"],
  go: ["Check every error return", "go vet must pass", "No fmt.Print secrets", "Context on all I/O"],
  rust: ["No unwrap in production paths", "cargo check must pass", "Handle Result everywhere"],
  java: ["No printStackTrace to stdout", "Close all streams (try-with-resources)", "Parameterized SQL only"],
  php: ["Escape all output (XSS)", "Prepared statements only", "Validate uploads by mime+size"],
  ruby: ["No eval on user input", "Strong params in controllers", "Pin gems in Gemfile"],
  dart: ["dart analyze must pass", "Dispose all controllers", "No hardcoded API keys"],
  csharp: ["dotnet build must pass", "Async suffix + ConfigureAwait in libs", "No hardcoded connection strings"],
  swift: ["No force-unwrap on network data", "Main-thread UI only", "Keychain for secrets"],
};

function packFor(stackKind) {
  return PACKS[stackKind] || ["Read the map first", "Verify before claiming done"];
}

function renderPack(stackKind) {
  return `\n## Stack pack: ${stackKind}\n` + packFor(stackKind).map((r) => `- [ ] ${r}`).join("\n") + "\n";
}

module.exports = { packFor, renderPack };
