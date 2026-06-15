-- Bật extension pgvector để lưu và tìm kiếm vector ngay trong PostgreSQL.
-- Script này chạy tự động một lần khi container khởi tạo database lần đầu.
CREATE EXTENSION IF NOT EXISTS vector;