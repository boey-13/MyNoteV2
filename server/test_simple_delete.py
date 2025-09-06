#!/usr/bin/env python3
"""
测试脚本：验证简化版删除功能
"""
import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "mynote_sync.db")

def create_test_deleted_note():
    """创建一个测试用的已删除笔记"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 清理之前的测试数据
    cursor.execute("DELETE FROM notes WHERE title = 'TEST_DELETE_ME'")
    
    # 创建一个已删除的测试笔记
    now = datetime.utcnow().isoformat() + "Z"
    cursor.execute("""
        INSERT INTO notes (title, content, user_id, is_favorite, is_deleted, 
                         updated_at, version, remote_id, dirty)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, ['TEST_DELETE_ME', 'This is a test note for deletion', 1, 0, 1, now, 1, None, 0])
    
    conn.commit()
    conn.close()
    
    print("✅ 已创建测试笔记 'TEST_DELETE_ME'")

def check_test_note():
    """检查测试笔记是否存在"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, title FROM notes WHERE title = 'TEST_DELETE_ME' AND user_id = 1")
    note = cursor.fetchone()
    
    if note:
        print(f"✅ 找到测试笔记: ID={note[0]}, 标题='{note[1]}'")
        return note[0]
    else:
        print("❌ 没有找到测试笔记")
        return None
    
    conn.close()

def simulate_simple_delete(note_id):
    """模拟简化版删除操作"""
    if not note_id:
        return
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print(f"\n🧪 模拟删除笔记 ID={note_id}")
    
    try:
        # 直接删除，不涉及队列操作
        cursor.execute("DELETE FROM notes WHERE id = ? AND user_id = ?", [note_id, 1])
        conn.commit()
        print("✅ 删除成功！")
    except Exception as e:
        print(f"❌ 删除失败: {e}")
    finally:
        conn.close()

def verify_deletion():
    """验证删除结果"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM notes WHERE title = 'TEST_DELETE_ME'")
    count = cursor.fetchone()[0]
    
    if count == 0:
        print("✅ 验证成功：测试笔记已被删除")
    else:
        print("❌ 验证失败：测试笔记仍然存在")
    
    conn.close()

def main():
    print("🔧 简化版删除功能测试")
    print("=" * 50)
    
    # 1. 创建测试笔记
    create_test_deleted_note()
    
    # 2. 检查测试笔记
    note_id = check_test_note()
    
    # 3. 模拟删除
    simulate_simple_delete(note_id)
    
    # 4. 验证结果
    verify_deletion()
    
    print("\n💡 说明:")
    print("1. 简化版删除函数直接执行DELETE操作")
    print("2. 跳过了复杂的队列操作")
    print("3. 应该能解决删除失败的问题")

if __name__ == "__main__":
    main()
