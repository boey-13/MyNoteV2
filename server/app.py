from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room
import sqlite3, os, datetime, json

DB_PATH = os.path.join(os.path.dirname(__file__), "mynote_sync.db")

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")  # ← Added

def now_iso():
    return datetime.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"

def update_sync_status(operation_type, data=None):
    """Update sync_status.json with real-time data"""
    try:
        sync_file = os.path.join(os.path.dirname(__file__), "sync_status.json")
        
        # Load existing data
        if os.path.exists(sync_file):
            with open(sync_file, 'r') as f:
                sync_data = json.load(f)
        else:
            sync_data = {
                "sync_status": {
                    "last_updated": now_iso(),
                    "status": "active",
                    "total_users": 0,
                    "total_notes": 0,
                    "pending_sync_operations": 0,
                    "websocket_connections": 0,
                    "last_sync_operation": None
                },
                "users": [],
                "notes": [],
                "recent_operations": []
            }
        
        # Update sync status
        sync_data["sync_status"]["last_updated"] = now_iso()
        sync_data["sync_status"]["last_sync_operation"] = operation_type
        
        # Add to recent operations (keep last 10 for cleaner view)
        operation = {
            "type": operation_type,
            "timestamp": now_iso(),
            "data": data
        }
        sync_data["recent_operations"].insert(0, operation)
        sync_data["recent_operations"] = sync_data["recent_operations"][:10]
        
        # Get all users data
        conn = db()
        cursor = conn.cursor()
        
        # Get all users
        cursor.execute("SELECT id, username, email, password FROM users ORDER BY id")
        users = []
        for row in cursor.fetchall():
            users.append({
                "id": row[0],
                "username": row[1],
                "email": row[2],
                "password": "***"  # Hide password for security
            })
        sync_data["users"] = users
        
        # Get all notes with detailed info
        cursor.execute("""
            SELECT id, user_id, title, content, folder_id, is_favorite, is_deleted, updated_at, version, remote_id, dirty
            FROM notes 
            ORDER BY updated_at DESC
        """)
        notes = []
        for row in cursor.fetchall():
            notes.append({
                "id": row[0],
                "user_id": row[1],
                "title": row[2] or "",
                "content": (row[3] or "")[:100] + "..." if row[3] and len(row[3]) > 100 else (row[3] or ""),
                "folder_id": row[4],
                "is_favorite": bool(row[5]),
                "is_deleted": bool(row[6]),
                "updated_at": row[7],
                "version": row[8],
                "server_id": row[0],  # Show server ID instead of remote_id
                "client_remote_id": row[9],  # Show what client sent
                "dirty": bool(row[10])
            })
        sync_data["notes"] = notes
        
        # Update totals
        sync_data["sync_status"]["total_users"] = len(users)
        sync_data["sync_status"]["total_notes"] = len(notes)
        sync_data["sync_status"]["pending_sync_operations"] = sum(1 for note in notes if note["dirty"])
        
        conn.close()
        
        # Save updated data
        with open(sync_file, 'w') as f:
            json.dump(sync_data, f, indent=2)
            
    except Exception as e:
        print(f"Error updating sync status: {e}")

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
    
    # Create indexes
    c.execute("CREATE INDEX IF NOT EXISTS idx_notes_dirty ON notes(dirty)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_syncq_user ON sync_queue(user_id, created_at)")
    
    # Pre-create guest user id=1
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

@app.get("/api/sync-status")
def get_sync_status():
    """Get real-time sync status JSON"""
    try:
        sync_file = os.path.join(os.path.dirname(__file__), "sync_status.json")
        if os.path.exists(sync_file):
            with open(sync_file, 'r') as f:
                return json.load(f)
        else:
            return jsonify({"error": "Sync status file not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

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
                # ← Push: user's devices receive "updated"
                socketio.emit('note_updated', {'id': int(remote_id)}, to=f"user:{uid}")
                
                # Update sync status
                update_sync_status("note_updates", {
                    "note_id": int(remote_id),
                    "user_id": uid,
                    "title": title,
                    "version": rr["version"]
                })
                
                return jsonify({"id": remote_id, "version": rr["version"], "updated_at": rr["updated_at"]})
            else:
                conn.close()
                return jsonify({"id": remote_id, "version": row["version"], "updated_at": row["updated_at"]})
        # If this id doesn't exist under current username, fallthrough to create new

    c.execute("""INSERT INTO notes (user_id,title,content,folder_id,is_favorite,is_deleted,updated_at,version)
                 VALUES (?,?,?,?,?,?,?,?)""",
              (uid, title, content, folder_id, is_fav, is_del, updated_at, version))
    new_id = c.lastrowid
    conn.commit()
    conn.close()
    socketio.emit('note_updated', {'id': int(new_id)}, to=f"user:{uid}")  # ← Also push for new notes
    
    # Update sync status
    update_sync_status("note_creations", {
        "note_id": int(new_id),
        "user_id": uid,
        "title": title,
        "version": version
    })
    
    return jsonify({"id": new_id, "version": version, "updated_at": updated_at})

@app.delete("/api/notes/<int:rid>")
def delete_note(rid: int):
    uid = int(request.headers.get("X-User", "0"))
    conn = db(); c = conn.cursor()
    c.execute("DELETE FROM notes WHERE id=? AND user_id=?", (rid, uid))
    conn.commit(); conn.close()
    socketio.emit('note_deleted', {'id': int(rid)}, to=f"user:{uid}")  # ← Delete push
    
    # Update sync status
    update_sync_status("note_deletions", {
        "note_id": int(rid),
        "user_id": uid
    })
    
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
    
    # Update sync status
    update_sync_status("user_registrations", {
        "user_id": user_id,
        "username": username,
        "email": email
    })
    
    return jsonify({"id": user_id, "username": username, "email": email})

# Socket.IO connection: join room by user
@socketio.on('connect')
def on_connect():
    uid = request.args.get('user')
    if not uid or not uid.isdigit():
        return False  # Reject connection
    join_room(f"user:{uid}")
    emit('hello', {'ok': True, 'server_time': now_iso()})

if __name__ == "__main__":
    init_db()
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)  # ← Use socketio.run