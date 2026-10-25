import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCurrentUserId } from "@/lib/currentUser";
import { validateTxn, shapeTxn, dbErrorResponse } from "@/lib/txn";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request) {
  const userId = getCurrentUserId();
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if ((from && !DATE_RE.test(from)) || (to && !DATE_RE.test(to))) {
    return NextResponse.json(
      { error: "from and to must look like 2026-10-25" },
      { status: 400 }
    );
  }

  const conds = ["t.user_id = $1"];
  const params = [userId];
  if (from) {
    params.push(from);
    conds.push(`t.txn_date >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    conds.push(`t.txn_date <= $${params.length}`);
  }

  try {
    const { rows } = await pool.query(
      `SELECT t.txn_id, t.category_id, c.name AS category, t.amount, t.txn_type,
              to_char(t.txn_date, 'YYYY-MM-DD') AS txn_date
         FROM transactions t
         JOIN categories c ON c.category_id = t.category_id
        WHERE ${conds.join(" AND ")}
        ORDER BY t.txn_date DESC, t.txn_id DESC
        LIMIT 500`,
      params
    );
    return NextResponse.json(rows.map(shapeTxn));
  } catch (e) {
    return dbErrorResponse(e);
  }
}

export async function POST(request) {
  const userId = getCurrentUserId();

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be valid JSON" }, { status: 400 });
  }

  const problem = validateTxn(body);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  try {
    const { rows } = await pool.query(
      `INSERT INTO transactions (user_id, category_id, amount, txn_type, txn_date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING txn_id, category_id, amount, txn_type,
                 to_char(txn_date, 'YYYY-MM-DD') AS txn_date`,
      [userId, body.category_id, body.amount, body.txn_type, body.txn_date]
    );
    return NextResponse.json(shapeTxn(rows[0]), { status: 201 });
  } catch (e) {
    return dbErrorResponse(e);
  }
}