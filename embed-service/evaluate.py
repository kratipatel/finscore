import os
import re
import psycopg2
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer

from notes_data import NOTES

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
conn = psycopg2.connect(os.environ["DATABASE_URL"])
cur = conn.cursor()

# note text -> its true topic
TOPIC_OF = {text: topic for topic, _, _, text in NOTES}

# (query, the topic whose notes are the correct answers)
QUERIES = [
    ("eating at a restaurant",            "dining_out"),
    ("food delivery order",               "dining_out"),
    ("coffee with friends",               "coffee_snacks"),
    ("tea and light snacks",              "coffee_snacks"),
    ("buying vegetables and fruits",      "groceries"),
    ("household supplies shopping",       "groceries"),
    ("daily travel to college or work",   "commute"),
    ("getting around the city",           "commute"),
    ("trip home for the holidays",        "travel"),
    ("long distance journey tickets",     "travel"),
    ("watching movies and shows",         "streaming"),
    ("subscriptions and entertainment",   "streaming"),
    ("monthly household bills",           "utilities"),
    ("internet and phone recharge",       "utilities"),
]

STOP = {"a", "an", "and", "the", "to", "of", "for", "or", "in", "on", "at", "with"}

cur.execute("SELECT user_id FROM users WHERE email = 'search@finscore.com'")
user_id = cur.fetchone()[0]
cur.execute(
    "SELECT txn_id, note_text FROM transaction_embeddings WHERE user_id = %s ORDER BY txn_id",
    (user_id,),
)
ALL_NOTES = cur.fetchall()

model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")


def semantic_top5(q):
    vec = model.encode(q, normalize_embeddings=True)
    v = "[" + ",".join(str(float(x)) for x in vec) + "]"
    cur.execute(
        """SELECT note_text FROM transaction_embeddings
            WHERE user_id = %s
            ORDER BY embedding <=> %s::vector
            LIMIT 5""",
        (user_id, v),
    )
    return [r[0] for r in cur.fetchall()]


def keyword_top5(q):
    # baseline: like ILIKE '%word%' on every query word, ranked by words matched
    words = [w for w in re.findall(r"[a-z]+", q.lower()) if w not in STOP]
    scored = []
    for txn_id, text in ALL_NOTES:
        score = sum(1 for w in words if w in text.lower())
        if score > 0:
            scored.append((-score, txn_id, text))
    scored.sort()
    return [t for _, _, t in scored[:5]]


def score(results, topic):
    rel = [TOPIC_OF[t] == topic for t in results]
    precision = sum(rel) / 5          # missing results count as wrong
    rr = 0.0
    for i, r in enumerate(rel, 1):
        if r:
            rr = 1 / i
            break
    return precision, rr


lines = []
lines.append(f"{'topic':<14} {'query':<34} {'sem P@5':>8} {'kw P@5':>8}")
lines.append("-" * 68)

sem_p, kw_p, sem_rr, kw_rr = [], [], [], []
for q, topic in QUERIES:
    sp, srr = score(semantic_top5(q), topic)
    kp, krr = score(keyword_top5(q), topic)
    sem_p.append(sp); kw_p.append(kp); sem_rr.append(srr); kw_rr.append(krr)
    lines.append(f"{topic:<14} {q:<34} {sp:>8.1f} {kp:>8.1f}")

n = len(QUERIES)
lines.append("-" * 68)
lines.append(f"{'MEAN precision@5':<49} {sum(sem_p)/n:>8.3f} {sum(kw_p)/n:>8.3f}")
lines.append(f"{'MEAN reciprocal rank (MRR)':<49} {sum(sem_rr)/n:>8.3f} {sum(kw_rr)/n:>8.3f}")
lines.append("")
lines.append(f"{n} queries, {len(ALL_NOTES)} notes, 5 relevant notes per query")

out = "\n".join(lines)
print(out)
with open(os.path.join(os.path.dirname(__file__), "evaluation_results.txt"), "w") as f:
    f.write(out + "\n")