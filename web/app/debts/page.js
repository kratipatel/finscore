
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DebtsPage() {
  const router = useRouter();

  const [debts, setDebts] = useState([]);
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [paymentAmounts, setPaymentAmounts] = useState({});
  const [paymentDates, setPaymentDates] = useState({});
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadDebts() {
    try {
      const response = await fetch("/api/debts");

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) throw new Error("Could not load debts");

      const data = await response.json();
      setDebts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function checkSession() {
      try {
        const response = await fetch("/api/auth/me");

        if (!response.ok) {
          router.replace("/login");
          return;
        }

        await loadDebts();
      } catch {
        router.replace("/login");
      } finally {
        setAuthLoading(false);
      }
    }

    checkSession();
  }, []);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  async function addDebt(e) {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          remaining_balance: Number(balance),
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) throw new Error(data.error || "Could not add debt");

      setName("");
      setBalance("");
      setMessage("Debt added successfully!");
      await loadDebts();
    } catch (err) {
      setError(err.message);
    }
  }

  async function payDebt(debtId) {
    setMessage("");
    setError("");

    const amount = Number(paymentAmounts[debtId]);
    const date = paymentDates[debtId];

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid payment amount.");
      return;
    }

    try {
      const response = await fetch("/api/debts/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          debt_id: debtId,
          amount,
          ...(date ? { date } : {}),
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) throw new Error(data.error || "Payment failed");

      setPaymentAmounts((prev) => ({ ...prev, [debtId]: "" }));
      setPaymentDates((prev) => ({ ...prev, [debtId]: "" }));
      setMessage("Payment recorded successfully!");
      await loadDebts();
    } catch (err) {
      setError(err.message);
    }
  }

  const totalDebt = debts.reduce(
    (total, debt) => total + Number(debt.remaining_balance),
    0
  );

  if (authLoading) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <p className="text-center">Checking your session...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <a
            href="/"
            className="text-emerald-400 hover:text-emerald-300"
          >
            ← Back to Dashboard
          </a>

          <button
            onClick={handleLogout}
            className="rounded-xl bg-red-500 px-5 py-2 font-semibold text-white hover:bg-red-400"
          >
            Logout
          </button>
        </div>

        <h1 className="text-3xl font-bold">Debt Management</h1>
        <p className="mt-2 text-slate-400">
          Track your outstanding debts and record payments.
        </p>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-sm text-slate-400">Total Outstanding Debt</p>
          <p className="mt-2 text-3xl font-bold text-emerald-400">
            ₹{totalDebt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Add a New Debt</h2>

          <form onSubmit={addDebt} className="mt-5 grid gap-4 sm:grid-cols-2">
            <input
              type="text"
              placeholder="Debt name (e.g. Education Loan)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              required
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-500"
            />

            <input
              type="number"
              placeholder="Remaining balance (₹)"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              min="0"
              step="0.01"
              required
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-500"
            />

            <button
              type="submit"
              className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 hover:bg-emerald-400 sm:col-span-2"
            >
              Add Debt
            </button>
          </form>
        </section>

        {message && (
          <p className="mt-5 rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
            {message}
          </p>
        )}

        {error && (
          <p className="mt-5 rounded-xl bg-red-500/10 p-3 text-red-400">
            {error}
          </p>
        )}

        <section className="mt-8">
          <h2 className="mb-4 text-xl font-semibold">Your Debts</h2>

          {loading ? (
            <p className="text-slate-400">Loading debts...</p>
          ) : debts.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">
              No debts added yet.
            </div>
          ) : (
            <div className="grid gap-5">
              {debts.map((debt) => (
                <div
                  key={debt.debt_id}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold">{debt.name}</h3>
                    <p className="text-xl font-bold text-emerald-400">
                      ₹{Number(debt.remaining_balance).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>

                  <p className="mt-1 text-sm text-slate-400">
                    Remaining balance
                  </p>

                  {Number(debt.remaining_balance) > 0 && (
                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <input
                        type="number"
                        placeholder="Payment amount (₹)"
                        min="0.01"
                        step="0.01"
                        value={paymentAmounts[debt.debt_id] || ""}
                        onChange={(e) =>
                          setPaymentAmounts((prev) => ({
                            ...prev,
                            [debt.debt_id]: e.target.value,
                          }))
                        }
                        className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-500"
                      />

                      <input
                        type="date"
                        value={paymentDates[debt.debt_id] || ""}
                        onChange={(e) =>
                          setPaymentDates((prev) => ({
                            ...prev,
                            [debt.debt_id]: e.target.value,
                          }))
                        }
                        className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
                      />

                      <button
                        type="button"
                        onClick={() => payDebt(debt.debt_id)}
                        className="rounded-xl bg-blue-500 px-4 py-3 font-semibold text-white hover:bg-blue-400"
                      >
                        Record Payment
                      </button>
                    </div>
                  )}

                  {Number(debt.remaining_balance) === 0 && (
                    <p className="mt-4 text-sm text-emerald-400">
                      Debt fully paid!
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
