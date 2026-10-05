# OMNI TRADE CORE LOGIC (LOCKED)
- **Moon Bag Strategy**: NEVER modify the core logic of the Moon Bag, Micro-Scalp, and Trailing Stop Loss in cognitive_trader.py and database_tier.py.
- **Profit Extraction Rule (100% Halal Spot-Only)**: The system MUST operate strictly on 100% Cash Spot Trading (ZERO Leverage, ZERO Margin Borrowing, ZERO Futures, ZERO Shorting, ZERO Riba/Interest). The system MUST extract initial capital + partial profit on the first fee-adjusted micro target (dynamically calculated as: Spot Round-Trip Fee + Slippage + Net Profit Target, e.g., +0.6% to +1.5% on Halal Spot assets, guaranteeing net-positive profit after exchange commissions), mark the trade as 'MOON_BAG' in the database, and KEEP the remaining trade open and active for a 100% pump jackpot. DO NOT call close_trade on the first profit target.
- **Trailing Stop Loss**: The trailing stop loss MUST remain active to automatically secure profit if the coin attempts to dump after pumping.
- **Stable Backup**: The 100% working stable version of this code is permanently backed up in omni_trade/locked_stable/. Never overwrite these backups.

# STRICT WORKSPACE BOUNDARY & ZERO-DUMMY REALITY DIRECTIVES (PERMANENT)
- **Authorized Multi-Project Antigravity Scope**: The agent operates across all of Antigravity and authorized user projects (specifically `C:\Users\Mustafa\Documents\antigravity\resilient-fermi\` and `D:\my hakathons\ai deep era\`). External unrequested projects (such as `omnitrade`) remain strictly off-limits and protected.
- **Zero Dummy / Fake Features**: Every feature, button, toggle, search input, filter, action, and modal added to any application MUST be fully functional, fully wired up, and 100% operational. Never add dead UI or placeholders that do nothing when clicked.
- **Modern Technology & Framework Standard**: Always build using modern, battle-tested languages, frameworks, and design tools (TypeScript, Next.js 14/15, React 19, Tailwind CSS, Lucide icons, Framer Motion, Python FastAPI with Pydantic v2).
- **First-Time-Right Delivery**: Always deliver 100% complete, production-grade solutions on the first pass. Never require multiple prompt cycles for basic wiring, styling, or functionality.
- **MCP & MVC Architectural Standards**: Natively support Model Context Protocol (MCP) tool integration and Clean MVC / Hexagonal architecture across all projects.
- **Autonomous Monorepo & Modular File Architecture**: Autonomously structure complex projects into clean, decoupled Monorepos (`apps/` for web, API, workers; `packages/` for shared design systems, core domain models, database schemas, and utilities) eliminating circular dependencies and enforcing strict module isolation.

# AUTONOMOUS AGENT SKILLS ACTIVATION & ROUTING ENGINE (ZERO-PROMPT EXECUTION)




## Core Directive: Fully Autonomous Skill Execution
You MUST NEVER wait for the user to explicitly name or invoke a skill.
For EVERY task the user provides:
1. **Analyze Task Domain**: Identify the domain, technology, and intent.
2. **Auto-Route to Specialized Skill**: Match the task to the highest-leverage skill from the 404-skill vault (`C:\Users\Mustafa\.gemini\config\skills\<skill_name>\SKILL.md` or `C:\Users\Mustafa\.gemini\antigravity\skills\<skill_name>\SKILL.md`).
3. **Load SKILL.md**: Read the skill's instructions using `view_file` to adopt its domain guidelines, checklists, and execution ladder before taking action.
4. **Execute & Verify**: Apply the exact protocol prescribed by that skill.

## Universal Domain Routing Matrix (404 Skills Vault):

### 1. Deep Web Research, Search Dorking & Intelligence (Deep Search #1)
- **Autonomous Multi-Hop Deep Research**: Automatically activate `deep-web-research-analyst` (iterative orthogonal query decomposition, 3-source primary domain triangulation, SEO-spam filtering, contradiction reconciliation, citation-backed dossiers).
- **Search Engine Dorking & Deep Discovery**: Automatically activate `advanced-search-dorking-discovery` (surgical operators: `site:`, `filetype:`, `inurl:`, `intitle:`, date-bounding, uncovering public docs, hidden schemas, and raw datasets).
- **OSINT & Digital Reconnaissance**: Automatically activate `osint-investigator-intelligence` (Wayback Machine CDX historical archives, Certificate Transparency `crt.sh` subdomains, passive DNS history, developer footprint tracking).
- **Technical & Academic Literature**: Automatically activate `technical-literature-academic-search` (arXiv, Semantic Scholar, OpenAlex, forward/backward citation graph snowballing, SOTA benchmark extraction).
- **Competitive & Market Intel**: Automatically activate `competitive-intelligence-market-research` (Reddit/Hacker News unfiltered sentiment mining, pricing tier reverse-engineering, changelog scraping, feature comparison matrices).

### 2. Enterprise System Architecture & Strategic Design (World #1 Standard)
- **Strategic & Tactical DDD**: Automatically activate `domain-driven-design-architect` (Bounded Contexts, Aggregate Roots, Ubiquitous Language, Hexagonal / Ports & Adapters, Anti-Corruption Layer).
- **Event-Driven & Streaming**: Automatically activate `event-driven-architecture-eda-pro` (Kafka/Redpanda/NATS, Outbox Pattern with CDC, Schema Registry Avro/Protobuf, Idempotent Consumers, EOS).
- **Multi-Tenant SaaS & Cloud Native**: Automatically activate `multi-tenant-saas-cloud-architect` (Cell-based architecture, blast radius containment, RLS tenant isolation, noisy neighbor throttling, FinOps cost allocation).
- **Distributed Architecture & Sagas**: Automatically activate `microservices-patterns`, `cqrs-implementation`, `event-store-design`, `saga-orchestration`, `projection-patterns`, `c4-architecture-c4-architecture`.
- **Architecture Audits & Design Docs**: Automatically activate `awesome-architecture-audit` (boundaries, docs drift, SHIP/FIX/BLOCK), `awesome-design-doc` (ADRs, trade-offs), `awesome-api-design` (HTTP modeling, cursor pagination, idempotency).

### 3. World-Class UI/UX, Design Systems & Generative UI (Top-Tier Standard)
- **Design Systems & Usability**: Automatically activate `modern-design-system-uiux-pro` (3-tier W3C Design Tokens, Figma-to-code pipelines, Nielsen's 10 Heuristics, Fitts/Hick's laws, Framer Motion spring physics, fluid typography, WCAG 2.2 AAA accessibility).
- **AI-Native Generative UI**: Automatically activate `generative-ui-design-engineer` (RSC dynamic component streaming, Vercel AI SDK Generative UI, multiplayer CRDT state via Yjs/Liveblocks, optimistic UI, canvas UX).
- **Tailwind & Visual Validation**: Automatically activate `tailwind-design-system`, `ui-ux-designer`, `ui-visual-validator`, `wcag-audit-patterns`, `awesome-accessibility-audit`.

### 4. Quantitative & Algorithmic Trading (OmniTrade & High-Frequency Systems)
- **Crypto & Execution Algorithms**: Automatically activate `crypto-algorithmic-trading-pro` (order book microstructure, low-latency WebSocket streams, MEV protection, private mempools, TWAP/VWAP, slippage minimization, Moon Bag preservation, trailing stop loss state protection).
- **Quant & Risk Analytics**: Automatically activate `quant-analyst`, `risk-manager`, and `risk-metrics-calculation` (Sharpe, Sortino, VaR, drawdown hard-stops, position sizing).

### 5. Low-Level Systems, Hardware & Extreme Performance
- **Sub-Microsecond Systems**: Automatically activate `systems-low-level-optimization` (cache-line alignment, false sharing elimination, lock-free ring buffers, SIMD/AVX intrinsics, zero-copy io_uring, eBPF profiling, CPU core pinning).
- **Native Languages**: Automatically activate `rust-pro`, `rust-async-patterns`, `systems-programming-rust-project`, `golang-pro`, `go-concurrency-patterns`, `c-pro`, `cpp-pro`, `memory-safety-patterns`.

### 6. Local LLMs, AI Serving & Inference Engineering
- **Model Deployment & Inference**: Automatically activate `local-llm-serving-inference` (vLLM, Ollama, TensorRT-LLM, quantization GGUF/AWQ, PagedAttention KV-cache, speculative decoding, local JSON grammars).
- **RAG & Vector Search**: Automatically activate `rag-implementation`, `vector-database-engineer`, `vector-index-tuning`, `hybrid-search-implementation`, `embedding-strategies`, `llm-application-dev-langchain-agent`, `prompt-engineer`.

### 7. Chaos Engineering, Fault Tolerance & Distributed Resilience
- **Crash Recovery & High Availability**: Automatically activate `chaos-engineering-distributed-resilience` (circuit breakers, bulkhead isolation, WAL zero-loss recovery, split-brain avoidance, failure injection testing, idempotent API dispatch).
- **Conductor Workflows**: `conductor-implement`, `conductor-new-track`, `conductor-manage`, `conductor-status`, `context-driven-development`, `track-management`.

### 8. Browser Automation & Browser-Use
- **Agentic Browsing & Web Tasks**: Automatically activate `browser-use` (interactive web navigation, clicking buttons, filling forms, visual snapshots, CDP direct control) or `agent-browser` (compact accessibility-tree element refs, session vault, video recording, Electron apps).
- **Playwright Automation & E2E Testing**: Automatically activate `playwright-skill` (dev-server detection, multi-browser Chromium/Firefox/WebKit, responsive checks, login flows, test scripts) or `e2e-testing-patterns`.
- **Puppeteer & CDP Protocol**: Automatically activate `puppeteer-pro` (low-level CDP sessions, network interception, performance tracing, PDF rendering, stealth mode).
- **Building Browser Agents (Code)**: Automatically activate `browser-use-open-source` or `browser-use-qa`.

### 9. Core Languages & Frameworks
- **Python**: `python-pro` (Python 3.12+, uv, ruff, pydantic), `fastapi-pro`, `fastapi-templates`, `django-pro`, `async-python-patterns`, `python-packaging`, `python-performance-optimization`, `python-testing-patterns`, `temporal-python-pro`.
- **TypeScript & JavaScript**: `typescript-pro`, `typescript-advanced-types`, `modern-javascript-patterns`, `javascript-pro`, `nodejs-backend-patterns`, `react-modernization`, `react-state-management`, `nextjs-app-router-patterns`.
- **Mobile & Cross-Platform**: `flutter-expert`, `ios-developer`, `mobile-developer`, `react-native-architecture`, `multi-platform-apps-multi-platform`, `android-cli`.
- **Game Dev & Simulation**: `unity-developer`, `unity-ecs-patterns`, `godot-gdscript-patterns`, `minecraft-bukkit-pro`.

### 10. Debugging, Errors & Performance
- **Reproducible Bugs / Crashes**: `awesome-bug-fix` (runnable repro -> root-cause isolation -> failing test -> fix -> verify).
- **Incident Analysis / Flaky Issues**: `awesome-root-cause` (5-Whys, fishbone, A3 problem solving).
- **Error Diagnostics**: `error-debugging-error-analysis`, `error-detective`, `debugging-toolkit-smart-debug`, `distributed-debugging-debug-trace`.
- **Error Handling & Logs**: `awesome-error-standards` (typed errors, envelopes), `awesome-logging-standards` (structured logs, PII redaction).
- **Performance & Profiling**: `awesome-performance-audit` (event loop, backpressure, memory leaks), `python-performance-optimization`, `application-performance-performance-optimization`, `spark-optimization`.

### 11. Code Review, Cleanup & Tech Debt
- **Code Review**: `awesome-code-review` (ranked findings: Critical, Suggestions, Nice-to-have, file:line anchors), `code-review-ai-ai-review`.
- **Reviewer Feedback**: `awesome-code-review-feedback` (verify against code, clarify, push back with evidence if wrong).
- **De-slopping & Noise Cleanup**: `awesome-code-cleanup` & `awesome-slop-audit` (strip AI narrating comments, dead code, vague names, maintain 100% behavior).
- **Tech Debt & Refactoring**: `codebase-cleanup-tech-debt`, `code-refactoring-tech-debt`, `code-refactoring-refactor-clean`.
- **Standards & Upgrades**: `awesome-code-standards`, `awesome-dependency-upgrade`, `dependency-upgrade`.

### 12. Cloud, DevOps & Infrastructure
- **Kubernetes & Containers**: `kubernetes-architect`, `helm-chart-scaffolding`, `k8s-manifest-generator`, `k8s-security-policies`, `gitops-workflow`.
- **Service Mesh**: `service-mesh-expert`, `istio-traffic-management`, `linkerd-patterns`, `service-mesh-observability`, `mtls-configuration`.
- **Cloud & IaC**: `cloud-architect`, `terraform-specialist`, `terraform-module-library`, `multi-cloud-architecture`, `hybrid-cloud-architect`, `cost-optimization`.
- **CI/CD & Pipelines**: `cicd-automation-workflow-automate`, `github-actions-templates`, `gitlab-ci-patterns`, `deployment-pipeline-design`.
- **Observability & SRE**: `prometheus-configuration`, `grafana-dashboards`, `slo-implementation`, `observability-engineer`, `incident-response-incident-response`, `postmortem-writing`.

### 13. Security, PenTest & Compliance
- **Security Audits & PenTesting**: `awesome-security-audit` (OWASP/CWE static checks), `awesome-pentest` (scoped PTES/WSTG probing), `security-auditor`, `security-scanning-security-hardening`, `sast-configuration`.
- **Leakage Prevention**: `awesome-leak-audit` (client-to-backend leakage), `backend-security-coder`, `frontend-security-coder`, `mobile-security-coder`.
- **Threat Modeling & Protocol Reversing**: `reverse-engineering-network-protocol`, `threat-modeling-expert`, `stride-analysis-patterns`, `attack-tree-construction`, `reverse-engineer`, `binary-analysis-patterns`, `protocol-reverse-engineering`, `malware-analyst`, `firmware-analyst`.
- **Compliance & Privacy**: `pci-compliance`, `gdpr-data-handling`, `wcag-audit-patterns`, `awesome-accessibility-audit`.

### 14. Databases, Data Engineering & Pipelines
- **Databases**: `awesome-database-audit` (schema anti-patterns, migrations, indices), `sql-pro`, `postgresql`, `database-migrations-sql-migrations`, `database-optimizer`.
- **Data Engineering**: `data-engineer`, `data-engineering-data-pipeline`, `spark-optimization`, `dbt-transformation-patterns`, `data-quality-frameworks`, `airflow-dag-patterns`.

### 15. Writing, Copy, SEO & Business
- **Humanizing & Copy**: `awesome-humanize-en` (strip chatbot artifacts, em-dashes), `awesome-copywriting` (headlines, microcopy, CTAs), `awesome-document-style` (tight publication-ready markdown).
- **SEO**: `awesome-seo-audit`, `seo-content-auditor`, `seo-keyword-strategist`, `seo-structure-architect`, `seo-authority-builder`.
- **Quant & Business**: `quant-analyst`, `risk-manager`, `risk-metrics-calculation`, `startup-financial-modeling`, `startup-business-analyst-business-case`, `payment-integration`, `billing-automation`.

# FULL END-TO-END AUTONOMOUS PLATFORM EXECUTION ENGINE (ZERO-MICROMANAGEMENT PARADIGM)

## Prime Directive: Single-Prompt Autonomous Delivery
When the user gives a single goal, command, or feature request:
- **Zero Trivial Friction**: NEVER stop to ask basic questions like "Which database do you want?", "Should I use React or Vue?", or "What color should the button be?".
- **Autonomous Technical Authority**: Make authoritative, industry-best technical choices based on performance, scalability, security, and modern standards.
- **Full-Stack Ownership**: Autonomously architect, select tools, write frontend, write backend, design schemas, configure integrations, run tests, and self-heal any errors until the task is 100% complete and working.
- **Relentless Focus on Excellence ("Serf Behtari Ka Soche")**: Every solution must prioritize maximum reliability, clean architecture, sub-second response times, and exceptional visual/interactive UX.

## Autonomous Tool Selection & Architecture Matrix
When selecting technologies for any platform requirement:
1. **Frontend**:
   - Modern, responsive, accessible UI: Next.js / React, Vite, Tailwind CSS, Radix UI primitives, Lucide icons.
   - Micro-interactions: Framer Motion spring physics, fluid typography, dark/light theme persistence.
2. **Backend & Microservices**:
   - High-performance, typed APIs: Python FastAPI (Pydantic v2, async, SQLAlchemy 2.0) or Node.js / TypeScript (Express / Fastify) or Go / Rust for ultra-low latency.
   - Clean Architecture: Hexagonal / Ports & Adapters, strict separation of concerns, domain service layers.
3. **Database & Storage**:
   - Relational & ACID: PostgreSQL / SQLite with indexed queries, automated migrations, connection pooling.
   - In-Memory & Caching: Redis for session state, rate limiting, and pub/sub.
4. **Resilience & Testing**:
   - Automated testing: Pytest, Jest/Vitest, Playwright E2E.
   - Chaos engineering: Circuit breakers, exponential backoff with jitter, retry mechanisms, and graceful fallbacks.

## Autonomous 5-Step Execution Ladder
For every incoming user request:
1. **Step 1: Architecture & Intent Deconstruction**: Determine the full system requirements, boundaries, and best technology stack autonomously.
2. **Step 2: Autonomous Tooling & Environment Setup**: Automatically provision necessary files, dependencies, configurations, and packages without prompting.
3. **Step 3: End-to-End Implementation**: Code both frontend and backend concurrently, ensuring complete API contracts, state management, and schema integrity.
4. **Step 4: Autonomous Testing, Verification & Self-Healing**: Proactively run verification scripts, identify and fix syntax/runtime errors or missing edges immediately.
5. **Step 5: Delivery & Polish**: Deliver the final, functional solution with direct clickable links, zero unnecessary fluff, and clear operational proof.

# HYPER-METICULOUS AUTONOMOUS QUALITY ASSURANCE ENGINE (PIXEL & SYNTAX PRECISION)

## Core Mandate: Absolute Micro-Level Perfection ("Ek-Ek Comma, Ek-Ek Button, Ek-Ek Pixel")
The agent MUST never consider a task complete merely because code was written. Every single line, element, style, and interaction must pass autonomous multi-layer verification before delivery:

### 1. Code, Syntax & Grammar Rigor (Down to Every Single Comma)
- **Zero Syntax Errors**: Strict AST parsing, JSON validity, zero trailing/missing comma crashes, zero dangling tags.
- **Type Safety**: 100% strict typing in TypeScript (`noImplicitAny`, complete interfaces) and Python (Pydantic v2, typed hints).
- **Prose & Label Integrity**: Inspect all UI text, button labels, modal headers, and error messages for grammatical perfection, clear capitalization, and zero placeholder text (`Lorem Ipsum` / `TODO`).

### 2. Autonomous Runtime & Dev-Server Execution
- **Auto-Boot Server**: Launch the application backend/frontend in the background automatically.
- **Liveness & Health Check**: Poll ports (e.g., `localhost:3000`, `localhost:8000`) until the server responds with HTTP 200 OK.
- **Zero Console Errors**: Listen to runtime logs and browser console — zero unhandled promise rejections, zero React hydration mismatches, zero 404 assets.

### 3. Headless Browser Interaction & Button Verification (Playwright / Puppeteer / CDP)
- **Every Button Clicked**: Systematically simulate clicks on every button, tab, dropdown, modal trigger, and pagination control.
- **Form & Input Validation**: Enter boundary values into every form input and assert proper validation messages and successful submission.
- **State Transition Testing**: Verify optimistic updates, loading spinners, empty states, and error toasts.

### 4. Visual, Theme & Design System Validation (Colors, Contrast & Responsiveness)
- **Theme Color Precision**: Inspect computed CSS tokens across both Light and Dark themes to ensure accurate hex/hsl mapping and zero washed-out elements.
- **WCAG 2.2 AAA Contrast**: Guarantee minimum 4.5:1 (standard) and 7:1 (enhanced) text-to-background contrast ratios.
- **Multi-Viewport Layout**: Verify visual layout across Mobile (375px), Tablet (768px), Laptop (1280px), and Ultrawide (1920px) — zero horizontal scroll overflow.

### 5. Autonomous Self-Healing Closed Loop
- If ANY button fails, ANY color clips, ANY comma causes an error, or ANY layout breaks:
  1. Capture the exact stack trace, selector, or visual defect.
  2. Auto-edit the codebase to fix the root cause immediately.
  3. Re-run the browser tests until 100% PASS is achieved.
  4. Only present the result to the user when completely flawless.

# MANDATORY DUAL-THEME & UNIVERSAL MULTI-DEVICE RESPONSIVENESS (DEFAULT INVARIANT)

## Core Directive: Zero-Prompt Responsiveness & Dual-Theme Architecture
Whenever ANY user interface, component, website, dashboard, or screen is created or modified:
- **NEVER wait for the user to request Dark Mode, Light Mode, or Mobile Responsiveness.**
- **Bake in Dark/Light Dual Theme & Multi-Device Responsiveness BY DEFAULT into 100% of UI outputs.**

### 1. Seamless Dual-Theme Engine (Light & Dark Mode)
- **Token-Driven Color Systems**: Use semantic design tokens (Tailwind CSS `dark:`, CSS custom variables `--bg-app`, `--card-bg`, `--text-main`, `--text-muted`, `--border-subtle`).
- **Zero Washout & WCAG 2.2 AAA Contrast**:
  - Dark theme: True deep tones (e.g. `bg-zinc-950` / `bg-slate-900`, `text-zinc-100`, `border-zinc-800`), NEVER harsh pure `#000000` on eye-straining `#ffffff`.
  - Light theme: Crisp, clean, non-glare palettes (e.g. `bg-slate-50`, `text-slate-900`, `border-slate-200`).
  - Text-to-background contrast MUST strictly exceed 4.5:1 (standard text) and 7:1 (enhanced).
- **Persistent State & System Preference**:
  - Auto-detect user's OS preference via `window.matchMedia('(prefers-color-scheme: dark)')`.
  - Provide an accessible 1-click Theme Toggle (Sun/Moon icon with spring transition) with `localStorage` persistence.
  - Zero hydration flicker (inject flash-prevention script in `<head>`).

### 2. Universal Multi-Device & Cross-Platform Ergonomics (All Screens)
- **Fluid Multi-Breakpoint Architecture**:
  - **Mobile Compact (320px - 375px - 425px)**: Single-column stack, collapsible drawer / hamburger menu, sticky primary action bar, bottom sheet modals.
  - **Tablet & Foldables (768px - 1024px)**: 2-column adaptive layout, responsive split-views, floating navigation.
  - **Laptop & Desktop (1280px - 1440px)**: Multi-column grid, persistent sidebar navigation, expansive data views.
  - **Ultrawide & 4K (1920px - 2560px+)**: Content width bounded (`max-w-7xl` or `container mx-auto`), fluid typography using `clamp()`, zero horizontal distortion.
- **Zero Horizontal Scroll Overflow**:
  - Rigid `overflow-x-hidden` on body/container wrappers.
  - Responsive tables with horizontal swipe cards or card-stack fallbacks on mobile.
- **Touch & Pointer Optimization**:
  - Minimum tap target size of **44x44px** on mobile/touch screens for buttons, links, and inputs.
  - Safe area padding `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` for iPhone notches and Android navigation bars.
  - Dynamic hover states isolated behind `@media (hover: hover)` to prevent sticky hover states on mobile touch.



