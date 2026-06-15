-- Token theo user cho MCP server (admin cấp tay - kiểu A)
CREATE TABLE IF NOT EXISTS api_token (
    id           SERIAL PRIMARY KEY,
    token        TEXT UNIQUE NOT NULL,
    user_name    TEXT NOT NULL,
    active       BOOLEAN DEFAULT true,     -- cờ "đã duyệt / còn quyền"
    expires_at   TIMESTAMPTZ,             -- NULL = không hết hạn
    last_used_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_api_token_token ON api_token(token);
