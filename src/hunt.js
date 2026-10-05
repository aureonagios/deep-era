// Zero-dependency port hunter & conflict resolver for AI Deep Era (CommonJS, Node >= 18)
// RULE: user may speak any language. All code, comments, logs and replies: ENGLISH ONLY.
const net = require("net");
const { execSync } = require("child_process");

function isPortAvailable(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
}

async function findAvailablePort(startPort = 3000, maxAttempts = 50, host = "127.0.0.1") {
  let port = startPort;
  for (let i = 0; i < maxAttempts; i++) {
    const avail = await isPortAvailable(port, host);
    if (avail) return port;
    port++;
  }
  return null;
}

function getProcessOnPort(port) {
  const isWin = process.platform === "win32";
  try {
    if (isWin) {
      const out = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] });
      const lines = out.split("\n").filter((l) => l.includes(`:${port}`));
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5) {
          const pid = parts[parts.length - 1];
          if (/^\d+$/.test(pid) && pid !== "0") {
            return { pid: parseInt(pid, 10), raw: line.trim() };
          }
        }
      }
    } else {
      const out = execSync(`lsof -i :${port} -t`, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] });
      const pid = out.trim().split("\n")[0];
      if (pid && /^\d+$/.test(pid)) {
        return { pid: parseInt(pid, 10), raw: out.trim() };
      }
    }
  } catch {}
  return null;
}

function killProcessOnPort(port) {
  const proc = getProcessOnPort(port);
  if (!proc) return { killed: false, reason: "No process found on port " + port };
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /F /PID ${proc.pid}`, { stdio: ["pipe", "pipe", "ignore"] });
    } else {
      process.kill(proc.pid, "SIGKILL");
    }
    return { killed: true, pid: proc.pid };
  } catch (err) {
    return { killed: false, error: err.message, pid: proc.pid };
  }
}

async function scanCommonPorts(ports = [3000, 3001, 4173, 5173, 8000, 8080, 8088, 9000]) {
  const results = [];
  for (const p of ports) {
    const free = await isPortAvailable(p);
    const proc = !free ? getProcessOnPort(p) : null;
    results.push({
      port: p,
      status: free ? "AVAILABLE" : "OCCUPIED",
      pid: proc ? proc.pid : null
    });
  }
  return results;
}

module.exports = {
  isPortAvailable,
  findAvailablePort,
  getProcessOnPort,
  killProcessOnPort,
  scanCommonPorts
};
