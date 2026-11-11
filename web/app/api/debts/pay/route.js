import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCurrentUserId } from "@/lib/currentUser";

export async function POST(request) {
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

  const amount = Number(body?.amount);

  if (!Number.isInteger(body?.debt_id)) {
    return NextResponse.json(
      { error: "debt_id must be an integer" },
      { status: 400 }
    );
  }

  if (!(amount > 0) || amount > 9999999999) {
    return NextResponse.json(
      { error: "amount must be a positive number" },
      { status: 400 }
    );
  }

  if (
    body.date !== undefined &&
    !/^\d{4}-\d{2}-\d{2}$/.test(String(body.date))
  ) {
    return NextResponse.json(
      { error: "date must look like 2026-10-25" },
      { status: 400 }
    );
  }

  try {
    // Calls the pay_debt procedure: payment + balance update succeed or fail together
    if (body.date) {
      await pool.query(
        "CALL pay_debt($1, $2, $3, $4)",
        [userId, body.debt_id, amount, body.date]
      );
    } else {
      await pool.query(
        "CALL pay_debt($1, $2, $3)",
        [userId, body.debt_id, amount]
      );
    }

    const { rows } = await pool.query(
      `SELECT debt_id, name, remaining_balance
       FROM debts
       WHERE debt_id = $1 AND user_id = $2`,
      [body.debt_id, userId]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Debt not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      debt_id: rows[0].debt_id,
      name: rows[0].name,
      remaining_balance: Number(rows[0].remaining_balance),
    });
  } catch (e) {
    if (e.code === "P0001") {
      return NextResponse.json(
        { error: e.message },
        { status: 400 }
      );
    }

    if (e.code === "22008" || e.code === "22007") {
      return NextResponse.json(
        { error: "Invalid date" },
        { status: 400 }
      );
    }

    console.error(e);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}