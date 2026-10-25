import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCurrentUserId } from "@/lib/currentUser";

export async function GET() {
  const userId = getCurrentUserId();
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
}