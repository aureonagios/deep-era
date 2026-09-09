const db = require("./db");
function getUser(req, res) {
  // INTENTIONAL BUG 1: SQL injection (generic guard must catch)
  db.execute(f"SELECT * FROM users WHERE id = '{req.query.id}'");
}
