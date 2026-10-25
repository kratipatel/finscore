import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCurrentUserId } from "@/lib/currentUser";

export async function GET() {
  const userId = getCurrentUserId();

  const { rows } = await pool.query(
    `SELECT to_char(period_month, 'YYYY-MM-DD') AS period_month,
            score, change_vs_prev
       FROM v_score_trend
      WHERE user_id = $1
      ORDER BY v_score_trend.period_month`,
    [userId]
  );

  return NextResponse.json(
    rows.map((r) => ({
      period_month: r.period_month,
      score: Number(r.score),
      change_vs_prev: r.change_vs_prev === null ? null : Number(r.change_vs_prev),
    }))
  );
}