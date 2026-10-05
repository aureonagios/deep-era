// Zero-dependency Docker Scaffold Generator for AI Deep Era (CommonJS, Node >= 18)
// RULE: user may speak any language. All code, comments, logs and replies: ENGLISH ONLY.
const fs = require("fs");
const path = require("path");

function detectStack(dir = process.cwd()) {
  const hasPkg = fs.existsSync(path.join(dir, "package.json"));
  const hasPy = fs.existsSync(path.join(dir, "requirements.txt")) || fs.existsSync(path.join(dir, "pyproject.toml"));
  const hasGo = fs.existsSync(path.join(dir, "go.mod"));
  const hasRust = fs.existsSync(path.join(dir, "Cargo.toml"));
  const hasIndexHtml = fs.existsSync(path.join(dir, "index.html"));

  if (hasPkg) {
    let pkg = {};
    try { pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8")); } catch {}
    const isNext = (pkg.dependencies && pkg.dependencies.next) || (pkg.devDependencies && pkg.devDependencies.next);
    return { type: isNext ? "nextjs" : "nodejs", pkg };
  }
  if (hasPy) return { type: "python" };
  if (hasGo) return { type: "go" };
  if (hasRust) return { type: "rust" };
  if (hasIndexHtml) return { type: "static" };
  return { type: "nodejs" };
}

function generateDockerScaffold(dir = process.cwd(), port = 3000) {
  const stack = detectStack(dir);
  let dockerfile = "";
  let compose = "";
  const dockerignore = `node_modules
.git
.gitignore
.env
.env.*
.deep-era
dist
build
coverage
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
`;

  if (stack.type === "nextjs") {
    dockerfile = `# Multi-stage Next.js Dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
USER nextjs
EXPOSE ${port}
ENV PORT=${port}
CMD ["npm", "start"]
`;
  } else if (stack.type === "python") {
    dockerfile = `# Production Python Dockerfile
FROM python:3.12-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends gcc && apt-get clean
COPY requirements*.txt ./
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt 2>/dev/null || true

FROM python:3.12-slim
WORKDIR /app
RUN useradd -m -u 1001 appuser
COPY --from=builder /install /usr/local
COPY . .
USER appuser
EXPOSE ${port}
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \\
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:${port}/health')" || exit 1
CMD ["python", "app.py"]
`;
  } else {
    // Default Node.js
    dockerfile = `# Production Node.js Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /app/node_modules ./node_modules
COPY . .
RUN chown -R appuser:appgroup /app
USER appuser
EXPOSE ${port}
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \\
  CMD node -e "require('http').get('http://localhost:${port}/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1
CMD ["node", "server.js"]
`;
  }

  compose = `version: "3.8"
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "${port}:${port}"
    environment:
      - NODE_ENV=production
      - PORT=${port}
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:${port}/ || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
`;

  return { dockerfile, compose, dockerignore, stack: stack.type };
}

function writeDockerFiles(dir = process.cwd(), port = 3000) {
  const { dockerfile, compose, dockerignore, stack } = generateDockerScaffold(dir, port);
  fs.writeFileSync(path.join(dir, "Dockerfile"), dockerfile, "utf8");
  fs.writeFileSync(path.join(dir, "docker-compose.yml"), compose, "utf8");
  fs.writeFileSync(path.join(dir, ".dockerignore"), dockerignore, "utf8");
  return { files: ["Dockerfile", "docker-compose.yml", ".dockerignore"], stack };
}

module.exports = {
  detectStack,
  generateDockerScaffold,
  writeDockerFiles
};
