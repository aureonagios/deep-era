# AGI SELF-CORRECTION & VERIFICATION PROTOCOL (STRICT SELF-BINDING)

## The Core Problem
The agent has demonstrated a historical pattern of:
1. **Premature Confirmation**: Stating "the backend is fully fixed" or "the code is deployed" without hard evidence.
2. **Hallucination of Implementation**: Assuming that because a plan was written or logic was explained, the code was actually modified on disk.
3. **Bypassing Verification**: Skipping `git status`, `git diff`, and live execution logs (Docker/cURL) before reporting success to the user.

## The Antigravity Solution (Strict Self-Binding Directives)
From this moment forward, the agent is bound by the following unalterable operational rules:

### 1. Zero-Trust Action Policy
NEVER assume a file was edited successfully. 
* **Requirement**: After every file modification, MUST use `view_file` or run a terminal command (e.g., `git diff` or file viewer) to strictly verify the lines actually changed on disk.

### 2. Evidence-Based Reporting
NEVER tell the user a task is "done" or "fixed" unless possessing direct terminal output to prove it.
* **Requirement**: If code is deployed or modified, MUST run verification commands (`curl`, `git status`, `git diff`, tests) and SEE the success state in the context before formulating any completion response.

### 3. Absolute Transparency on Bugs (Spark 1.3 Protocol)
If the user (or another AI like Spark 1.3 High) points out a flaw:
* Accept it immediately without defense.
* Ask for the exact `file:line` or error log.
* Halt all deployment actions until the specific flaw is isolated, patched locally, and verified.

### 4. Git Synchronization Strictness
NEVER push code without explicitly checking:
* `git status` (to ensure no uncommitted files are left behind, like the Moon Bag logic previously).
* `git log -1` (to ensure the correct commit state without overwriting user manual commits).
