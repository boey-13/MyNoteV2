#!/usr/bin/env python3
"""
测试脚本：创建一些删除队列项目来测试新功能
"""
import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "mynote_sync.db")

def create_test_delete_queue():
    """创建一些删除队列测试数据"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 清理之前的测试数据
    cursor.execute("DELETE FROM sync_queue WHERE note_local_id LIKE 'test_%'")
    
    now = datetime.utcnow().isoformat() + "Z"
    
    # 创建一些删除队列项目
    delete_items = [
        (1, "DELETE", "test_local_1", "remote_1", 0, None, now),
        (1, "DELETE", "test_local_2", "remote_2", 1, "Network timeout", now),
        (1, "DELETE", "test_local_3", "remote_3", 0, None, now),
    ]
    
    for item in delete_items:
        cursor.execute("""
            INSERT INTO sync_queue (user_id, action, note_local_id, remote_id, 
                                  try_count, last_error, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, item)
    
    conn.commit()
    conn.close()
    
    print("✅ 已创建删除队列测试数据")
    print("   - 3个删除队列项目")

def check_delete_queue():
    """检查删除队列"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 统计删除队列
    cursor.execute("SELECT COUNT(*) FROM sync_queue WHERE user_id = 1")
    queue_count = cursor.fetchone()[0]
    
    # 列出删除队列
    cursor.execute("""
        SELECT id, action, note_local_id, remote_id, try_count, last_error, created_at
        FROM sync_queue 
        WHERE user_id = 1
        ORDER BY created_at ASC
    """)
    queue_items = cursor.fetchall()
    
    print(f"\n📊 删除队列统计: {queue_count} 项")
    print("🗑️ 删除队列列表:")
    for item in queue_items:
        print(f"  ID: {item[0]}, 动作: {item[1]}, 本地ID: {item[2]}, 远程ID: {item[3]}")
        print(f"    重试次数: {item[4]}, 错误: {item[5] or 'None'}")
    
    conn.close()

def check_total_pending():
    """检查总待处理数量"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 统计dirty笔记
    cursor.execute("SELECT COUNT(*) FROM notes WHERE dirty = 1 AND user_id = 1")
    dirty_count = cursor.fetchone()[0]
    
    # 统计删除队列
    cursor.execute("SELECT COUNT(*) FROM sync_queue WHERE user_id = 1")
    queue_count = cursor.fetchone()[0]
    
    total = dirty_count + queue_count
    
    print(f"\n📈 总待处理数量:")
    print(f"  Dirty笔记: {dirty_count}")
    print(f"  删除队列: {queue_count}")
    print(f"  总计: {total}")
    
    conn.close()

def main():
    print("🧪 测试删除队列功能")
    print("=" * 40)
    
    create_test_delete_queue()
    check_delete_queue()
    check_total_pending()
    
    print("\n✅ 测试完成！")
    print("现在可以在React Native应用中测试更新后的按钮了：")
    print("'Show pending uploads' 应该显示类似：")
    print("'Pending: 3 changes + 3 deletes = 6'")

if __name__ == "__main__":
    main()
