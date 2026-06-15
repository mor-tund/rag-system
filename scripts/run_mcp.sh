#!/usr/bin/env bash
# Chạy MCP server (tool RAG cho Claude của user khác nối vào).
cd "$(dirname "$0")/.."
[ -f .env ] && set -a && . ./.env && set +a
exec .venv/bin/python -m cms.mcp_server