"""Quản lý token theo user (kiểu A - admin cấp tay) + bảo vệ trang admin."""
import os
import secrets
from .db import connect

# Mật khẩu trang admin (đặt qua env trên server; mặc định để demo)
ADMIN_USER = os.environ.get("RAG_ADMIN_USER", "admin")
ADMIN_PASSWORD = os.environ.get("RAG_ADMIN_PASSWORD", "1234")
# Bật/tắt yêu cầu token cho MCP (mặc định BẬT)
MCP_AUTH_ON = os.environ.get("RAG_MCP_AUTH", "on").lower() != "off"


def gen_token():
    return "rag_" + secrets.token_urlsafe(24)


def create_token(user_name):
    tok = gen_token()
    conn = connect(); cur = conn.cursor()
    cur.execute("INSERT INTO api_token (token, user_name) VALUES (%s,%s) RETURNING id",
                (tok, user_name))
    tid = cur.fetchone()[0]; conn.commit(); conn.close()
    return tid, tok


def set_active(token_id, active):
    conn = connect(); cur = conn.cursor()
    cur.execute("UPDATE api_token SET active=%s WHERE id=%s", (active, token_id))
    conn.commit(); conn.close()


def delete_token(token_id):
    conn = connect(); cur = conn.cursor()
    cur.execute("DELETE FROM api_token WHERE id=%s", (token_id,))
    conn.commit(); conn.close()


def list_tokens():
    conn = connect(); cur = conn.cursor()
    cur.execute("""SELECT id,user_name,active,token,expires_at,last_used_at,created_at
                   FROM api_token ORDER BY id DESC""")
    rows = cur.fetchall(); conn.close()
    return rows


def list_users():
    """Tổng hợp theo user: số token, số token đang hiệu lực, lần dùng cuối."""
    conn = connect(); cur = conn.cursor()
    cur.execute("""SELECT user_name,
                          count(*) AS total,
                          count(*) FILTER (WHERE active AND (expires_at IS NULL OR expires_at > now())) AS active_cnt,
                          max(last_used_at) AS last_used,
                          min(created_at)  AS first_created
                   FROM api_token GROUP BY user_name ORDER BY user_name""")
    rows = cur.fetchall(); conn.close()
    return rows


def validate_token(token):
    """Trả về user_name nếu token hợp lệ (tồn tại, active, chưa hết hạn), ngược lại None."""
    if not token:
        return None
    conn = connect(); cur = conn.cursor()
    cur.execute("""SELECT user_name FROM api_token
                   WHERE token=%s AND active AND (expires_at IS NULL OR expires_at > now())""",
                (token,))
    row = cur.fetchone()
    if row:
        cur.execute("UPDATE api_token SET last_used_at=now() WHERE token=%s", (token,))
        conn.commit()
    conn.close()
    return row[0] if row else None
