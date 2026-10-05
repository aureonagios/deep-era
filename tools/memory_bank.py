import sqlite3
import os
import sys
import json
import time

DB_PATH = os.path.join(os.path.dirname(__file__), "memory_bank.db")

def init_db(db_path=DB_PATH):
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS memories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            kind TEXT NOT NULL,
            topic TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    return conn

def remember(kind, topic, content, db_path=DB_PATH):
    conn = init_db(db_path)
    c = conn.cursor()
    c.execute("INSERT INTO memories (kind, topic, content) VALUES (?, ?, ?)", (kind, topic, content))
    conn.commit()
    mem_id = c.lastrowid
    conn.close()
    return mem_id

def recall(query="", kind=None, limit=10, db_path=DB_PATH):
    conn = init_db(db_path)
    c = conn.cursor()
    sql = "SELECT id, kind, topic, content, created_at FROM memories WHERE 1=1"
    params = []
    
    if kind:
        sql += " AND kind = ?"
        params.append(kind)
        
    if query:
        sql += " AND (topic LIKE ? OR content LIKE ?)"
        params.extend([f"%{query}%", f"%{query}%"])
        
    sql += " ORDER BY id DESC LIMIT ?"
    params.append(limit)
    
    c.execute(sql, params)
    rows = c.fetchall()
    conn.close()
    
    return [
        {"id": r[0], "kind": r[1], "topic": r[2], "content": r[3], "timestamp": r[4]}
        for r in rows
    ]

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "remember":
        k = sys.argv[2] if len(sys.argv) > 2 else "decision"
        t = sys.argv[3] if len(sys.argv) > 3 else "general"
        val = " ".join(sys.argv[4:]) if len(sys.argv) > 4 else "no content"
        mid = remember(k, t, val)
        print(f"Stored memory ID #{mid}: [{k}] {t}")
    elif len(sys.argv) > 1 and sys.argv[1] == "recall":
        q = " ".join(sys.argv[2:]) if len(sys.argv) > 2 else ""
        results = recall(q)
        print(json.dumps(results, indent=2))
    else:
        init_db()
        print("Memory Bank initialized and operational at:", DB_PATH)
