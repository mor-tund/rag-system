-- ============================================================
-- RAG demo schema — MOR opportunities + case studies
-- Áp dụng: docker exec -i rag-postgres psql -U rag -d rag < db/schema.sql
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- ---------- STRUCTURED (truy vấn SQL) ----------

-- 1 dòng = 1 cơ hội/đề xuất dự án (opp / proposal / estimate)
CREATE TABLE IF NOT EXISTS opportunity (
    id              SERIAL PRIMARY KEY,
    name            TEXT NOT NULL,             -- "HCMS"
    customer        TEXT,                      -- "HiveLab"
    department      TEXT,                      -- "MSOL"
    doc_type        TEXT,                      -- "estimate" / "proposal"
    tech_stack      TEXT,                      -- "Frontend: React JS, Backend: Java"
    total_effort_mm NUMERIC,                   -- tổng effort theo man-month
    total_effort_md NUMERIC,                   -- tổng effort theo man-day
    timeline_months NUMERIC,                   -- số tháng dự kiến
    budget          NUMERIC,                   -- ngân sách (nếu có)
    language        TEXT,                      -- ngôn ngữ hỗ trợ
    source_date     DATE,                      -- ngày nguồn của estimate
    owner           TEXT,                      -- sale/người phụ trách
    status          TEXT DEFAULT 'draft',      -- draft / running / won / lost ...
    description     TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 1 dòng = 1 chức năng trong WBS Function List của opp
CREATE TABLE IF NOT EXISTS opportunity_wbs_item (
    id             SERIAL PRIMARY KEY,
    opportunity_id INT NOT NULL REFERENCES opportunity(id) ON DELETE CASCADE,
    category       TEXT,                       -- "00.Common", "03.Quản lý hợp đồng"...
    name           TEXT,
    description    TEXT,
    effort_study   NUMERIC,
    effort_fe      NUMERIC,
    effort_be      NUMERIC,
    effort_ut      NUMERIC,
    effort_total   NUMERIC,
    priority       TEXT                        -- Cao / Thấp ...
);
CREATE INDEX IF NOT EXISTS idx_wbs_opp ON opportunity_wbs_item(opportunity_id);

-- 1 dòng = 1 dự án đã làm (dùng làm bằng chứng khi chào hàng)
CREATE TABLE IF NOT EXISTS case_study (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,                 -- tên ngắn / tên file
    title       TEXT,                          -- tiêu đề slide đầu
    customer    TEXT,                          -- khách hàng (có thể ẩn theo NDA)
    domain      TEXT,                          -- lĩnh vực: ride-hailing, insurance...
    tech_stack  TEXT,
    file_path   TEXT,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- ---------- VECTOR (truy vấn semantic) ----------

-- 1 dòng = 1 đoạn (chunk) nội dung tài liệu đã vector hoá
-- source_type + source_id = "metadata link" trỏ ngược về bảng structured
CREATE TABLE IF NOT EXISTS document_chunk (
    id          SERIAL PRIMARY KEY,
    source_type TEXT NOT NULL CHECK (source_type IN ('opportunity','case_study')),
    source_id   INT  NOT NULL,
    chunk_index INT,
    content     TEXT NOT NULL,
    embedding   vector(1024),                  -- bge-m3 = 1024 chiều
    metadata    JSONB DEFAULT '{}'::jsonb,      -- file, slide/sheet, ngôn ngữ...
    created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chunk_source ON document_chunk(source_type, source_id);
-- Index ANN cho tìm kiếm theo cosine (tốt khi dữ liệu lớn; với demo nhỏ vẫn chạy đúng)
CREATE INDEX IF NOT EXISTS idx_chunk_embedding
    ON document_chunk USING hnsw (embedding vector_cosine_ops);