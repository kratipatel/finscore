# FinScore — Financial Health Score Platform

FinScore is an explainable financial health scoring platform that helps users understand and manage their financial condition through income, expenses, debt payments, and transaction insights.

The application provides financial health scores, transaction and debt management, monthly score trends, and semantic search over transaction notes.

**Team:** Null & Void

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | Next.js, React |
| Backend | Next.js API Routes |
| Database | PostgreSQL |
| Vector Search | pgvector |
| Authentication | JWT, jose, bcryptjs |
| Embedding Service | Python, FastAPI |
| Embedding Model | all-MiniLM-L6-v2 |
| Containerization | Docker |

> MongoDB is not used in the final implementation. Transaction notes and embeddings are stored in PostgreSQL using pgvector.

## Project Structure

| Folder | Description |
|---|---|
| `db/` | SQL schema, procedures, triggers, views, indexes, seed data and demo scripts |
| `web/` | Next.js frontend, authentication pages and API routes |
| `embed-service/` | Python embedding service, sample notes and search evaluation |
| `docs/` | API contract and ER diagram |

## Main Features

### 1. User Authentication
- User registration and login.
- Password hashing using bcryptjs.
- JWT-based session authentication.
- HTTP-only session cookies.
- Logout functionality.
- User and administrator role-based access.

### 2. Transaction Management
- Add, view, update and delete transactions.
- Categorize income and expenses.
- Store transaction amounts, dates and descriptions.
- Restrict users to their own transaction data.

### 3. Financial Health Score
The financial health score is calculated out of 100 using three components:

- Savings rate.
- Expense-to-income ratio.
- Debt-payment-to-income ratio.

The dashboard displays the current financial score and its component breakdown, along with monthly trend information.

### 4. Debt Management
- Add and view debts.
- Track outstanding debt amounts.
- Record debt payments.

### 5. Notes and Semantic Search
- Add notes to transactions.
- Generate 384-dimensional vector embeddings from transaction notes.
- Store embeddings in PostgreSQL using pgvector.
- Search notes using natural-language queries.
- Retrieve relevant notes using vector similarity.

### 6. Admin Dashboard
- View total registered users.
- View total transactions.
- View total outstanding debt.
- View users with their latest financial scores.
- Restrict administrator functionality to authorized users.

## Database Implementation — Person A

The database implementation includes:

- Relational database design and ER diagram.
- PostgreSQL table creation and relationships.
- Stored procedures for financial score calculation.
- Triggers for automatic score recalculation.
- Views for financial score and monthly trends.
- Indexes for query performance.
- Sample database records.
- SQL DML and transaction demonstration scripts.
- pgvector extension and transaction embedding storage.

### Database SQL Files

| File | Purpose |
|---|---|
| `01_schema.sql` | Creates database tables and relationships |
| `02_procedures.sql` | Defines stored procedures |
| `03_triggers.sql` | Defines database triggers |
| `04_views.sql` | Creates database views |
| `05_indexes.sql` | Creates indexes |
| `06_seed.sql` | Inserts sample data |
| `07_demo_dml.sql` | Demonstrates DML operations |
| `08_vector.sql` | Sets up pgvector and transaction embeddings |
| `09_bulk_perf_data.sql` | Generates bulk data for performance testing |
| `10_transaction_demo.sql` | Demonstrates transaction operations |

## Frontend, Authentication and Integration — Person B

The application implementation includes:

- User registration and login pages.
- JWT-based authentication and session handling.
- Password hashing and validation.
- User and administrator role-based access control.
- User-specific API access and data isolation.
- Transaction management interface.
- Debt management interface.
- Notes management interface.
- Semantic search integration with the Python embedding service.
- Financial score dashboard.
- Admin overview integration.
- PostgreSQL database integration.

## Installation and Setup

### Requirements

- Git
- Docker Desktop
- Node.js 20+
- Python 3.10–3.13

The following instructions use Windows PowerShell.

### 1. Clone the Repository

```powershell
git clone https://github.com/kratipatel/finscore.git
cd finscore
```

### 2. Configure Environment Variables

Copy the example environment file:

```powershell
Copy-Item .env.example .env
```

Configure the root `.env` file:

```env
PG_PASSWORD=YOUR_DATABASE_PASSWORD
DATABASE_URL=postgres://finscore:YOUR_DATABASE_PASSWORD@localhost:5433/finscore
```

Replace `YOUR_DATABASE_PASSWORD` with your own database password in both places.

Do not commit actual credentials or environment files to Git.

### 3. Start PostgreSQL

Make sure Docker Desktop is running.

```powershell
docker compose up -d
```

PostgreSQL runs on:

```text
localhost:5433
```

### 4. Initialize the Database

Run the SQL files in the following order from the project root:

```powershell
Get-Content -Raw db\01_schema.sql | docker compose exec -T pg psql -U finscore -d finscore
Get-Content -Raw db\02_procedures.sql | docker compose exec -T pg psql -U finscore -d finscore
Get-Content -Raw db\03_triggers.sql | docker compose exec -T pg psql -U finscore -d finscore
Get-Content -Raw db\04_views.sql | docker compose exec -T pg psql -U finscore -d finscore
Get-Content -Raw db\05_indexes.sql | docker compose exec -T pg psql -U finscore -d finscore
Get-Content -Raw db\06_seed.sql | docker compose exec -T pg psql -U finscore -d finscore
Get-Content -Raw db\08_vector.sql | docker compose exec -T pg psql -U finscore -d finscore
```

**Important:**
- Run `06_seed.sql` only once on a fresh database.
- `07_demo_dml.sql` and `10_transaction_demo.sql` are optional demonstration scripts.
- `09_bulk_perf_data.sql` is optional and intended for performance testing.

### 5. Configure and Run the Web Application

Open a new terminal:

```powershell
cd web
npm.cmd install
```

Create `web/.env.local` with:

```env
DATABASE_URL=postgres://finscore:YOUR_DATABASE_PASSWORD@localhost:5433/finscore
EMBED_URL=http://localhost:8001
SESSION_SECRET=YOUR_RANDOM_SECRET
```

Use the same database password as the root `.env` file.

Generate a strong random value for `SESSION_SECRET`. Keep this file private.

Start the application:

```powershell
npm.cmd run dev
```

Open the application:

```text
http://localhost:3000
```

### 6. Run the Python Embedding Service

Open another terminal from the project root:

```powershell
cd embed-service
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8001
```

The service uses the `sentence-transformers/all-MiniLM-L6-v2` model.

The first startup may download the model. Wait until the application reports that it has started.

The service provides:
- `GET /health` — checks service status.
- `POST /embed` — generates a vector embedding for text.

### 7. Load Sample Notes for Semantic Search

With the embedding service environment activated, run:

```powershell
python seed_notes.py
python evaluate.py
```

- `seed_notes.py` inserts sample transaction notes for `search@finscore.com`.
- `evaluate.py` compares semantic search with a keyword-based baseline.

Run sample-note seeding only once unless the sample data has been intentionally reset.

## Test Accounts

The database seed scripts provide the following sample accounts:

| Email | Role | Description |
|---|---|---|
| `admin@finscore.com` | Admin | Administrator account |
| `demo@finscore.com` | User | Sample transactions and debt data |
| `search@finscore.com` | User | Sample notes for semantic-search testing |

Passwords depend on the configured test environment. New users can also register through the application.

## Security

- Passwords are stored as bcrypt hashes.
- JWT sessions are signed and verified.
- Session cookies are HTTP-only.
- API routes verify authenticated users.
- User-specific data is protected from other users.
- Administrator routes require the admin role.
- Environment files and credentials must not be committed to Git.

## Reset the Database

**Warning: This deletes all database data.**

From the project root:

```powershell
docker compose down -v
docker compose up -d
```

After resetting, repeat the database initialization steps.

## Documentation

- `docs/api-contract.md` — API endpoints and request/response structures.
- `docs/er-diagram.png` — Entity Relationship Diagram.
- `db/` — SQL implementation and database demonstration scripts.

## Team

**Team Null & Void**

FinScore — Explainable Financial Health Score Platform with Semantic Transaction Insights.
