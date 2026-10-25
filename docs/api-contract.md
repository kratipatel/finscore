| GET | /api/categories | list of categories (for dropdowns) |
| GET | /api/debts | the user's debts with ids and balances |
| POST | /api/debts/pay | body: { "debt_id": 1, "amount": 5000, "date": "2026-10-26" } (date optional); returns the updated debt |