# FinScore API Contract

Base URL (local): `http://localhost:3000`

All endpoints return JSON. Every endpoint except the auth endpoints acts on behalf of the **logged-in user** and only ever returns or changes that user's own data. Errors always look like `{ "error": "message" }`.

> **Auth note:** `login`, `register` and `logout` are implemented by Person B (see the Authentication section). Until the session is wired in, `lib/currentUser.js` uses a temporary stub that acts as user 2 (`demo@finscore.com`), or the user in `DEV_USER_ID`.

## Summary

| Method | Path | Purpose | Who |
|---|---|---|---|
| GET | `/api/categories` | List categories for dropdowns | User |
| GET | `/api/transactions` | List own transactions (optional date range) | User |
| POST | `/api/transactions` | Add a transaction | User |
| PUT | `/api/transactions/{id}` | Edit own transaction | User |
| DELETE | `/api/transactions/{id}` | Delete own transaction | User |
| GET | `/api/debts` | List own debts and balances | User |
| POST | `/api/debts/pay` | Pay towards a debt | User |
| GET | `/api/score/current` | Latest financial health score with breakdown | User |
| GET | `/api/score/trend` | Monthly scores and month-over-month change | User |
| POST | `/api/notes/index` | Save a transaction note and its embedding | User |
| GET | `/api/search` | Semantic search over own notes | User |
| GET | `/api/admin/overview` | Platform totals and latest score per user | Admin |

## Common errors

| Status | Meaning |
|---|---|
| 400 | Invalid input (the message says which field) |
| 403 | Admin-only route used by a non-admin |
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

## Authentication (Person B)

_To be filled in by Person B: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, the session cookie name and the exact request/response bodies._