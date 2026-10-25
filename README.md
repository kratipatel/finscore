# FinScore

Explainable financial health scoring with semantic transaction insights.
Team Null & Void. Stack: PostgreSQL + pgvector, MongoDB, Next.js, a Python embedding service.

## What is where

| Folder | What it holds |
|---|---|
| `db/` | SQL files: schema, procedures, trigger, views, indexes, seed data, demos |
| `web/` | Next.js app and API routes |
| `embed-service/` | Python service that turns note text into vectors, plus search evaluation |
| `docs/` | API contract, ER diagram, screenshots |

## Setup (Windows, Command Prompt)

You need: Git, Docker Desktop, Node.js 20+, Python 3.10 to 3.13.

### 1. Clone and configure
```
git clone https://github.com/kratipatel/finscore.git
cd finscore
copy .env.example .env
```
Open `.env` and replace `change_me` with a password (letters and numbers only) in **both** lines.

### 2. Start the database
Open Docker Desktop and wait until it is running, then:
```
docker compose up -d
```

### 3. Load the database files, in this order
```
docker compose exec -T pg psql -U finscore -d finscore < db\01_schema.sql
docker compose exec -T pg psql -U finscore -d finscore < db\02_procedures.sql
docker compose exec -T pg psql -U finscore -d finscore < db\03_triggers.sql
docker compose exec -T pg psql -U finscore -d finscore < db\04_views.sql
docker compose exec -T pg psql -U finscore -d finscore < db\05_indexes.sql
docker compose exec -T pg psql -U finscore -d finscore < db\06_seed.sql
docker compose exec -T pg psql -U finscore -d finscore < db\08_vector.sql
```
Run `06_seed.sql` only once (running it twice gives duplicate-key errors).

Optional: `db\09_bulk_perf_data.sql` adds 200,000 fake rows (users 1001 to 1100) for the index demo.
`db\07_demo_dml.sql` and `db\10_transaction_demo.sql` are demo scripts, not setup.

### 4. Run the web app
```
cd web
npm install
```
Create `web\.env.local` with:
```
DATABASE_URL=postgres://finscore:YOURPASSWORD@localhost:5432/finscore
EMBED_URL=http://localhost:8001
```
Use the same password as in the root `.env`. Then:
```
npm run dev
```
Open http://localhost:3000/api/score/current to check it works.

### 5. Run the embedding service (only needed for search)
In a second terminal:
```
cd embed-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --port 8001
```
The first start downloads a language model (about 90 MB), so wait for "Application startup complete".

### 6. Load the sample notes for search (once)
In a third terminal, with the same `.venv` active:
```
python seed_notes.py
python evaluate.py
```
`seed_notes.py` creates the user `search@finscore.com` with 35 embedded notes.
`evaluate.py` compares semantic search with a keyword baseline.

## Test accounts

| Email | Role | Notes |
|---|---|---|
| admin@finscore.com | admin | no transactions |
| demo@finscore.com | user | Sept and Oct 2026 data and an education loan |
| search@finscore.com | user | 35 notes for semantic search |

Passwords are placeholders. Real login is built by Person 2.

## Temporary user switch

`web/lib/currentUser.js` currently always acts as user 2 (the demo user).
Set `DEV_USER_ID=1` in `web/.env.local` to test the admin route, then remove it.
**Person 2 replaces this file with the real logged-in user from the session.**

## Reset the database from scratch

This deletes all data:
```
docker compose down -v
docker compose up -d
```
Then repeat step 3.

## More docs
- `docs/api-contract.md`: every API route and its request and response shapes
- `docs/er-diagram.png`: ER diagram