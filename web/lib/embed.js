// Calls the Python embedding service and returns the vector as text,
// in the format Postgres expects: "[0.1,0.2,...]"
export async function embedText(text) {
  const base = process.env.EMBED_URL || "http://localhost:8001";
  const res = await fetch(`${base}/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error("Embedding service error");
  const { vector } = await res.json();
  return "[" + vector.join(",") + "]";
}