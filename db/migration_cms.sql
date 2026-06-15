-- Migration cho CMS: quản lý tài liệu upload theo từng file (incremental)
-- Áp dụng: docker exec -i rag-postgres psql -U rag -d rag < db/migration_cms.sql

-- Bảng theo dõi mỗi tài liệu upload
CREATE TABLE IF NOT EXISTS document (
    id             SERIAL PRIMARY KEY,
    source_type    TEXT NOT NULL CHECK (source_type IN ('opportunity','case_study')),
    source_id      INT  NOT NULL,                 -- thuộc opp/case study nào (metadata link)
    filename       TEXT NOT NULL,
    file_path      TEXT,
    mime_type      TEXT,
    security_label TEXT DEFAULT 'Internal',       -- Public/Internal/Confidential/Restricted
    status         TEXT DEFAULT 'pending',        -- pending/processing/ready/error
    n_chunks       INT  DEFAULT 0,
    error          TEXT,
    created_at     TIMESTAMPTZ DEFAULT now(),
    updated_at     TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_document_source ON document(source_type, source_id);

-- Gắn mỗi chunk với tài liệu nguồn để xoá/nạp lại theo từng file
ALTER TABLE document_chunk ADD COLUMN IF NOT EXISTS document_id INT
    REFERENCES document(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_chunk_document ON document_chunk(document_id);

-- updated_at tự cập nhật
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_opp_touch ON opportunity;
CREATE TRIGGER trg_opp_touch BEFORE UPDATE ON opportunity
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
DROP TRIGGER IF EXISTS trg_doc_touch ON document;
CREATE TRIGGER trg_doc_touch BEFORE UPDATE ON document
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
