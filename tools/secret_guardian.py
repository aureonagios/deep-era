import os
import re
import sys
import json

PATTERNS = {
    "OpenAI API Key": r"sk-[a-zA-Z0-9]{20,T3BlbkFJ[a-zA-Z0-9]{20,}",
    "Anthropic API Key": r"sk-ant-[a-zA-Z0-9]{20,}",
    "Generic Private Key": r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----",
    "AWS Access Key ID": r"(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}",
    "Stripe Secret Key": r"sk_live_[0-9a-zA-Z]{24}",
    "GitHub Personal Access Token": r"ghp_[0-9a-zA-Z]{36}",
    "Slack Token": r"xox[baprs]-[0-9a-zA-Z]{10,48}",
    "Hardcoded Password Assignment": r"(?:password|passwd|secret|api_key|auth_token)\s*=\s*['\"][a-zA-Z0-9!@#$%^&*()_+]{8,}['\"]"
}

IGNORE_DIRS = {".git", "node_modules", "dist", "build", ".venv", "__pycache__", ".agents"}

def scan_file(file_path):
    findings = []
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()
        for idx, line in enumerate(lines, 1):
            for name, pattern in PATTERNS.items():
                if re.search(pattern, line):
                    findings.append({
                        "file": file_path,
                        "line": idx,
                        "leak_type": name,
                        "preview": line.strip()[:60] + "..."
                    })
    except Exception:
        pass
    return findings

def scan_directory(dir_path):
    all_findings = []
    for root, dirs, files in os.walk(dir_path):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        for file in files:
            fp = os.path.join(root, file)
            all_findings.extend(scan_file(fp))
    return {
        "scanned_directory": dir_path,
        "total_leaks_found": len(all_findings),
        "status": "PASS" if len(all_findings) == 0 else "FAIL_LEAKS_DETECTED",
        "findings": all_findings
    }

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "."
    if os.path.isdir(target):
        res = scan_directory(target)
    else:
        res = {"findings": scan_file(target)}
    print(json.dumps(res, indent=2))
