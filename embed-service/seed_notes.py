import os
from dotenv import load_dotenv
import psycopg2
from sentence_transformers import SentenceTransformer
from datetime import date, timedelta

from notes_data import NOTES

# the database address comes from the .env file in the project root
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
conn = psycopg2.connect(os.environ["DATABASE_URL"])
cur = conn.cursor()

EMAIL = "search@finscore.com"
cur.execute(
    """INSERT INTO users (email, password_hash, role)
       VALUES (%s, 'fake_hash_search', 'user')
       ON CONFLICT (email) DO NOTHING""",
    (EMAIL,),
)
cur.execute("SELECT user_id FROM users WHERE email = %s", (EMAIL,))
user_id = cur.fetchone()[0]

cur.execute("SELECT count(*) FROM transaction_embeddings WHERE user_id = %s", (user_id,))
if cur.fetchone()[0] > 0:
    print(f"User {user_id} already has notes. Nothing to do.")
    raise SystemExit

print("Loading model and embedding the notes...")
model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
vectors = model.encode([n[3] for n in NOTES], normalize_embeddings=True)

start = date(2026, 9, 1)
for i, (topic, category, amount, text) in enumerate(NOTES):
    cur.execute("SELECT category_id FROM categories WHERE name = %s", (category,))
    category_id = cur.fetchone()[0]

    cur.execute(
        """INSERT INTO transactions (user_id, category_id, amount, txn_type, txn_date)
           VALUES (%s, %s, %s, 'expense', %s) RETURNING txn_id""",
        (user_id, category_id, amount, start + timedelta(days=i)),
    )
    txn_id = cur.fetchone()[0]

    vec = "[" + ",".join(str(float(x)) for x in vectors[i]) + "]"
    cur.execute(
        """INSERT INTO transaction_embeddings (txn_id, user_id, note_text, embedding)
           VALUES (%s, %s, %s, %s::vector)""",
        (txn_id, user_id, text, vec),
    )

conn.commit()
print(f"Done. Inserted {len(NOTES)} notes for user_id {user_id} ({EMAIL}).")