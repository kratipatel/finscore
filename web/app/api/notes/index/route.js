import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCurrentUserId } from "@/lib/currentUser";
import { embedText } from "@/lib/embed";

export async function POST(request) {
  const userId = getCurrentUserId();

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be valid JSON" }, { status: 400 });
  }

  const text = typeof body?.note_text === "string" ? body.note_text.trim() : "";
  if (!Number.isInteger(body?.txn_id)) {
    return NextResponse.json({ error: "txn_id must be an integer" }, { status: 400 });
  }
  if (text.length < 1 || text.length > 1000) {
    return NextResponse.json({ error: "note_text must be 1 to 1000 characters" }, { status: 400 });
  }

  // you can only attach notes to your own transactions
  const own = await pool.query(
    "SELECT 1 FROM transactions WHERE txn_id = $1 AND user_id = $2",
    [body.txn_id, userId]
  );
  if (own.rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let vec;
  try {
    vec = await embedText(text);
  } catch {
    return NextResponse.json({ error: "Search service unavailable" }, { status: 503 });
  }

  await pool.query(
    `INSERT INTO transaction_embeddings (txn_id, user_id, note_text, embedding)
     VALUES ($1, $2, $3, $4::vector)
     ON CONFLICT (txn_id) DO UPDATE
       SET note_text = EXCLUDED.note_text, embedding = EXCLUDED.embedding`,
    [body.txn_id, userId, text, vec]
  );

  return NextResponse.json({ indexed: true, txn_id: body.txn_id });
}