import { pool } from "@/lib/db";

// TEMPORARY: acts as user 2 (the demo user) unless DEV_USER_ID is set in
// web/.env.local. Person 2 will replace this with the logged-in user
// from the session.
export function getCurrentUserId() {
  const v = Number(process.env.DEV_USER_ID);
  return Number.isInteger(v) && v > 0 ? v : 2;
}

// Looks up the role in the database, so it can't be faked by the client
export async function isAdmin(userId) {
  const { rows } = await pool.query(
    "SELECT role FROM users WHERE user_id = $1",
    [userId]
  );
  return rows.length > 0 && rows[0].role === "admin";
}