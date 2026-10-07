// The safe counterpart to security-bad/. Every line here is the corrected form of
// a seeded vulnerability, and security.js must report NOTHING on it.
//
// This file is the half of the contract that matters more than detection: a
// scanner that flags these trains everyone to ignore it, and the real key in the
// next file gets missed. Detection without a clean twin is an untested accusation.

const fs = require("fs");
const path = require("path");

const config = {
  dbPassword: process.env.DB_PASSWORD,      // not a literal
  serviceToken: process.env.SERVICE_TOKEN,
};

const root = path.join(__dirname, "..");    // a specific subdirectory, not bare /

// Parameterised query: the value never becomes SQL syntax.
db.query("SELECT * FROM users WHERE id = ?", [req.body.id]);

// execFile with an argument array: no shell, so no shell metacharacters.
require("child_process").execFile("tar", ["-xf", req.body.file]);

// JSON.parse instead of eval.
const parsed = JSON.parse(rawPayload);

// A real function declaration, not one built from a string.
function evaluate(expr) { return expr; }
const built = evaluate(req.query.expr);

// textContent assigns text, never markup.
node.querySelector("#out").textContent = untrustedHtml;

// createCipheriv with a key and an IV, not the removed createCipher.
const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

// A fixed list of approved steps, not an arbitrary download executed on sight.
const steps = ["download", "verify-signature", "install"];
const todo = steps.filter(Boolean);