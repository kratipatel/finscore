
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const today = new Date().toLocaleDateString("en-CA");

const emptyForm = {
  category_id: "",
  txn_type: "expense",
  amount: "",
  txn_date: today,
};

export default function TransactionsPage() {
  const router = useRouter();

  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [authLoading, setAuthLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [txnResponse, categoryResponse] = await Promise.all([
        fetch("/api/transactions"),
        fetch("/api/categories"),
      ]);

      if (txnResponse.status === 401) {
        router.replace("/login");
        return;
      }

      if (!txnResponse.ok || !categoryResponse.ok) {
        throw new Error("Could not load transactions or categories.");
      }

      const txnData = await txnResponse.json();
      const categoryData = await categoryResponse.json();

      setTransactions(
        Array.isArray(txnData) ? txnData : txnData.transactions || []
      );
      setCategories(categoryData);
    } catch (err) {
      setError(err.message || "Something went wrong.");
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

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!form.category_id) {
      setError("Please select a category.");
      return;
    }

    if (!form.amount || Number(form.amount) <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    const payload = {
      category_id: Number(form.category_id),
      txn_type: form.txn_type,
      amount: Number(form.amount),
      txn_date: form.txn_date,
    };

    setSaving(true);

    try {
      const response = await fetch(
        editingId
          ? `/api/transactions/${editingId}`
          : "/api/transactions",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(result.error || "Could not save transaction.");
      }

      setMessage(editingId ? "Transaction updated!" : "Transaction added!");
      resetForm();
      await loadData();
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(transaction) {
    setEditingId(transaction.txn_id);
    setForm({
      category_id: String(transaction.category_id),
      txn_type: transaction.txn_type,
      amount: String(transaction.amount),
      txn_date: String(transaction.txn_date).slice(0, 10),
    });
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this transaction?")) {
      return;
    }

    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(result.error || "Could not delete transaction.");
      }

      setMessage("Transaction deleted!");
      await loadData();
    } catch (err) {
      setError(err.message || "Something went wrong.");
    }
  }

  const formatAmount = (amount) =>
    Number(amount).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    });

  if (authLoading) {
    return (
      <main style={styles.page}>
        <p style={{ textAlign: "center" }}>Checking your session...</p>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.heading}>Transactions</h1>
            <p style={styles.subtitle}>
              Manage your income, expenses and debt payments.
            </p>
          </div>

          <button onClick={handleLogout} style={styles.logoutButton}>
            Logout
          </button>
        </header>

        <section style={styles.card}>
          <h2 style={styles.sectionHeading}>
            {editingId ? "Edit Transaction" : "Add New Transaction"}
          </h2>

          <form onSubmit={handleSubmit}>
            <div style={styles.formGrid}>
              <label style={styles.field}>
                Transaction Type
                <select
                  name="txn_type"
                  value={form.txn_type}
                  onChange={handleChange}
                  style={styles.input}
                >
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                  <option value="debt_payment">Debt Payment</option>
                </select>
              </label>

              <label style={styles.field}>
                Category
                <select
                  name="category_id"
                  value={form.category_id}
                  onChange={handleChange}
                  style={styles.input}
                  required
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option
                      key={category.category_id}
                      value={category.category_id}
                    >
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label style={styles.field}>
                Amount (₹)
                <input
                  type="number"
                  name="amount"
                  value={form.amount}
                  onChange={handleChange}
                  placeholder="Enter amount"
                  min="0.01"
                  step="0.01"
                  style={styles.input}
                  required
                />
              </label>

              <label style={styles.field}>
                Date
                <input
                  type="date"
                  name="txn_date"
                  value={form.txn_date}
                  onChange={handleChange}
                  style={styles.input}
                  required
                />
              </label>
            </div>

            {error && <p style={styles.error}>{error}</p>}
            {message && <p style={styles.success}>{message}</p>}

            <div style={styles.actions}>
              <button
                type="submit"
                disabled={saving}
                style={styles.primaryButton}
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Transaction"
                    : "Add Transaction"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  style={styles.secondaryButton}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section style={styles.card}>
          <h2 style={styles.sectionHeading}>Transaction History</h2>

          {loading ? (
            <p>Loading transactions...</p>
          ) : transactions.length === 0 ? (
            <p>No transactions found. Add your first transaction above.</p>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Category</th>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Amount</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.txn_id}>
                      <td style={styles.td}>
                        {String(transaction.txn_date).slice(0, 10)}
                      </td>
                      <td style={styles.td}>
                        {transaction.category || "—"}
                      </td>
                      <td style={styles.td}>
                        {transaction.txn_type.replace("_", " ")}
                      </td>
                      <td style={styles.td}>
                        {formatAmount(transaction.amount)}
                      </td>
                      <td style={styles.td}>
                        <button
                          onClick={() => handleEdit(transaction)}
                          style={styles.editButton}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(transaction.txn_id)}
                          style={styles.deleteButton}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f4f6fb",
    padding: "35px 20px",
    color: "#172033",
  },
  container: {
    maxWidth: "1100px",
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    marginBottom: "25px",
  },
  heading: {
    fontSize: "30px",
    fontWeight: "700",
    marginBottom: "5px",
  },
  subtitle: {
    color: "#687386",
    marginBottom: 0,
  },
  logoutButton: {
    background: "#e8efff",
    color: "#3156d3",
    border: "none",
    padding: "11px 20px",
    borderRadius: "7px",
    cursor: "pointer",
    fontWeight: "600",
  },
  card: {
    background: "#ffffff",
    padding: "25px",
    borderRadius: "12px",
    marginBottom: "25px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  },
  sectionHeading: {
    fontSize: "20px",
    marginTop: 0,
    marginBottom: "20px",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: "18px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    fontWeight: "600",
    fontSize: "14px",
  },
  input: {
    padding: "11px",
    border: "1px solid #d8deea",
    borderRadius: "7px",
    fontSize: "14px",
    background: "#fff",
  },
  actions: {
    display: "flex",
    gap: "10px",
    marginTop: "20px",
  },
  primaryButton: {
    background: "#3156d3",
    color: "#fff",
    border: "none",
    padding: "12px 20px",
    borderRadius: "7px",
    cursor: "pointer",
  },
  secondaryButton: {
    background: "#e9edf5",
    color: "#172033",
    border: "none",
    padding: "12px 20px",
    borderRadius: "7px",
    cursor: "pointer",
  },
  error: {
    color: "#c62828",
    marginTop: "15px",
  },
  success: {
    color: "#16803c",
    marginTop: "15px",
  },
  tableWrapper: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
  },
  th: {
    padding: "13px 10px",
    borderBottom: "2px solid #e5e9f0",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "13px 10px",
    borderBottom: "1px solid #edf0f5",
    whiteSpace: "nowrap",
  },
  editButton: {
    background: "#e8efff",
    color: "#3156d3",
    border: "none",
    padding: "7px 11px",
    borderRadius: "5px",
    cursor: "pointer",
    marginRight: "7px",
  },
  deleteButton: {
    background: "#ffebeb",
    color: "#c62828",
    border: "none",
    padding: "7px 11px",
    borderRadius: "5px",
    cursor: "pointer",
  },
};
