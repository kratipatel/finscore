# FinScore API Contract

Base URL (local): `http://localhost:3000`

All endpoints return JSON. Every endpoint except `register` and `login` requires a logged-in session and only ever returns or changes that user's own data. Errors always look like `{ "error": "message" }`.

**Authentication:** the server sets an HTTP-only cookie named `finscore_session` on login or register. It holds a signed JWT (HS256, 7-day expiry, signed with `SESSION_SECRET`) whose subject is the user id. The browser sends it automatically, so no `Authorization` header is needed. Requests without a valid cookie get `401`.

## Summary

| Method | Path | Purpose | Who |
|---|---|---|---|
| POST | `/api/auth/register` | Create an account and log in | Public |
| POST | `/api/auth/login` | Log in | Public |
| POST | `/api/auth/logout` | Log out (clears the cookie) | User |
| GET | `/api/auth/me` | Current user's id, email and role | User |
| GET | `/api/categories` | List categories for dropdowns | User |
| GET | `/api/transactions` | List own transactions (optional date range) | User |
| POST | `/api/transactions` | Add a transaction | User |
| PUT | `/api/transactions/{id}` | Edit own transaction | User |
| DELETE | `/api/transactions/{id}` | Delete own transaction | User |
| GET | `/api/debts` | List own debts and balances | User |
| POST | `/api/debts` | Add a debt | User |
| POST | `/api/debts/pay` | Pay towards a debt | User |
| GET | `/api/score/current` | Latest financial health score with breakdown | User |
| GET | `/api/score/trend` | Monthly scores and month-over-month change | User |
| GET | `/api/notes/index` | List the user's saved notes | User |
| POST | `/api/notes/index` | Save a transaction note and its embedding | User |
| GET | `/api/search` | Semantic search over own notes | User |
| GET | `/api/admin/overview` | Platform totals and latest score per user | Admin |

## Common errors

| Status | Meaning |
|---|---|
| 400 | Invalid input (the message says which field) |
| 401 | Not logged in, or the session cookie is invalid or expired |
| 403 | Admin-only route used by a non-admin |
| 409 | Email already registered |
| 404 | Not found, or the record belongs to another user |
| 503 | Embedding service is not running (notes and search only) |
| 500 | Unexpected server error |

---

## Categories

### GET `/api/categories`
Returns all categories, sorted by name.

```json
[
  { "category_id": 8, "name": "Loan EMI", "kind": "debt_payment" },
  { "category_id": 4, "name": "Food", "kind": "expense" },
  { "category_id": 1, "name": "Salary", "kind": "income" }
]
```
`kind` is one of `income`, `expense`, `debt_payment`.

---

## Transactions

### GET `/api/transactions`
Lists the user's transactions, newest first, up to 500.

| Query param | Required | Format | Meaning |
|---|---|---|---|
| `from` | No | `YYYY-MM-DD` | Only transactions on or after this date |
| `to` | No | `YYYY-MM-DD` | Only transactions on or before this date |

Example: `/api/transactions?from=2026-10-01&to=2026-10-31`

```json
[
  {
    "txn_id": 9,
    "category_id": 8,
    "category": "Loan EMI",
    "amount": 5000,
    "txn_type": "debt_payment",
    "txn_date": "2026-10-15"
  }
]
```
Errors: `400` if `from` or `to` is not `YYYY-MM-DD`.

### POST `/api/transactions`
Body:
```json
{
  "category_id": 4,
  "amount": 450.5,
  "txn_type": "expense",
  "txn_date": "2026-10-25"
}
```
Rules: `category_id` is an integer, `amount` is greater than 0, `txn_type` is `income`, `expense` or `debt_payment`, `txn_date` is `YYYY-MM-DD`.

Returns `201` with the created transaction (without the `category` name):
```json
{ "txn_id": 11, "category_id": 4, "amount": 450.5, "txn_type": "expense", "txn_date": "2026-10-25" }
```
Errors: `400` for invalid fields, an unknown category, or an invalid date.

**Side effect:** a database trigger recalculates that month's health score automatically.

### PUT `/api/transactions/{id}`
Same body as POST. Returns the updated transaction. Only the owner's transactions can be edited.
Errors: `400` invalid id or body, `404` not found (including other users' transactions).

**Side effect:** the trigger recalculates the score for the old month and, if the date moved, the new month.

### DELETE `/api/transactions/{id}`
Returns `{ "deleted": true }`. Errors: `400` invalid id, `404` not found.

**Side effect:** the trigger recalculates that month's score.

---

## Debts

### GET `/api/debts`
```json
[ { "debt_id": 1, "name": "Education Loan", "remaining_balance": 195000 } ]
```

### POST `/api/debts`
Adds a debt for the logged-in user.
```json
{ "name": "Credit Card", "remaining_balance": 25000 }
```
`name` is required (up to 100 characters). `remaining_balance` is a number of 0 or more.

Returns `201`:
```json
{ "debt_id": 2, "name": "Credit Card", "remaining_balance": 25000 }
```
Errors: `400` for an invalid name or balance.

### POST `/api/debts/pay`
Body:
```json
{ "debt_id": 1, "amount": 5000, "date": "2026-10-26" }
```
`date` is optional (defaults to today). `amount` must be greater than 0.

Returns the updated debt:
```json
{ "debt_id": 1, "name": "Education Loan", "remaining_balance": 190000 }
```
Errors: `400` for an invalid body, a payment larger than the balance, or a debt that does not exist or belongs to someone else.

**Side effect:** runs the `pay_debt` stored procedure inside a database transaction. The payment record and the balance update succeed or fail together.

---

## Financial health score

The score is out of 100: savings rate (40 points), expense-to-income ratio (30 points) and debt-payment-to-income ratio (30 points).

### GET `/api/score/current`
Returns the latest month's score.
```json
{
  "period_month": "2026-10-01",
  "score": 88.9,
  "income": 50000,
  "expenses": 28000,
  "debt_payments": 5000,
  "components": {
    "savings":  { "rate": 0.34,  "points": 40,   "max": 40 },
    "expenses": { "ratio": 0.56, "points": 26.4, "max": 30 },
    "debt":     { "ratio": 0.1,  "points": 22.5, "max": 30 }
  }
}
```
Errors: `404` `{ "error": "No score yet" }` if the user has no transactions.

### GET `/api/score/trend`
All months in order, with the change from the previous month (`null` for the first month). Reads from the `v_score_trend` view.
```json
[
  { "period_month": "2026-09-01", "score": 91.3, "change_vs_prev": null },
  { "period_month": "2026-10-01", "score": 88.9, "change_vs_prev": -2.4 }
]
```

---

## Notes and semantic search

These need the Python embedding service running on `EMBED_URL` (default `http://localhost:8001`). If it is down, both return `503` `{ "error": "Search service unavailable" }`.

### GET `/api/notes/index`
Lists the user's saved notes, newest transaction first.
```json
[
  {
    "txn_id": 12,
    "note_text": "Starbucks with Riya",
    "amount": 450,
    "txn_type": "expense",
    "txn_date": "2026-10-20",
    "category_name": "Food"
  }
]
```

### POST `/api/notes/index`
Attaches a note to one of the user's own transactions and stores its 384-dimension embedding in PostgreSQL (pgvector). Calling it again for the same `txn_id` replaces the note.

Body:
```json
{ "txn_id": 12, "note_text": "Starbucks with Riya" }
```
`note_text` must be 1 to 1000 characters.

Returns:
```json
{ "indexed": true, "txn_id": 12 }
```
Errors: `400` invalid input, `404` if the transaction is not the user's.

### GET `/api/search`
Finds the user's notes closest in meaning to the query, using cosine similarity.

| Query param | Required | Meaning |
|---|---|---|
| `q` | Yes | Search text, 1 to 200 characters |
| `limit` | No | Number of results, 1 to 20 (default 10) |

Example: `/api/search?q=coffee&limit=5`
```json
[
  {
    "txn_id": 12,
    "note_text": "Starbucks with Riya",
    "amount": 450,
    "txn_type": "expense",
    "txn_date": "2026-10-20",
    "similarity": 0.512
  }
]
```
Results are ordered most similar first. `similarity` is between 0 and 1.

---

## Admin

### GET `/api/admin/overview`
Admin role only. The role is read from the database, not from the client.
```json
{
  "total_users": 3,
  "total_transactions": 10,
  "total_debt_outstanding": 195000,
  "users_with_scores": [
    { "user_id": 2, "email": "demo@finscore.com", "latest_month": "2026-10-01", "score": 88.9 }
  ]
}
```
Errors: `403` `{ "error": "Admins only" }` for non-admin users. Users with no score yet are not listed.

---

## Authentication

### POST `/api/auth/register`
```json
{ "email": "new@example.com", "password": "at-least-8-chars" }
```
The email is trimmed and lower-cased, and must be valid. The password must be at least 8 characters and is stored as a bcrypt hash (never in plain text). New accounts always get the `user` role. The user is logged in immediately.

Returns `201`:
```json
{ "message": "Registration successful", "user": { "user_id": 7, "email": "new@example.com", "role": "user" } }
```
Errors: `400` for a missing or invalid email or a short password, `409` if the email is already registered.

### POST `/api/auth/login`
```json
{ "email": "demo@finscore.com", "password": "Demo@1234" }
```
Returns `200` and sets the `finscore_session` cookie:
```json
{ "message": "Login successful", "user": { "user_id": 2, "email": "demo@finscore.com", "role": "user" } }
```
Errors: `400` if a field is missing, `401` `{ "error": "Invalid email or password" }` for an unknown email or a wrong password (the same message for both, so attackers cannot tell which emails exist).

### POST `/api/auth/logout`
Clears the session cookie. Returns `{ "message": "Logout successful" }`.

### GET `/api/auth/me`
Returns the logged-in user, or `401` if there is no valid session.
```json
{ "user": { "user_id": 2, "email": "demo@finscore.com", "role": "user" } }
```

## Demo accounts (local only)

| Email | Role | Password |
|---|---|---|
| `admin@finscore.com` | admin | `Demo@1234` |
| `demo@finscore.com` | user | `Demo@1234` |
| `search@finscore.com` | user | `Demo@1234` (has sample notes for search testing) |

These passwords are for local demos only.
