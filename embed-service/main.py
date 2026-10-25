from fastapi import FastAPI
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer

app = FastAPI(title="FinScore embedding service")

# Loaded once when the server starts. 384-dimensional embeddings.
model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")


class EmbedRequest(BaseModel):
    text: str = Field(min_length=1, max_length=1000)


@app.get("/health")
def health():
    return {"status": "ok", "dims": 384}


@app.post("/embed")
def embed(req: EmbedRequest):
    vec = model.encode(req.text, normalize_embeddings=True)
    return {"vector": vec.tolist()}