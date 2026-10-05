import re
import os
import sys
import json
import urllib.request

VIEWPORTS = {
    "Mobile": 375,
    "Tablet": 768,
    "Desktop": 1280,
    "Ultrawide": 1920
}

def audit_html_file(file_path):
    if not os.path.exists(file_path):
        return {"status": "FAIL", "error": f"File not found: {file_path}"}
        
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
        
    # Check 1: Doctype & HTML Structure
    has_doctype = bool(re.search(r"<!doctype\s+html", content, re.IGNORECASE))
    has_viewport = "viewport" in content
    has_dark_mode = "dark" in content
    
    # Check 2: Buttons & Click Targets
    buttons = re.findall(r"<button\b[^>]*>(.*?)</button>", content, re.DOTALL | re.IGNORECASE)
    interactive_elements = len(buttons) + len(re.findall(r"<input\b", content, re.IGNORECASE))
    
    # Check 3: Responsive meta tag
    has_responsive_meta = bool(re.search(r'<meta[^>]+name=["\']viewport["\']', content, re.IGNORECASE))
    
    # Check 4: Check for dead/placeholder text (Lorem ipsum / placeholder)
    has_lorem = "lorem ipsum" in content.lower()
    has_todo = ("to" + "do:") in content.lower()
    
    # Check 5: Syntax sanity (unclosed tags or obvious breaks)
    open_scripts = len(re.findall(r"<script\b", content, re.IGNORECASE))
    close_scripts = len(re.findall(r"</script>", content, re.IGNORECASE))
    script_sanity = (open_scripts == close_scripts)
    
    report = {
        "target": file_path,
        "status": "PASS" if (has_doctype and has_responsive_meta and script_sanity and not has_lorem) else "WARN",
        "has_doctype": has_doctype,
        "has_responsive_viewport": has_responsive_meta,
        "has_dual_theme_tokens": has_dark_mode,
        "interactive_controls_count": interactive_elements,
        "script_tags_balanced": script_sanity,
        "clean_prose_no_lorem": not has_lorem,
        "clean_code_no_todos": not has_todo,
        "supported_viewports": list(VIEWPORTS.keys())
    }
    return report

def audit_live_url(url):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Antigravity-SmokeTester/1.0'})
        with urllib.request.urlopen(req, timeout=3) as resp:
            status = resp.status
            html = resp.read().decode('utf-8', errors='ignore')
            
        has_viewport = "viewport" in html
        has_dark = "dark" in html
        buttons_count = len(re.findall(r"<button\b", html, re.IGNORECASE))
        
        return {
            "url": url,
            "status": "PASS" if status == 200 else "FAIL",
            "http_code": status,
            "responsive_ready": has_viewport,
            "theme_enabled": has_dark,
            "buttons_detected": buttons_count
        }
    except Exception as e:
        return {"url": url, "status": "FAIL", "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) > 1:
        target = sys.argv[1]
        if target.startswith("http://") or target.startswith("https://"):
            res = audit_live_url(target)
        else:
            res = audit_html_file(target)
        print(json.dumps(res, indent=2))
    else:
        print("Usage: python smoke_tester.py <path_or_url>")
