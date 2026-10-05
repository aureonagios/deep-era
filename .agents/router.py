import json
import sys
import os

CATALOG_PATH = os.path.join(os.path.dirname(__file__), "catalog.json")

def find_skills(query, top_k=5):
    if not os.path.exists(CATALOG_PATH):
        print(f"Catalog not found at {CATALOG_PATH}")
        return []
    with open(CATALOG_PATH, "r", encoding="utf-8-sig") as f:
        data = json.load(f)
    
    query_tokens = query.lower().split()
    results = []
    for skill in data.get("skills", []):
        score = 0
        name = skill.get("name", "").lower()
        desc = skill.get("description", "").lower()
        tags = [t.lower() for t in skill.get("tags", [])]
        triggers = [tr.lower() for tr in skill.get("triggers", [])]
        
        for token in query_tokens:
            if token in name:
                score += 10
            if any(token in t for t in tags):
                score += 5
            if any(token in tr for tr in triggers):
                score += 4
            if token in desc:
                score += 2
        
        if score > 0:
            results.append((score, skill))
            
    results.sort(key=lambda x: x[0], reverse=True)
    return [s for _, s in results[:top_k]]

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python router.py <query>")
        sys.exit(1)
    q = " ".join(sys.argv[1:])
    matches = find_skills(q)
    for m in matches:
        print(f"* {m['id']} [{m.get('category', 'general')}]: {m.get('description', '')[:100]}...")
