import os
# Embed local, không gọi mạng HF (model bge-m3 đã cache)
os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")
from sentence_transformers import SentenceTransformer

EMBED_MODEL = "BAAI/bge-m3"
EMBED_DIM = 1024
_model = None


def get_model():
    global _model
    if _model is None:
        _model = SentenceTransformer(EMBED_MODEL)
    return _model


def embed(texts):
    return get_model().encode(list(texts), normalize_embeddings=True, show_progress_bar=False)