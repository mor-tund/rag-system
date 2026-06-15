#!/usr/bin/env bash
# Chạy CMS web (CRUD + upload + hỏi-đáp + admin).
cd "$(dirname "$0")/.."
[ -f .env ] && set -a && . ./.env && set +a
exec .venv/bin/python -m uvicorn cms.main:app --host 0.0.0.0 --port "${CMS_PORT:-8210}"