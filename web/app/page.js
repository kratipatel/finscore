
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const [categories, setCategories] = useState([]);
  const [debts, setDebts] = useState([]);
  const [scoreData, setScoreData] = useState(null);
  const [error, setError] = useState("");
  const [authLoading, setAuthLoading] = useState(true);

  const formatMoney = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount ?? 0);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } catch (error) {
      console.error("Logout error:", error);
    }

    router.replace("/login");
    router.refresh();
  }

  useEffect(() => {
    async function loadData() {
      try {
        // First, verify the user's login session.
        const authResponse = await fetch("/api/auth/me");

        if (authResponse.status === 401) {
          router.replace("/login");
          return;
        }

        if (!authResponse.ok) {
          throw new Error("Unable to verify login session");
        }

        // Session is valid. Allow the dashboard to display.
        setAuthLoading(false);

        // Load dashboard data.
        const [categoryResponse, debtResponse, scoreResponse] =
          await Promise.all([
            fetch("/api/categories"),
            fetch("/api/debts"),
            fetch("/api/score/current"),
          ]);

        // Redirect if the session is no longer valid.
        if (
          debtResponse.status === 401 ||
          scoreResponse.status === 401
        ) {
          setAuthLoading(true);
          router.replace("/login");
          return;
        }

        if (categoryResponse.ok) {
          setCategories(await categoryResponse.json());
        }

        if (debtResponse.ok) {
          setDebts(await debtResponse.json());
        }

        if (scoreResponse.ok) {
          setScoreData(await scoreResponse.json());
        } else {
          setError("Financial score is not available yet.");
        }
      } catch (error) {
        console.error("Dashboard loading error:", error);
        setError("Unable to load live data. Please check the server.");
        setAuthLoading(false);
      }
    }

    loadData();
  }, [router]);

  // Show a loading screen while checking authentication.
  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-600">
          Checking your session...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">

        {/* Sidebar */}
        <aside className="hidden w-60 flex-col bg-slate-950 p-6 text-white md:flex">
          <h1 className="text-2xl font-bold">FinScore</h1>

          <p className="mt-1 text-sm text-slate-400">
            Your money, understood.
          </p>

          <nav className="mt-10 space-y-3 text-sm">
            <p className="rounded-xl bg-emerald-500/20 px-4 py-3 text-emerald-300">
              Dashboard
            </p>

            <a
              href="/transactions"
              className="block rounded-xl px-4 py-3 text-slate-300 hover:bg-emerald-500/20 hover:text-emerald-300"
            >
              Transactions
            </a>

            <a
              href="/debts"
              className="block rounded-xl px-4 py-3 text-slate-300 hover:bg-emerald-500/20 hover:text-emerald-300"
            >
              Debts
            </a>

            <a
              href="/notes"
              className="block rounded-xl px-4 py-3 text-slate-300 hover:bg-emerald-500/20 hover:text-emerald-300"
            >
              Smart Notes & Search
            </a>
          </nav>

          <p className="mt-auto text-xs text-slate-500">
            Financial wellness made simple
          </p>
        </aside>

        {/* Main Dashboard */}
        <section className="w-full p-5 sm:p-8 lg:p-10">

          {/* Header */}
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">Overview</p>

              <h2 className="mt-1 text-3xl font-bold">
                Financial dashboard
              </h2>

              <p className="mt-2 text-slate-500">
                Understand your spending and build healthier money habits.
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="rounded-full bg-white px-5 py-2 text-sm font-medium text-red-600 shadow-sm hover:bg-red-50"
            >
              Logout
            </button>
          </header>

          {/* Summary Cards */}
          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">

            {/* Financial Health Score */}
            <article className="rounded-2xl bg-emerald-600 p-6 text-white shadow-sm">
              <p className="text-sm text-emerald-100">
                Financial Health Score
              </p>

              <p className="mt-3 text-5xl font-bold">
                {scoreData ? scoreData.score : "--"}
                <span className="text-xl">/100</span>
              </p>

              <p className="mt-3 text-sm text-emerald-100">
                {scoreData
                  ? "Your latest financial health score"
                  : "Score not available"}
              </p>
            </article>

            {/* Debts */}
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">Your debts</p>

              <p className="mt-3 text-3xl font-bold">
                {debts.length}
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Debt records in your account
              </p>
            </article>

            {/* Categories */}
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">
                Expense categories
              </p>

              <p className="mt-3 text-3xl font-bold">
                {categories.length}
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Available transaction categories
              </p>
            </article>
          </div>

          {/* Financial Snapshot */}
          <div className="mt-8 grid gap-5 lg:grid-cols-2">

            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold">
                Your financial snapshot
              </h3>

              {scoreData ? (
                <div className="mt-5 space-y-5">

                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      Monthly income
                    </span>

                    <strong>
                      {formatMoney(scoreData.income)}
                    </strong>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      Monthly expenses
                    </span>

                    <strong>
                      {formatMoney(scoreData.expenses)}
                    </strong>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      Debt payments
                    </span>

                    <strong>
                      {formatMoney(scoreData.debt_payments)}
                    </strong>
                  </div>

                  <div className="flex justify-between border-t pt-4">
                    <span className="font-medium">Savings</span>

                    <strong className="text-emerald-600">
                      {formatMoney(
                        scoreData.income - scoreData.expenses
                      )}
                    </strong>
                  </div>

                  <p className="text-xs text-slate-400">
                    Score period: {scoreData.period_month}
                  </p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">
                  {error || "Loading financial information..."}
                </p>
              )}
            </article>

            {/* Score Breakdown */}
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold">
                Financial score breakdown
              </h3>

              {scoreData ? (
                <div className="mt-5 space-y-5">

                  {[
                    {
                      name: "Savings",
                      points: scoreData.components.savings.points,
                      max: scoreData.components.savings.max,
                    },
                    {
                      name: "Expense management",
                      points: scoreData.components.expenses.points,
                      max: scoreData.components.expenses.max,
                    },
                    {
                      name: "Debt management",
                      points: scoreData.components.debt.points,
                      max: scoreData.components.debt.max,
                    },
                  ].map((item) => (
                    <div key={item.name}>
                      <div className="mb-2 flex justify-between text-sm">
                        <span>{item.name}</span>

                        <strong>
                          {item.points}/{item.max}
                        </strong>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(
                                0,
                                (item.points / item.max) * 100
                              )
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">
                  Score breakdown is not available yet.
                </p>
              )}
            </article>
          </div>

          {/* Categories */}
          <article className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold">
              Available categories
            </h3>

            {categories.length > 0 ? (
              <ul className="mt-4 flex flex-wrap gap-2">
                {categories.map((category, index) => (
                  <li
                    key={category.category_id ?? category.id ?? index}
                    className="rounded-full bg-slate-100 px-3 py-2 text-sm"
                  >
                    {category.name ??
                      category.category_name ??
                      `Category ${index + 1}`}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                No categories loaded yet.
              </p>
            )}
          </article>

          {error && (
            <p className="mt-5 text-sm text-red-600">
              {error}
            </p>
          )}

          <p className="mt-8 text-xs text-slate-400">
            FinScore | Financial wellness made simple
          </p>
        </section>
      </div>
    </main>
  );
}
