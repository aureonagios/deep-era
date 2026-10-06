// deep-era-allow: inner-html
// AI Deep Era Live Command Center & Web Dashboard (Zero-dependency Node >= 18)
// RULE: user may speak any language. All code, comments, logs and replies: ENGLISH ONLY.
const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const { buildMap } = require("./map");
const { verifyProject } = require("./verify");
const { securityScan } = require("./security");
const { guardScan } = require("./guard");
const { readJson } = require("./logger");
const { getCatalog, searchSkills, getSkill, listCategories } = require("./skills");
const { isPortAvailable, findAvailablePort, scanCommonPorts, getProcessOnPort, killProcessOnPort } = require("./hunt");
const { scanDirectorySecrets } = require("./guardian");
const { loadMemoryBank, addMemory, searchMemories, deleteMemory, exportMarkdown } = require("./memorybank");

function getDashboardHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Deep Era — Autonomous Command Center</title>
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #111726;
      --card-border: #1e293b;
      --text: #f1f5f9;
      --text-muted: #94a3b8;
      --accent: #3b82f6;
      --accent-glow: rgba(59, 130, 246, 0.2);
      --success: #10b981;
      --danger: #ef4444;
      --warning: #f59e0b;
      --code-bg: #030712;
      --header-bg: rgba(17, 23, 38, 0.85);
    }
    [data-theme="light"] {
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --card-border: #e2e8f0;
      --text: #0f172a;
      --text-muted: #64748b;
      --accent: #2563eb;
      --accent-glow: rgba(37, 99, 235, 0.15);
      --success: #059669;
      --danger: #dc2626;
      --warning: #d97706;
      --code-bg: #f1f5f9;
      --header-bg: rgba(255, 255, 255, 0.88);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
      transition: background 0.2s ease, color 0.2s ease;
    }
    header {
      position: sticky;
      top: 0;
      z-index: 50;
      background: var(--header-bg);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--card-border);
      padding: 0.85rem 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-weight: 800;
      font-size: 1.15rem;
      letter-spacing: -0.02em;
    }
    .brand-badge {
      font-size: 0.7rem;
      background: var(--accent);
      color: #fff;
      padding: 0.15rem 0.5rem;
      border-radius: 9999px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .theme-toggle, .btn {
      background: var(--card-bg);
      color: var(--text);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 0.5rem 0.9rem;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.15s ease;
    }
    .btn:hover, .theme-toggle:hover {
      border-color: var(--accent);
      box-shadow: 0 0 10px var(--accent-glow);
    }
    .btn-primary {
      background: var(--accent);
      color: #fff;
      border-color: var(--accent);
    }
    .btn-primary:hover {
      opacity: 0.92;
    }
    .nav-tabs {
      display: flex;
      gap: 0.5rem;
      background: var(--code-bg);
      padding: 0.35rem 0.5rem;
      border-radius: 10px;
      overflow-x: auto;
    }
    .nav-tab {
      padding: 0.45rem 0.85rem;
      border-radius: 6px;
      font-size: 0.825rem;
      font-weight: 600;
      cursor: pointer;
      color: var(--text-muted);
      border: none;
      background: transparent;
      white-space: nowrap;
      transition: all 0.15s ease;
    }
    .nav-tab.active {
      color: #fff;
      background: var(--accent);
    }
    [data-theme="light"] .nav-tab.active {
      color: #fff;
    }
    main {
      flex: 1;
      padding: 1.5rem;
      max-width: 1400px;
      margin: 0 auto;
      width: 100%;
    }
    .telemetry-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .stat-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 1.1rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .stat-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: var(--text-muted);
    }
    .stat-value {
      font-size: 1.6rem;
      font-weight: 800;
      font-family: 'JetBrains Mono', monospace;
    }
    .tab-pane {
      display: none;
      flex-direction: column;
      gap: 1.25rem;
    }
    .tab-pane.active {
      display: flex;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 1.25rem;
    }
    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--card-border);
    }
    .card-title {
      font-size: 1.05rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .search-bar {
      display: flex;
      gap: 0.75rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }
    .search-input {
      flex: 1;
      min-width: 240px;
      background: var(--code-bg);
      border: 1px solid var(--card-border);
      color: var(--text);
      padding: 0.6rem 1rem;
      border-radius: 8px;
      font-size: 0.875rem;
      font-family: inherit;
    }
    .search-input:focus {
      outline: none;
      border-color: var(--accent);
    }
    .skills-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1rem;
    }
    .skill-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 10px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .skill-card:hover {
      border-color: var(--accent);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px var(--accent-glow);
    }
    .skill-name {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--accent);
      font-family: 'JetBrains Mono', monospace;
    }
    .skill-desc {
      font-size: 0.8rem;
      color: var(--text-muted);
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .skill-tags {
      display: flex;
      gap: 0.35rem;
      flex-wrap: wrap;
      margin-top: auto;
      padding-top: 0.5rem;
    }
    .tag {
      font-size: 0.675rem;
      padding: 0.15rem 0.45rem;
      background: var(--code-bg);
      border: 1px solid var(--card-border);
      border-radius: 4px;
      color: var(--text-muted);
      font-family: 'JetBrains Mono', monospace;
    }
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 100;
      padding: 1rem;
    }
    .modal-overlay.open {
      display: flex;
    }
    .modal {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      width: 100%;
      max-width: 800px;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    }
    .modal-header {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--card-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .modal-body {
      padding: 1.25rem;
      overflow-y: auto;
      font-size: 0.875rem;
      line-height: 1.6;
    }
    pre {
      background: var(--code-bg);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 1rem;
      overflow-x: auto;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.825rem;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .badge-success { color: var(--success); }
    .badge-danger { color: var(--danger); }
    .badge-warning { color: var(--warning); }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }
    th, td {
      padding: 0.65rem 0.85rem;
      text-align: left;
      border-bottom: 1px solid var(--card-border);
    }
    th {
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      font-size: 0.725rem;
    }
    @media (max-width: 768px) {
      header { flex-direction: column; align-items: stretch; }
      .header-actions { justify-content: space-between; }
      .nav-tabs { order: 2; width: 100%; }
      .telemetry-grid { grid-template-columns: 1fr 1fr; }
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <span>AI DEEP ERA</span>
      <span class="brand-badge">Command Center v0.46</span>
    </div>
    <div class="nav-tabs">
      <button class="nav-tab active" onclick="switchTab('tab-overview')">Overview</button>
      <button class="nav-tab" onclick="switchTab('tab-skills')">Skills Vault</button>
      <button class="nav-tab" onclick="switchTab('tab-secrets')">Secret Guardian</button>
      <button class="nav-tab" onclick="switchTab('tab-ports')">Port Hunter</button>
      <button class="nav-tab" onclick="switchTab('tab-memory')">Memory Bank</button>
    </div>
    <div class="header-actions">
      <button class="btn btn-primary" onclick="triggerLiveCheck()">Run Full Audit</button>
      <button class="theme-toggle" id="themeBtn" onclick="toggleTheme()">Dark</button>
    </div>
  </header>

  <main>
    <div class="telemetry-grid">
      <div class="stat-card">
        <span class="stat-label">Project Health</span>
        <span class="stat-value badge-success" id="statHealth">100% PASS</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Skills Vault</span>
        <span class="stat-value" id="statSkills">…</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Total Files Mapped</span>
        <span class="stat-value" id="statFiles">--</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">AI Spend Tokens</span>
        <span class="stat-value" id="statSpend">--</span>
      </div>
    </div>

    <!-- OVERVIEW TAB -->
    <div id="tab-overview" class="tab-pane active">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Project Verification & Health Checks</span>
          <button class="btn" onclick="fetchOverview()">Refresh</button>
        </div>
        <div id="verifyResults">Loading verification tests...</div>
      </div>
    </div>

    <!-- SKILLS VAULT TAB -->
    <div id="tab-skills" class="tab-pane">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Autonomous Agent Skills Vault</span>
          <span class="tag" id="skillsCount">…</span>
        </div>
        <div class="search-bar">
          <input type="text" id="skillSearch" class="search-input" placeholder="Search by name, capability (e.g. docker, react, security, quant, e2e)..." oninput="filterSkills()">
        </div>
        <div id="skillsGrid" class="skills-grid">Loading skills...</div>
      </div>
    </div>

    <!-- SECRET GUARDIAN TAB -->
    <div id="tab-secrets" class="tab-pane">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Secret Guardian & High-Entropy Scanner</span>
          <button class="btn btn-primary" onclick="fetchSecrets()">Scan Secrets Now</button>
        </div>
        <div id="secretsResults">Click "Scan Secrets Now" to audit all files for leaked keys, tokens, and credentials.</div>
      </div>
    </div>

    <!-- PORT HUNTER TAB -->
    <div id="tab-ports" class="tab-pane">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Network Port Hunter & Conflict Resolver</span>
          <button class="btn" onclick="fetchPorts()">Refresh Ports</button>
        </div>
        <div class="search-bar">
          <input type="number" id="testPortInput" class="search-input" placeholder="Test specific port (e.g. 3000, 8088)..." value="3000">
          <button class="btn btn-primary" onclick="testCustomPort()">Test Port</button>
          <span id="customPortResult" style="align-self:center; font-weight:700; font-family:'JetBrains Mono';"></span>
        </div>
        <div id="portsTable">Loading port status...</div>
      </div>
    </div>

    <!-- MEMORY BANK TAB -->
    <div id="tab-memory" class="tab-pane">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Persistent Project Memory Bank</span>
          <div style="display:flex; gap:0.5rem;">
            <button class="btn" onclick="exportMemoryMd()">Export MD</button>
            <button class="btn btn-primary" onclick="openMemoryModal()">+ Add Memory</button>
          </div>
        </div>
        <div class="search-bar">
          <input type="text" id="memorySearch" class="search-input" placeholder="Filter memories..." oninput="fetchMemories()">
        </div>
        <div id="memoriesList">Loading memory bank...</div>
      </div>
    </div>
  </main>

  <!-- MODAL -->
  <div id="skillModal" class="modal-overlay" onclick="closeModal(event)">
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-header">
        <h3 id="modalTitle" class="card-title">Skill Details</h3>
        <button class="btn" onclick="closeModal()">Close</button>
      </div>
      <div class="modal-body">
        <pre id="modalContent"></pre>
      </div>
    </div>
  </div>

  <script>
    let currentTheme = localStorage.getItem('deep_era_theme') || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.documentElement.setAttribute('data-theme', currentTheme);
    document.getElementById('themeBtn').textContent = currentTheme === 'light' ? 'Light' : 'Dark';

    function toggleTheme() {
      currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', currentTheme);
      localStorage.setItem('deep_era_theme', currentTheme);
      document.getElementById('themeBtn').textContent = currentTheme === 'light' ? 'Light' : 'Dark';
    }

    function switchTab(tabId) {
      document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));
      document.getElementById(tabId).classList.add('active');
      event.target.classList.add('active');

      if (tabId === 'tab-skills' && !window.skillsLoaded) fetchSkills();
      if (tabId === 'tab-ports') fetchPorts();
      if (tabId === 'tab-memory') fetchMemories();
    }

    async function fetchOverview() {
      try {
        const res = await fetch('/api/overview');
        const data = await res.json();
        document.getElementById('statFiles').textContent = data.fileCount || '--';
        document.getElementById('statSpend').textContent = (data.spendTokens || 0).toLocaleString();
        document.getElementById('statSkills').textContent = (data.skillsCount ?? '--').toString();
        
        let html = '<table><thead><tr><th>Test / Guard</th><th>Status</th><th>Detail</th></tr></thead><tbody>';
        for (const item of data.verifications || []) {
          const pass = item.ok;
          html += \`<tr>
            <td><strong>\${item.name || item.file}</strong></td>
            <td><span class="\${pass ? 'badge-success' : 'badge-danger'}">\${pass ? 'PASS' : 'FAIL'}</span></td>
            <td>\${item.detail || item.message || ''}</td>
          </tr>\`;
        }
        html += '</tbody></table>';
        document.getElementById('verifyResults').innerHTML = html;
      } catch (err) {
        document.getElementById('verifyResults').textContent = 'Error loading overview: ' + err.message;
      }
    }

    let allSkills = [];
    async function fetchSkills() {
      try {
        const res = await fetch('/api/skills');
        const data = await res.json();
        allSkills = data.skills || [];
        window.skillsLoaded = true;
        renderSkills(allSkills);
      } catch (err) {
        document.getElementById('skillsGrid').textContent = 'Error loading skills: ' + err.message;
      }
    }

    function renderSkills(list) {
      document.getElementById('skillsCount').textContent = \`\${list.length} skills\`;
      const grid = document.getElementById('skillsGrid');
      if (!list.length) {
        grid.innerHTML = '<div style="color:var(--text-muted); padding:1rem;">No matching skills found.</div>';
        return;
      }
      grid.innerHTML = list.slice(0, 60).map(s => \`
        <div class="skill-card" onclick="viewSkill('\${s.id}')">
          <div class="skill-name">\${s.name || s.id}</div>
          <div class="skill-desc">\${s.description || 'Autonomous agent capability'}</div>
          <div class="skill-tags">
            <span class="tag">\${s.category || 'skill'}</span>
            \${(s.tags || []).slice(0, 3).map(t => \`<span class="tag">\${t}</span>\`).join('')}
          </div>
        </div>
      \`).join('');
    }

    function filterSkills() {
      const q = document.getElementById('skillSearch').value.toLowerCase().trim();
      if (!q) { renderSkills(allSkills); return; }
      const filtered = allSkills.filter(s => 
        (s.name || s.id || '').toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q) ||
        (s.tags || []).some(t => t.toLowerCase().includes(q))
      );
      renderSkills(filtered);
    }

    async function viewSkill(id) {
      try {
        const res = await fetch('/api/skill?id=' + encodeURIComponent(id));
        const data = await res.json();
        document.getElementById('modalTitle').textContent = data.name || id;
        document.getElementById('modalContent').textContent = data.content || data.description || 'No content';
        document.getElementById('skillModal').classList.add('open');
      } catch (err) {
        alert('Failed to load skill: ' + err.message);
      }
    }

    function closeModal() {
      document.getElementById('skillModal').classList.remove('open');
    }

    async function fetchSecrets() {
      document.getElementById('secretsResults').innerHTML = 'Scanning files for secrets...';
      try {
        const res = await fetch('/api/secrets');
        const data = await res.json();
        const findings = data.findings || [];
        if (!findings.length) {
          document.getElementById('secretsResults').innerHTML = '<div class="badge-success" style="padding:1rem; font-weight:700;">Zero secrets leaked. All clear!</div>';
          return;
        }
        let html = '<table><thead><tr><th>File</th><th>Line:Col</th><th>Rule</th><th>Severity</th><th>Snippet</th></tr></thead><tbody>';
        for (const f of findings) {
          html += \`<tr>
            <td><code>\${f.file}</code></td>
            <td>\${f.line}:\${f.col}</td>
            <td>\${f.name}</td>
            <td><span class="badge-danger">\${f.sev.toUpperCase()}</span></td>
            <td><code>\${f.snippet}</code></td>
          </tr>\`;
        }
        html += '</tbody></table>';
        document.getElementById('secretsResults').innerHTML = html;
      } catch (err) {
        document.getElementById('secretsResults').textContent = 'Error: ' + err.message;
      }
    }

    async function fetchPorts() {
      try {
        const res = await fetch('/api/ports');
        const data = await res.json();
        let html = '<table><thead><tr><th>Port</th><th>Status</th><th>Process ID</th><th>Action</th></tr></thead><tbody>';
        for (const p of data.ports || []) {
          const avail = p.status === 'AVAILABLE';
          html += \`<tr>
            <td><strong>\${p.port}</strong></td>
            <td><span class="\${avail ? 'badge-success' : 'badge-danger'}">\${p.status}</span></td>
            <td>\${p.pid ? p.pid : '--'}</td>
            <td>\${!avail && p.pid ? \`<button class="btn" style="padding:0.2rem 0.5rem; font-size:0.75rem;" onclick="killPort(\${p.port})">Kill</button>\` : '--'}</td>
          </tr>\`;
        }
        html += '</tbody></table>';
        document.getElementById('portsTable').innerHTML = html;
      } catch (err) {
        document.getElementById('portsTable').textContent = 'Error: ' + err.message;
      }
    }

    async function testCustomPort() {
      const port = document.getElementById('testPortInput').value;
      const resSpan = document.getElementById('customPortResult');
      resSpan.textContent = 'Checking...';
      try {
        const res = await fetch('/api/port-check?port=' + port);
        const data = await res.json();
        if (data.available) {
          resSpan.className = 'badge-success';
          resSpan.textContent = 'PORT ' + port + ' AVAILABLE';
        } else {
          resSpan.className = 'badge-danger';
          resSpan.textContent = 'PORT ' + port + ' OCCUPIED' + (data.pid ? ' (PID ' + data.pid + ')' : '');
        }
      } catch (e) {
        resSpan.textContent = 'Error: ' + e.message;
      }
    }

    async function killPort(port) {
      if (!confirm('Terminate process on port ' + port + '?')) return;
      await fetch('/api/port-kill?port=' + port, { method: 'POST' });
      fetchPorts();
    }

    async function fetchMemories() {
      const q = document.getElementById('memorySearch') ? document.getElementById('memorySearch').value : '';
      try {
        const res = await fetch('/api/memories?q=' + encodeURIComponent(q));
        const data = await res.json();
        const entries = data.entries || [];
        if (!entries.length) {
          document.getElementById('memoriesList').innerHTML = '<div style="color:var(--text-muted); padding:1rem;">No memories saved yet. Click "+ Add Memory".</div>';
          return;
        }
        let html = '';
        for (const m of entries) {
          html += \`
            <div style="background:var(--code-bg); border:1px solid var(--card-border); border-radius:8px; padding:1rem; margin-bottom:0.75rem; display:flex; justify-content:space-between; align-items:flex-start; gap:1rem;">
              <div>
                <div style="font-weight:700; font-size:1rem; margin-bottom:0.25rem;">\${m.title}</div>
                <div style="color:var(--text-muted); font-size:0.85rem; margin-bottom:0.5rem; white-space:pre-wrap;">\${m.content}</div>
                <div style="display:flex; gap:0.4rem;">
                  <span class="tag">\${m.kind}</span>
                  \${(m.tags || []).map(t => \`<span class="tag">\${t}</span>\`).join('')}
                </div>
              </div>
              <button class="btn" style="color:var(--danger); padding:0.3rem 0.6rem; font-size:0.75rem;" onclick="deleteMemory('\${m.id}')">Delete</button>
            </div>
          \`;
        }
        document.getElementById('memoriesList').innerHTML = html;
      } catch (err) {
        document.getElementById('memoriesList').textContent = 'Error: ' + err.message;
      }
    }

    async function deleteMemory(id) {
      if (!confirm('Delete memory ' + id + '?')) return;
      await fetch('/api/memory?id=' + encodeURIComponent(id), { method: 'DELETE' });
      fetchMemories();
    }

    function exportMemoryMd() {
      window.open('/api/memory-export', '_blank');
    }

    async function openMemoryModal() {
      const title = prompt('Enter memory title (e.g. Architecture decision, Moon bag logic, Locked DB rule):');
      if (!title) return;
      const content = prompt('Enter details:');
      if (!content) return;
      const kind = prompt('Kind (decision, architecture, bug_pattern, invariant):', 'decision') || 'decision';
      await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, kind, tags: [kind] })
      });
      fetchMemories();
    }

    async function triggerLiveCheck() {
      switchTab('tab-overview');
      fetchOverview();
    }

    // Init
    fetchOverview();
  </script>
</body>
</html>`;
}

function startDashboardServer(dir = process.cwd(), preferredPort = 8300) {
  return new Promise(async (resolve, reject) => {
    const port = await findAvailablePort(preferredPort, 50);
    if (!port) return reject(new Error("No available ports found for dashboard"));

    const server = http.createServer(async (req, res) => {
      const parsed = url.parse(req.url, true);
      const pathname = parsed.pathname;

      // CORS headers
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      // Static UI
      if (pathname === "/" || pathname === "/index.html") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(getDashboardHtml());
        return;
      }

      // JSON API endpoints
      if (pathname === "/api/overview") {
        let map = readJson(dir, "map.json", null);
        if (!map) map = buildMap(dir);
        const v = verifyProject(dir, map);
        const s = securityScan(dir, map.files);
        const g = guardScan(dir, map.files);
        const { spendReport } = require("./spend");
        const sp = spendReport(dir);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          project: path.basename(dir),
          fileCount: map.files.length,
          verifications: v,
          securityCount: s.length,
          guardCount: g.length,
          spendTokens: sp.tokens,
          skillsCount: getCatalog(dir).skills.length
        }));
        return;
      }

      if (pathname === "/api/skills") {
        const q = parsed.query.q || "";
        const skills = searchSkills(q, 450, dir);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ total: skills.length, skills }));
        return;
      }

      if (pathname === "/api/skill") {
        const id = parsed.query.id || "";
        const skill = getSkill(id, dir);
        if (!skill) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Skill not found" }));
          return;
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(skill));
        return;
      }

      if (pathname === "/api/secrets") {
        const findings = scanDirectorySecrets(dir);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ count: findings.length, findings }));
        return;
      }

      if (pathname === "/api/ports") {
        const ports = await scanCommonPorts();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ports }));
        return;
      }

      if (pathname === "/api/port-check") {
        const p = parseInt(parsed.query.port, 10) || 3000;
        const avail = await isPortAvailable(p);
        const proc = !avail ? getProcessOnPort(p) : null;
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ port: p, available: avail, pid: proc ? proc.pid : null }));
        return;
      }

      if (pathname === "/api/port-kill" && req.method === "POST") {
        const p = parseInt(parsed.query.port, 10);
        const r = killProcessOnPort(p);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(r));
        return;
      }

      if (pathname === "/api/memories") {
        const q = parsed.query.q || "";
        const entries = searchMemories(q, null, dir);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ entries }));
        return;
      }

      if (pathname === "/api/memory" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => { body += chunk; });
        req.on("end", () => {
          try {
            const data = JSON.parse(body);
            const item = addMemory(data, dir);
            res.writeHead(201, { "Content-Type": "application/json" });
            res.end(JSON.stringify(item));
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: e.message }));
          }
        });
        return;
      }

      if (pathname === "/api/memory" && req.method === "DELETE") {
        const id = parsed.query.id;
        const ok = deleteMemory(id, dir);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok, id }));
        return;
      }

      if (pathname === "/api/memory-export") {
        const md = exportMarkdown(dir);
        res.writeHead(200, { "Content-Type": "text/markdown; charset=utf-8" });
        res.end(md);
        return;
      }

      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("404 Not Found");
    });

    server.listen(port, "127.0.0.1", () => {
      resolve({ port, server, url: `http://127.0.0.1:${port}` });
    });
    server.on("error", reject);
  });
}

module.exports = {
  startDashboardServer,
  getDashboardHtml
};
