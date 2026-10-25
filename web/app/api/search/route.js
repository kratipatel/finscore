import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCurrentUserId } from "@/lib/currentUser";
import { embedText } from "@/lib/embed";

export async function GET(request) {
  const userId = getCurrentUserId();
  const { searchParams } = new URL(request.url);

  const q = (searchParams.get("q") || "").trim();
  if (q.length < 1 || q.length > 200) {
    return NextResponse.json({ error: "q must be 1 to 200 characters" }, { status: 400 });
  }

  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "10", 10) || 10, 1), 20);

  let vec;
  try {
    vec = await embedText(q);
  } catch {
    return NextResponse.json({ error: "Search service unavailable" }, { status: 503 });
  }

  const { rows } = await pool.query(
    `SELECT e.txn_id, e.note_text, t.amount, t.txn_type,
            to_char(t.txn_date, 'YYYY-MM-DD') AS txn_date,
            1 - (e.embedding <=> $1::vector) AS similarity
       FROM transaction_embeddings e
       JOIN transactions t ON t.txn_id = e.txn_id
      WHERE e.user_id = $2
      ORDER BY e.embedding <=> $1::vector
      LIMIT $3`,
    [vec, userId, limit]
  );

  return NextResponse.json(
    rows.map((r) => ({
      txn_id: Number(r.txn_id),
      note_text: r.note_text,
      amount: Number(r.amount),
      txn_type: r.txn_type,
      txn_date: r.txn_date,
      similarity: Number(Number(r.similarity).toFixed(3)),
    }))
  );
}