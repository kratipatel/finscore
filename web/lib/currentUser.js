import { pool } from "@/lib/db";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const COOKIE_NAME = "finscore_session";

export async function getCurrentUserId() {
  try {
    const secret = process.env.SESSION_SECRET;

    if (!secret) {
      throw new Error("SESSION_SECRET is not configured");
    }

    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret)
    );

    const userId = Number(payload.sub);

    if (!Number.isInteger(userId) || userId <= 0) {
      return null;
    }

    return userId;
  } catch {
    return null;
  }
}

export async function isAdmin(userId) {
  if (!userId) return false;

  const { rows } = await pool.query(
    "SELECT role FROM users WHERE user_id = $1",
    [userId]
  );

  return rows.length > 0 && rows[0].role === "admin";
}