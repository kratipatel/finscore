import { NextResponse } from "next/server";

const TYPES = ["income", "expense", "debt_payment"];

export function validateTxn(b) {
  if (!b || typeof b !== "object") return "Body must be a JSON object";
  if (!Number.isInteger(b.category_id)) return "category_id must be an integer";
  const amt = Number(b.amount);
  if (!(amt > 0) || amt > 9999999999) return "amount must be a positive number";
  if (!TYPES.includes(b.txn_type))
    return "txn_type must be income, expense or debt_payment";
  if (typeof b.txn_date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(b.txn_date))
    return "txn_date must look like 2026-10-25";
  return null;
}

export function shapeTxn(r) {
  return {
    txn_id: Number(r.txn_id),
    category_id: r.category_id,
    category: r.category,
    amount: Number(r.amount),
    txn_type: r.txn_type,
    txn_date: r.txn_date,
  };
}

export function dbErrorResponse(e) {
  if (e.code === "23503")
    return NextResponse.json({ error: "Unknown category" }, { status: 400 });
  if (e.code === "22008" || e.code === "22007")
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  console.error(e);
  return NextResponse.json({ error: "Server error" }, { status: 500 });
}