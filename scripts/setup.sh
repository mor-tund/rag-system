#!/usr/bin/env bash
# Setup toàn bộ trên server: venv + deps + DB (Docker) + schema + model.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "[1/4] Tạo venv + cài dependencies (torch CPU + requirements)"
uv venv --python 3.12
uv pip install torch --index-url https://download.pytorch.org/whl/cpu
uv pip install -r requirements.txt

echo "[2/4] Khởi động Postgres + pgvector (Docker)"
docker compose up -d db
echo "    chờ DB sẵn sàng..."
until docker exec rag-postgres pg_isready -U rag -d rag >/dev/null 2>&1; do sleep 2; done

echo "[3/4] Áp schema + migration (idempotent)"
for f in db/schema.sql db/migration_cms.sql db/migration_auth.sql; do
  docker exec -i rag-postgres psql -U rag -d rag < "$f"
done

echo "[4/4] Tải model embedding bge-m3 (~2.3GB, 1 lần)"
.venv/bin/python scripts/download_model.py

echo ""
echo "✅ Setup xong."
echo "   - Tạo file .env từ .env.example và chỉnh (nhất là RAG_ADMIN_PASSWORD, RAG_SESSION_SECRET)."
echo "   - Chạy CMS:  scripts/run_cms.sh   (cổng 8000)"
echo "   - Chạy MCP:  scripts/run_mcp.sh   (cổng 8001)"
echo "   - Web Q&A cần cài Claude Code + đăng nhập subscription trên server (cho claude -p)."