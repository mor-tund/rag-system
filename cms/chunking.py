"""Semantic chunking — cắt văn bản theo ranh NGỮ NGHĨA thay vì cắt cứng theo ký tự.

Cách làm: tách câu → embed từng câu (bge-m3) → cắt ở nơi độ tương đồng giữa 2 câu
liền kề tụt mạnh (đổi chủ đề), kèm trần kích thước để chunk không quá to.
"""
import re

import numpy as np

from .embedding import embed

_SENT = re.compile(r"(?<=[.!?。．！？…])\s+|\n{2,}")
MAX_CHARS = 1800   # trần 1 chunk
MIN_CHARS = 200    # tránh chunk quá vụn
BREAK_PCTL = 90    # cắt ở các "khe nghĩa" lớn nhất (top ~10% khoảng cách)


def _sentences(text: str):
    return [p.strip() for p in re.split(_SENT, text) if p and p.strip()]


def _hard_split(text: str, n: int):
    return [text[i:i + n] for i in range(0, len(text), n)]


def semantic_chunk(text: str, max_chars: int = MAX_CHARS,
                   min_chars: int = MIN_CHARS, break_pctl: int = BREAK_PCTL):
    text = (text or "").strip()
    if not text:
        return []
    if len(text) <= max_chars:
        return [text]

    sents = _sentences(text)
    if len(sents) <= 2:
        return _hard_split(text, max_chars)

    vecs = embed(sents)  # đã chuẩn hoá -> tích vô hướng = cosine
    dists = [1.0 - float(np.dot(vecs[i], vecs[i + 1])) for i in range(len(sents) - 1)]
    thr = float(np.percentile(dists, break_pctl)) if dists else 1.0

    chunks, cur = [], sents[0]
    for i in range(1, len(sents)):
        gap = dists[i - 1]
        too_big = len(cur) + len(sents[i]) + 1 > max_chars
        topic_shift = gap >= thr and len(cur) >= min_chars
        if too_big or topic_shift:
            chunks.append(cur)
            cur = sents[i]
        else:
            cur = f"{cur} {sents[i]}"
    if cur.strip():
        chunks.append(cur)

    # gộp chunk quá nhỏ vào chunk trước cho đỡ vụn
    merged = []
    for c in chunks:
        if merged and len(c) < min_chars and len(merged[-1]) + len(c) + 1 <= max_chars:
            merged[-1] = f"{merged[-1]} {c}"
        else:
            merged.append(c)
    return merged
