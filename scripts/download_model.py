"""Tải model embedding bge-m3 về cache HuggingFace (chạy 1 lần trên server).
KHÔNG bật offline ở đây (cần tải về). Runtime của app dùng offline để đọc cache.
"""
import os

os.environ.setdefault("HF_XET_HIGH_PERFORMANCE", "1")
from huggingface_hub import snapshot_download

print("Tải BAAI/bge-m3 (~2.3GB, bỏ qua nếu đã có trong cache)...", flush=True)
path = snapshot_download(
    "BAAI/bge-m3",
    ignore_patterns=["onnx/*", "*.onnx", "colbert_linear.pt", "sparse_linear.pt",
                     "*.h5", "*.msgpack", "*.ot", "imgs/*", "*.jpg", "*.png", "*_attr__value"],
)
print("DONE:", path, flush=True)