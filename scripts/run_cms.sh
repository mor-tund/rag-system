#!/usr/bin/env bash
# Chạy CMS web (CRUD + upload + hỏi-đáp + admin).
cd "$(dirname "$0")/.."
# Để tiến trình tìm thấy 'claude' (cho web Hỏi-đáp) và 'uv' khi cài ở ~/.local/bin
export PATH="$HOME/.local/bin:$PATH"
[ -f .env ] && set -a && . ./.env && set +a
exec .venv/bin/python -m uvicorn cms.main:app --host 0.0.0.0 --port "${CMS_PORT:-8210}"