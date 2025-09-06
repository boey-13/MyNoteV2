from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room
import sqlite3, os, datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "mynote_sync.db")

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")  # ← 新增

def now_iso():
    return datetime.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"

def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = db()
    c = conn.cursor()
    c.execute("""
      CREATE TABLE IF NOT EXISTS users(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        email TEXT UNIQUE,
        password TEXT
      )
    """)
    c.execute("""
      CREATE TABLE IF NOT EXISTS notes(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT,
        content TEXT,
        folder_id INTEGER,
        is_favorite INTEGER DEFAULT 0,
        is_deleted INTEGER DEFAULT 0,
        updated_at TEXT NOT NULL,
        version INTEGER DEFAULT 1,
        remote_id TEXT UNIQUE,
        dirty INTEGER DEFAULT 0,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    """)
    c.execute("""
      CREATE TABLE IF NOT EXISTS sync_queue(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        note_local_id INTEGER,
        remote_id TEXT,
        try_count INTEGER DEFAULT 0,
        last_error TEXT,
        created_at TEXT NOT NULL
      )
    """)
    
    # 创建索引
    c.execute("CREATE INDEX IF NOT EXISTS idx_notes_dirty ON notes(dirty)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_syncq_user ON sync_queue(user_id, created_at)")
    
    # 预置 guest 用户 id=1
    c.execute("INSERT OR IGNORE INTO users(id, username) VALUES (1, 'guest')")
    conn.commit()
    conn.close()

@app.before_request
def ensure_user():
    if request.path.startswith("/api/"):
        if request.path == "/api/health" or request.path == "/api/users/register":
            return
        uid = request.headers.get("X-User")
        if not uid or not uid.isdigit():
            return jsonify({"error":{"code":"UNAUTHORIZED","message":"X-User header (numeric) required"}}), 401

@app.get("/api/health")
def health():
    return jsonify({"ok": True, "time": now_iso()})

@app.get("/api/notes")
def list_notes():
    uid = int(request.headers.get("X-User", "0"))
    since = request.args.get("updated_after")
    limit = int(request.args.get("limit", "500"))
    conn = db(); c = conn.cursor()
    if since:
        c.execute("""SELECT id as remote_id, title, content, folder_id, is_favorite, is_deleted, updated_at, version
                     FROM notes WHERE user_id=? AND updated_at > ?
                     ORDER BY updated_at ASC LIMIT ?""", (uid, since, limit))
    else:
        c.execute("""SELECT id as remote_id, title, content, folder_id, is_favorite, is_deleted, updated_at, version
                     FROM notes WHERE user_id=? ORDER BY updated_at ASC LIMIT ?""", (uid, limit))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return jsonify({ "items": rows, "server_now": now_iso() })

@app.post("/api/notes/upsert")
def upsert_note():
    uid = int(request.headers.get("X-User", "0"))
    data = request.get_json(force=True)
    title = data.get("title","")
    content = data.get("content","")
    folder_id = data.get("folder_id")
    is_fav = 1 if data.get("is_favorite") else 0
    is_del = 1 if data.get("is_deleted") else 0
    updated_at = data.get("updated_at") or now_iso()
    remote_id = data.get("id")
    version = int(data.get("version") or 1)

    conn = db(); c = conn.cursor()
    if remote_id:
        c.execute("SELECT * FROM notes WHERE id=? AND user_id=?", (remote_id, uid))
        row = c.fetchone()
        if row:
            if (row["updated_at"] or "") < updated_at:
                c.execute("""UPDATE notes SET title=?, content=?, folder_id=?, is_favorite=?, is_deleted=?,
                             updated_at=?, version=version+1 WHERE id=? AND user_id=?""",
                          (title, content, folder_id, is_fav, is_del, updated_at, remote_id, uid))
                conn.commit()
                c.execute("SELECT version, updated_at FROM notes WHERE id=?", (remote_id,))
                rr = c.fetchone()
                conn.close()
                # ← 推送：该用户的设备收到"更新了"
                socketio.emit('note_updated', {'id': int(remote_id)}, to=f"user:{uid}")
                return jsonify({"id": remote_id, "version": rr["version"], "updated_at": rr["updated_at"]})
            else:
                conn.close()
                return jsonify({"id": remote_id, "version": row["version"], "updated_at": row["updated_at"]})
        # 如果该 id 不存在当前用户名下，则 fallthrough 当新建

    c.execute("""INSERT INTO notes (user_id,title,content,folder_id,is_favorite,is_deleted,updated_at,version)
                 VALUES (?,?,?,?,?,?,?,?)""",
              (uid, title, content, folder_id, is_fav, is_del, updated_at, version))
    new_id = c.lastrowid
    conn.commit()
    conn.close()
    socketio.emit('note_updated', {'id': int(new_id)}, to=f"user:{uid}")  # ← 新建也推送
    return jsonify({"id": new_id, "version": version, "updated_at": updated_at})

@app.delete("/api/notes/<int:rid>")
def delete_note(rid: int):
    uid = int(request.headers.get("X-User", "0"))
    conn = db(); c = conn.cursor()
    c.execute("DELETE FROM notes WHERE id=? AND user_id=?", (rid, uid))
    conn.commit(); conn.close()
    socketio.emit('note_deleted', {'id': int(rid)}, to=f"user:{uid}")  # ← 删除推送
    return jsonify({"ok": True}), 200

@app.post("/api/users/register")
def register_user():
    data = request.get_json(force=True)
    username = data.get("username", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "").strip()
    
    if not username or not email or not password:
        return jsonify({"error": {"code": "INVALID_INPUT", "message": "Username, email and password are required"}}), 400
    
    conn = db()
    c = conn.cursor()
    
    # Check if email already exists (only email needs to be unique)
    c.execute("SELECT id FROM users WHERE email = ?", (email,))
    if c.fetchone():
        conn.close()
        return jsonify({"error": {"code": "EMAIL_EXISTS", "message": "Email already exists"}}), 409
    
    # Hash the password before storing
    import hashlib
    import secrets
    
    def hash_password(password):
        salt = secrets.token_hex(16)
        hash_obj = hashlib.sha256()
        hash_obj.update((password + salt).encode('utf-8'))
        return f"{salt}:{hash_obj.hexdigest()}"
    
    hashed_password = hash_password(password)
    
    # Create new user
    c.execute("INSERT INTO users (username, email, password) VALUES (?, ?, ?)", 
              (username, email, hashed_password))
    user_id = c.lastrowid
    conn.commit()
    conn.close()
    
    return jsonify({"id": user_id, "username": username, "email": email})

# Socket.IO 连接：按用户进房间
@socketio.on('connect')
def on_connect():
    uid = request.args.get('user')
    if not uid or not uid.isdigit():
        return False  # 拒绝连接
    join_room(f"user:{uid}")
    emit('hello', {'ok': True, 'server_time': now_iso()})

if __name__ == "__main__":
    init_db()
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)  # ← 用 socketio.run