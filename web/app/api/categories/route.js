import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  const { rows } = await pool.query(
    "SELECT category_id, name, kind FROM categories ORDER BY kind, name"
  );
  return NextResponse.json(rows);
}