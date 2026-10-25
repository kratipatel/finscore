| GET | /api/categories | list of categories (for dropdowns) |
| GET | /api/debts | the user's debts with ids and balances |
| POST | /api/debts/pay | body: { "debt_id": 1, "amount": 5000, "date": "2026-10-26" } (date optional); returns the updated debt |
| POST | /api/notes/index | body: { "txn_id": 12, "note_text": "Starbucks with Riya" }, saves the note's embedding for search |
| GET | /api/search?q=coffee&limit=10 | closest notes by meaning: txn_id, note_text, amount, txn_type, txn_date, similarity |