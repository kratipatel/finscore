import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCurrentUserId } from "@/lib/currentUser";
import { validateTxn, shapeTxn, dbErrorResponse } from "@/lib/txn";

export async function PUT(request, { params }) {
  const userId = getCurrentUserId();
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be valid JSON" }, { status: 400 });
  }

  const problem = validateTxn(body);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  try {
    // "AND user_id = $6" means you can only edit your own transactions
    const { rows } = await pool.query(
      `UPDATE transactions
          SET category_id = $1, amount = $2, txn_type = $3, txn_date = $4
        WHERE txn_id = $5 AND user_id = $6
        RETURNING txn_id, category_id, amount, txn_type,
                  to_char(txn_date, 'YYYY-MM-DD') AS txn_date`,
      [body.category_id, body.amount, body.txn_type, body.txn_date, id, userId]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(shapeTxn(rows[0]));
  } catch (e) {
    return dbErrorResponse(e);
  }
}

export async function DELETE(request, { params }) {
  const userId = getCurrentUserId();
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const { rows } = await pool.query(
      `DELETE FROM transactions WHERE txn_id = $1 AND user_id = $2 RETURNING txn_id`,
      [id, userId]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ deleted: true });
  } catch (e) {
    return dbErrorResponse(e);
  }
}