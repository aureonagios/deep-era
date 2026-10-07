// Seeded vulnerability fixture: one file per security rule, each line a real
// instance of the defect that rule exists to catch. security.js skips
// tests/fixtures/ so these are never reported as findings in a real audit --
// they exist purely so the scanners can be proved against known-bad input.
//
// Every rule in src/security.js PATTERNS must appear here. A rule with no seeded
// instance is a rule nobody has ever watched work, which is how the dead
// `unused-local` rule survived for versions (CWE-563, metadata but no detector).

// --- secret material (CWE-798) ---
const awsAccessKeyId = "AKIAIOSFODNN7EXAMPLE";            // aws-key
const openaiKey = "sk-proj-abcdefghijklmnopqrstuvwxyz012345"; // openai-key
const ghToken = "ghp_abcdefghijklmnopqrstuvwxyz0123456789";   // github-token
const webhook = "https://discord.com/api/webhooks/123/abc";   // discord-webhook
const dbPassword = "correcthorsebattery";                // passwd-assign
const serviceToken = "zX9kQ2mLp4Rt7";                   // secret-assign
const pem = `-----BEGIN RSA PRIVATE KEY-----`;          // private-key

// --- injection sinks (CWE-78 / CWE-89) ---
require("child_process").exec("tar -xf " + req.body.file); // child-exec
db.query("SELECT * FROM users WHERE id=" + req.body.id);      // sql-concat

// --- code from string (CWE-95) ---
const compiled = eval("JSON.parse(raw)");               // eval-js
const built = new Function(req.query.expr);              // new-function

// --- browser sinks (CWE-79) ---
node.querySelector("#out").innerHTML = untrustedHtml;    // inner-html
document.write(untrustedHtml);                          // doc-write

// --- weak crypto (CWE-327) ---
const cipher = crypto.createCipher("des", key, iv);     // weak-crypto

// --- supply chain + destructive shell (CWE-494 / CWE-78) ---
// TODO: switch to the streaming installer   <- todo-fixme