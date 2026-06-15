#!/usr/bin/env bash
# Build the React SPA into web/dist. FastAPI (cms/main.py) serves it on CMS_PORT.
# Run once after pulling changes; re-run when the frontend changes.
set -e
cd "$(dirname "$0")/../web"
# Use npm (the repo root pins yarn via corepack, which breaks pnpm/yarn here).
npm install --no-audit --no-fund
npm run build
echo "✓ Built web/dist — restart CMS to serve it: bash scripts/run_cms.sh"
