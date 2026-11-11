
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCurrentUserId } from "@/lib/currentUser";
import { embedText } from "@/lib/embed";

// GET: Display all saved notes belonging to the current user
export async function GET() {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { rows } = await pool.query(
      `SELECT
         e.txn_id,
         e.note_text,
         t.amount,
         t.txn_type,
         t.txn_date,
         c.name AS category_name
       FROM transaction_embeddings e
       JOIN transactions t ON t.txn_id = e.txn_id
       JOIN categories c ON c.category_id = t.category_id
       WHERE e.user_id = $1
       ORDER BY t.txn_date DESC`,
      [userId]
    );

    return NextResponse.json(
      rows.map((row) => ({
        ...row,
        amount: Number(row.amount),
        txn_date: row.txn_date,
      }))
    );
  } catch (error) {
    console.error("GET notes error:", error);

    return NextResponse.json(
      { error: "Failed to fetch notes" },
      { status: 500 }
    );
  }
}

// POST: Save a note and generate its vector embedding
export async function POST(request) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Body must be valid JSON" },
        { status: 400 }
      );
    }

    const text =
      typeof body?.note_text === "string"
        ? body.note_text.trim()
        : "";

    if (!Number.isInteger(body?.txn_id)) {
      return NextResponse.json(
        { error: "txn_id must be an integer" },
        { status: 400 }
      );
    }

    if (text.length < 1 || text.length > 1000) {
      return NextResponse.json(
        { error: "note_text must be 1 to 1000 characters" },
        { status: 400 }
      );
    }

    // Verify that the transaction belongs to this user
    const own = await pool.query(
      `SELECT 1
       FROM transactions
       WHERE txn_id = $1 AND user_id = $2`,
      [body.txn_id, userId]
    );

    if (own.rows.length === 0) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    // Generate embedding for semantic search
    let vec;

    try {
      vec = await embedText(text);
    } catch (error) {
      console.error("Embedding error:", error);

      return NextResponse.json(
        { error: "Search service unavailable" },
        { status: 503 }
      );
    }

    // Save or update the note
    await pool.query(
      `INSERT INTO transaction_embeddings
         (txn_id, user_id, note_text, embedding)
       VALUES ($1, $2, $3, $4::vector)
       ON CONFLICT (txn_id) DO UPDATE
         SET note_text = EXCLUDED.note_text,
             embedding = EXCLUDED.embedding`,
      [body.txn_id, userId, text, vec]
    );

    return NextResponse.json({
      indexed: true,
      txn_id: body.txn_id,
      message: "Note saved successfully",
    });
  } catch (error) {
    console.error("POST notes error:", error);

    return NextResponse.json(
      { error: "Failed to save note" },
      { status: 500 }
    );
  }
}
