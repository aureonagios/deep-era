const http = require("http");
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("serve-demo-ok");
});
server.listen(18743, "127.0.0.1", () => {
  console.log("serve-demo listening on http://127.0.0.1:18743/");
});
// Self-exit: aborted test runs must never leave orphan servers behind.
setTimeout(() => process.exit(0), 20000).unref();
