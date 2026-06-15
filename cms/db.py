import os
import psycopg
from pgvector.psycopg import register_vector

DB_DSN = os.environ.get("RAG_DB_DSN", "postgresql://rag:ragpass@localhost:5432/rag")


def connect():
    conn = psycopg.connect(DB_DSN)
    register_vector(conn)
    return conn
