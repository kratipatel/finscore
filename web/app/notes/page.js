
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function NotesPage() {
  const router = useRouter();

  const [transactions, setTransactions] = useState([]);
  const [notes, setNotes] = useState([]);
  const [selectedTxn, setSelectedTxn] = useState("");
  const [noteText, setNoteText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [transactionResponse, notesResponse] = await Promise.all([
        fetch("/api/transactions"),
        fetch("/api/notes/index"),
      ]);

      if (
        transactionResponse.status === 401 ||
        notesResponse.status === 401
      ) {
        router.replace("/login");
        return;
      }

      if (!transactionResponse.ok) {
        throw new Error("Could not load transactions");
      }

      if (!notesResponse.ok) {
        throw new Error("Could not load saved notes");
      }

      const transactionData = await transactionResponse.json();
      const notesData = await notesResponse.json();

      setTransactions(transactionData);
      setNotes(notesData);
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

        await loadData();
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

  async function saveNote(e) {
    e.preventDefault();

    setMessage("");
    setError("");
    setSaving(true);

    try {
      const response = await fetch("/api/notes/index", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          txn_id: Number(selectedTxn),
          note_text: noteText,
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Could not save note");
      }

      setMessage("Note saved and indexed successfully!");
      setNoteText("");
      setSelectedTxn("");
      setSearchResults([]);

      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function searchNotes(e) {
    e.preventDefault();

    setMessage("");
    setError("");
    setSearching(true);

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}`
      );

      const data = await response.json();

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Search failed");
      }

      setSearchResults(data);
    } catch (err) {
      setError(err.message);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  const formatMoney = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(Number(amount) || 0);

  if (authLoading) {
    return (
      <main className="min-h-screen bg-slate-950 px-5 py-10 text-white">
        <p className="text-center">Checking your session...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white">
      <div className="mx-auto max-w-5xl">

        {/* Navigation */}
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

        {/* Header */}
        <header>
          <h1 className="text-3xl font-bold">
            Smart Notes & Search
          </h1>

          <p className="mt-2 text-slate-400">
            Save transaction notes and find financial information
            using intelligent semantic search.
          </p>
        </header>

        {/* Save Note Section */}
        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">
            Add a Transaction Note
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Select a transaction and add a personal note.
          </p>

          <form onSubmit={saveNote} className="mt-5 space-y-4">
            <select
              value={selectedTxn}
              onChange={(e) => setSelectedTxn(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
            >
              <option value="">Select a transaction</option>

              {transactions.map((txn) => (
                <option key={txn.txn_id} value={txn.txn_id}>
                  {txn.category} | {txn.txn_type} |{" "}
                  {formatMoney(txn.amount)} | {txn.txn_date}
                </option>
              ))}
            </select>

            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Example: Bought groceries for the month..."
              maxLength={1000}
              rows={4}
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
            />

            <p className="text-right text-xs text-slate-500">
              {noteText.length}/1000 characters
            </p>

            <button
              type="submit"
              disabled={saving || transactions.length === 0}
              className="w-full rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Note"}
            </button>
          </form>

          {transactions.length === 0 && !loading && (
            <p className="mt-3 text-sm text-amber-400">
              Add a transaction first before creating a note.
            </p>
          )}
        </section>

        {/* Messages */}
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

        {/* Semantic Search */}
        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">
            Smart Semantic Search
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Search using the meaning of your notes instead of
            matching only exact words.
          </p>

          <form
            onSubmit={searchNotes}
            className="mt-5 flex flex-col gap-3 sm:flex-row"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Example: Where did I spend money on food?"
              maxLength={200}
              required
              className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
            />

            <button
              type="submit"
              disabled={searching}
              className="rounded-xl bg-blue-500 px-6 py-3 font-semibold text-white hover:bg-blue-400 disabled:opacity-50"
            >
              {searching ? "Searching..." : "Search"}
            </button>
          </form>

          {searchResults.length > 0 && (
            <div className="mt-6 space-y-3">
              <h3 className="font-semibold">
                Search Results
              </h3>

              {searchResults.map((result) => (
                <article
                  key={result.txn_id}
                  className="rounded-xl border border-slate-700 bg-slate-950 p-4"
                >
                  <p className="font-medium text-emerald-400">
                    {result.note_text}
                  </p>

                  <p className="mt-2 text-sm text-slate-400">
                    Transaction #{result.txn_id} · {result.txn_type}
                  </p>

                  <div className="mt-2 flex flex-wrap justify-between gap-2 text-sm text-slate-400">
                    <span>{formatMoney(result.amount)}</span>
                    <span>{result.txn_date}</span>
                    <span>
                      Similarity:{" "}
                      {(result.similarity * 100).toFixed(1)}%
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}

          {searchResults.length === 0 && !searching && searchQuery && (
            <p className="mt-5 text-sm text-slate-400">
              No matching notes found. Try another search.
            </p>
          )}
        </section>

        {/* Saved Notes */}
        <section className="mt-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">
              Your Saved Notes
            </h2>

            <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">
              {notes.length} Notes
            </span>
          </div>

          {loading ? (
            <p className="text-slate-400">Loading notes...</p>
          ) : notes.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">
              No notes saved yet. Add your first transaction note!
            </div>
          ) : (
            <div className="grid gap-4">
              {notes.map((note) => (
                <article
                  key={note.txn_id}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
                >
                  <p className="text-lg font-medium text-emerald-400">
                    {note.note_text}
                  </p>

                  <div className="mt-3 flex flex-wrap justify-between gap-2 text-sm text-slate-400">
                    <span>
                      {note.category_name} · {note.txn_type}
                    </span>

                    <span>
                      {formatMoney(note.amount)}
                    </span>

                    <span>
                      {String(note.txn_date).slice(0, 10)}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-slate-500">
                    Transaction ID: {note.txn_id}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>

        <p className="mt-10 text-center text-xs text-slate-500">
          FinScore | Smart financial insights powered by pgvector
        </p>
      </div>
    </main>
  );
}
