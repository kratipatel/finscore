import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCurrentUserId } from "@/lib/currentUser";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rows } = await pool.query(
      `SELECT debt_id, name, remaining_balance
       FROM debts
       WHERE user_id = $1
       ORDER BY debt_id`,
      [userId]
    );

    return NextResponse.json(
      rows.map((r) => ({
        debt_id: r.debt_id,
        name: r.name,
        remaining_balance: Number(r.remaining_balance),
      }))
    );
  } catch (error) {
    console.error("GET debts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch debts" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();

    const name = body.name?.trim();
    const balance = Number(body.remaining_balance);

    if (!name || name.length > 100) {
      return NextResponse.json(
        { error: "Enter a valid debt name (maximum 100 characters)" },
        { status: 400 }
      );
    }

    if (
      body.remaining_balance === undefined ||
      !Number.isFinite(balance) ||
      balance < 0
    ) {
      return NextResponse.json(
        { error: "Enter a valid debt balance" },
        { status: 400 }
      );
    }

    const { rows } = await pool.query(
      `INSERT INTO debts (user_id, name, remaining_balance)
       VALUES ($1, $2, $3)
       RETURNING debt_id, name, remaining_balance`,
      [userId, name, balance]
    );

    return NextResponse.json(
      {
        ...rows[0],
        remaining_balance: Number(rows[0].remaining_balance),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST debts error:", error);
    return NextResponse.json(
      { error: "Failed to add debt" },
      { status: 500 }
    );
  }
}
