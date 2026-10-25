CREATE EXTENSION IF NOT EXISTS vector;

-- One embedding per transaction note.
-- The note text is also kept here so search results can show it.
CREATE TABLE IF NOT EXISTS transaction_embeddings (
  txn_id    BIGINT PRIMARY KEY REFERENCES transactions(txn_id) ON DELETE CASCADE,
  user_id   INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  embedding vector(384) NOT NULL
);

-- Fast nearest-neighbour search (cosine distance)
CREATE INDEX IF NOT EXISTS idx_emb_hnsw
  ON transaction_embeddings USING hnsw (embedding vector_cosine_ops);

-- Fast filtering by user
CREATE INDEX IF NOT EXISTS idx_emb_user
  ON transaction_embeddings (user_id);