#!/usr/bin/env python3
"""
测试脚本：验证删除队列流程
"""
import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "mynote_sync.db")

def create_test_note_with_remote_id():
    """创建一个有remote_id的测试笔记"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 清理之前的测试数据
    cursor.execute("DELETE FROM notes WHERE title = 'TEST_DELETE_WITH_REMOTE'")
    cursor.execute("DELETE FROM sync_queue WHERE remote_id = 'test_remote_123'")
    
    # 创建一个有remote_id的已删除笔记
    now = datetime.utcnow().isoformat() + "Z"
    cursor.execute("""
        INSERT INTO notes (title, content, user_id, is_favorite, is_deleted, 
                         updated_at, version, remote_id, dirty)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, ['TEST_DELETE_WITH_REMOTE', 'This note has a remote_id', 1, 0, 1, now, 1, 'test_remote_123', 0])
    
    conn.commit()
    conn.close()
    
    print("✅ 已创建有remote_id的测试笔记 'TEST_DELETE_WITH_REMOTE'")

def check_note_before_delete():
    """检查删除前的笔记状态"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, title, remote_id, is_deleted 
        FROM notes 
        WHERE title = 'TEST_DELETE_WITH_REMOTE' AND user_id = 1
    """)
    note = cursor.fetchone()
    
    if note:
        print(f"📝 删除前笔记状态: ID={note[0]}, 标题='{note[1]}', 远程ID='{note[2]}', 已删除={note[3]}")
        return note[0]
    else:
        print("❌ 没有找到测试笔记")
        return None
    
    conn.close()

def simulate_delete_with_queue(note_id):
    """模拟带队列的删除操作"""
    if not note_id:
        return
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print(f"\n🧪 模拟删除笔记 ID={note_id} (带队列操作)")
    
    try:
        # 1. 先获取remote_id
        cursor.execute("SELECT remote_id FROM notes WHERE id = ? AND user_id = ?", [note_id, 1])
        result = cursor.fetchone()
        remote_id = result[0] if result else None
        
        if remote_id:
            print(f"   找到remote_id: {remote_id}")
            
            # 2. 加入删除队列
            now = datetime.utcnow().isoformat() + "Z"
            cursor.execute("""
                INSERT INTO sync_queue(user_id, action, note_local_id, remote_id, created_at)
                VALUES (?, 'DELETE', ?, ?, ?)
            """, [1, note_id, remote_id, now])
            print(f"   ✅ 已加入删除队列")
        else:
            print("   没有remote_id，跳过队列")
        
        # 3. 执行本地删除
        cursor.execute("DELETE FROM notes WHERE id = ? AND user_id = ?", [note_id, 1])
        conn.commit()
        print("   ✅ 本地删除成功")
        
    except Exception as e:
        print(f"   ❌ 操作失败: {e}")
    finally:
        conn.close()

def check_queue_after_delete():
    """检查删除后的队列状态"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM sync_queue WHERE user_id = 1")
    queue_count = cursor.fetchone()[0]
    
    print(f"\n📊 删除后队列状态:")
    print(f"   删除队列项目数: {queue_count}")
    
    if queue_count > 0:
        cursor.execute("""
            SELECT id, action, note_local_id, remote_id, created_at 
            FROM sync_queue 
            WHERE user_id = 1 
            ORDER BY created_at DESC
        """)
        items = cursor.fetchall()
        for item in items:
            print(f"   队列项目: ID={item[0]}, 动作={item[1]}, 本地ID={item[2]}, 远程ID={item[3]}")
    
    conn.close()

def main():
    print("🔧 删除队列流程测试")
    print("=" * 50)
    
    # 1. 创建有remote_id的测试笔记
    create_test_note_with_remote_id()
    
    # 2. 检查删除前状态
    note_id = check_note_before_delete()
    
    # 3. 模拟删除操作
    simulate_delete_with_queue(note_id)
    
    # 4. 检查删除后队列状态
    check_queue_after_delete()
    
    print("\n💡 预期结果:")
    print("1. 笔记应该被删除")
    print("2. 删除队列应该有1个项目")
    print("3. Settings中的'Show pending uploads'应该显示'1 deletes'")

if __name__ == "__main__":
    main()
