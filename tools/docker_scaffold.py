import os
import sys

DOCKERFILE_TEMPLATES = {
    "python": """# Stage 1: Build & Dependencies
FROM python:3.12-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends build-essential && apt-get clean
COPY requirements.txt* pyproject.toml* ./
RUN pip install --no-cache-dir --user -r requirements.txt 2>/dev/null || pip install --no-cache-dir --user .

# Stage 2: Minimal Distroless / Final Runtime
FROM python:3.12-slim AS runner
WORKDIR /app
ENV PATH=/root/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1
COPY --from=builder /root/.local /root/.local
COPY . /app
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
""",

    "node": """# Multi-Stage Node.js Production Dockerfile
FROM node:20-alpine AS base
WORKDIR /app

# Stage 1: Dependencies
FROM base AS deps
COPY package.json package-lock.json* pnpm-lock.yaml* ./
RUN npm ci --omit=dev

# Stage 2: Builder
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build 2>/dev/null || true

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app ./
EXPOSE 3000
CMD ["npm", "start"]
""",

    "static": """# High-Performance Alpine Nginx Container
FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
"""
}

COMPOSE_TEMPLATE = """version: '3.8'

services:
  app:
    build: .
    restart: unless-stopped
    ports:
      - "{port}:{internal_port}"
    environment:
      - NODE_ENV=production
      - ENVIRONMENT=production
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
"""

def generate_docker_files(target_dir, project_type="python", port=8000):
    os.makedirs(target_dir, exist_ok=True)
    
    df_path = os.path.join(target_dir, "Dockerfile")
    compose_path = os.path.join(target_dir, "docker-compose.yml")
    ignore_path = os.path.join(target_dir, ".dockerignore")
    
    internal_port = 8000 if project_type == "python" else (3000 if project_type == "node" else 80)
    
    with open(df_path, "w", encoding="utf-8") as f:
        f.write(DOCKERFILE_TEMPLATES.get(project_type, DOCKERFILE_TEMPLATES["python"]))
        
    with open(compose_path, "w", encoding="utf-8") as f:
        f.write(COMPOSE_TEMPLATE.format(port=port, internal_port=internal_port))
        
    with open(ignore_path, "w", encoding="utf-8") as f:
        f.write(".git\nnode_modules\n.venv\n__pycache__\n*.log\n.env.local\n.env\n")
        
    return df_path, compose_path

if __name__ == "__main__":
    t_dir = sys.argv[1] if len(sys.argv) > 1 else "."
    t_type = sys.argv[2] if len(sys.argv) > 2 else "python"
    df, dc = generate_docker_files(t_dir, t_type)
    print(f"Generated Dockerfile: {df}")
    print(f"Generated docker-compose.yml: {dc}")
