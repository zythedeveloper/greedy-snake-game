"""One-time DB migration: old schema → new auth schema."""
import sqlite3

conn = sqlite3.connect("game.db")
c = conn.cursor()

# Check current state
cols = [row[1] for row in c.execute("PRAGMA table_info(game_logs)").fetchall()]
print("Current game_logs columns:", cols)

# 1. Create users table
c.execute("""
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    image TEXT,
    password_hash TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
)
""")

# 2. Migrate game_logs if needed
if "is_guest" not in cols:
    c.execute("ALTER TABLE game_logs RENAME TO game_logs_old")
    c.execute("""
    CREATE TABLE game_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id),
        guest_name TEXT,
        is_guest INTEGER NOT NULL DEFAULT 0,
        score INTEGER NOT NULL,
        timestamp TEXT NOT NULL,
        difficulty TEXT NOT NULL DEFAULT 'normal',
        theme TEXT NOT NULL DEFAULT 'dark'
    )
    """)
    rows = c.execute(
        "SELECT id, user_id, score, timestamp, difficulty, theme FROM game_logs_old"
    ).fetchall()
    for row in rows:
        old_uid = (row[1] or "").strip()
        c.execute(
            "INSERT INTO game_logs (user_id, guest_name, is_guest, score, timestamp, difficulty, theme)"
            " VALUES (?,?,?,?,?,?,?)",
            (None, old_uid or None, 1, row[2], row[3], row[4], row[5]),
        )
    c.execute("DROP TABLE game_logs_old")
    print(f"Migrated {len(rows)} rows. Added users table.")
else:
    print("Already on new schema.")

conn.commit()

# Verify
print("Final game_logs schema:", [r[1] for r in c.execute("PRAGMA table_info(game_logs)").fetchall()])
print("Final users schema:", [r[1] for r in c.execute("PRAGMA table_info(users)").fetchall()])
conn.close()
print("Migration done.")
