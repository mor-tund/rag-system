"""Backfill: re-embed lại toàn bộ tài liệu (semantic chunking mới) + dựng lại
chunk metadata cho mọi opportunity/case_study. Chạy trên server sau khi đổi logic.

    .venv/bin/python scripts/reembed.py
"""
import os
import sys

os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from cms.db import connect
from cms.pipeline import process_document
from cms.enrich import upsert_meta_chunk


def main():
    conn = connect(); cur = conn.cursor()
    cur.execute("SELECT id FROM document ORDER BY id")
    docs = [r[0] for r in cur.fetchall()]
    cur.execute("SELECT id FROM opportunity ORDER BY id")
    opps = [r[0] for r in cur.fetchall()]
    cur.execute("SELECT id FROM case_study ORDER BY id")
    css = [r[0] for r in cur.fetchall()]
    conn.close()

    print(f"[1/2] Re-embed {len(docs)} tài liệu (semantic chunking)...", flush=True)
    for d in docs:
        ok, msg = process_document(d)
        print(f"   doc {d}: {msg}", flush=True)

    print(f"[2/2] Dựng meta chunk: {len(opps)} opp + {len(css)} case study...", flush=True)
    for o in opps:
        upsert_meta_chunk("opportunity", o)
    for c in css:
        upsert_meta_chunk("case_study", c)

    print("DONE reembed", flush=True)


if __name__ == "__main__":
    main()
