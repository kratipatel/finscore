import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCurrentUserId } from "@/lib/currentUser";

export async function GET() {
  const userId = getCurrentUserId();

  const { rows } = await pool.query(
    `SELECT to_char(period_month, 'YYYY-MM-DD') AS period_month,
            income, expenses, debt_payments,
            savings_rate, expense_ratio, dti_ratio,
            savings_points, expense_points, dti_points, score
       FROM health_scores
      WHERE user_id = $1
      ORDER BY health_scores.period_month DESC
      LIMIT 1`,
    [userId]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: "No score yet" }, { status: 404 });
  }

  const r = rows[0];
  return NextResponse.json({
    period_month: r.period_month,
    score: Number(r.score),
    income: Number(r.income),
    expenses: Number(r.expenses),
    debt_payments: Number(r.debt_payments),
    components: {
      savings:  { rate: Number(r.savings_rate),  points: Number(r.savings_points), max: 40 },
      expenses: { ratio: Number(r.expense_ratio), points: Number(r.expense_points), max: 30 },
      debt:     { ratio: Number(r.dti_ratio),    points: Number(r.dti_points),     max: 30 },
    },
  });
}