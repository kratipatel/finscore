import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCurrentUserId, isAdmin } from "@/lib/currentUser";

export async function GET() {
  const userId = getCurrentUserId();

  if (!(await isAdmin(userId))) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const totals = await pool.query(
    `SELECT (SELECT count(*) FROM users)                       AS total_users,
            (SELECT count(*) FROM transactions)                AS total_transactions,
            (SELECT COALESCE(sum(remaining_balance), 0) FROM debts) AS total_debt_outstanding`
  );

  const users = await pool.query(
    `SELECT u.user_id, u.email,
            to_char(hs.period_month, 'YYYY-MM-DD') AS period_month,
            hs.score
       FROM users u
       JOIN LATERAL (
              SELECT period_month, score
                FROM health_scores
               WHERE user_id = u.user_id
               ORDER BY period_month DESC
               LIMIT 1
            ) hs ON true
      ORDER BY u.user_id`
  );

  const t = totals.rows[0];
  return NextResponse.json({
    total_users: Number(t.total_users),
    total_transactions: Number(t.total_transactions),
    total_debt_outstanding: Number(t.total_debt_outstanding),
    users_with_scores: users.rows.map((r) => ({
      user_id: r.user_id,
      email: r.email,
      latest_month: r.period_month,
      score: Number(r.score),
    })),
  });
}