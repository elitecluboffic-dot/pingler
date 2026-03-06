// Menggunakan Turso HTTP API langsung - tidak perlu @libsql/client
async function tursoQuery(sql, args = []) {
  const url = process.env.TURSO_DATABASE_URL.replace("libsql://", "https://");
  const token = process.env.TURSO_AUTH_TOKEN;

  const res = await fetch(`${url}/v2/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [
        { type: "execute", stmt: { sql, args: args.map((a) => ({ type: "text", value: String(a) })) } },
        { type: "close" },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Turso error ${res.status}: ${err}`);
  }

  return await res.json();
}

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    await tursoQuery(`CREATE TABLE IF NOT EXISTS pings (id INTEGER PRIMARY KEY AUTOINCREMENT, url TEXT NOT NULL, blog_name TEXT, success_count INTEGER, total_services INTEGER, results TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  } catch (e) { console.error("Create table:", e.message); }

  try {
    const data = await tursoQuery(
      `SELECT id, url, blog_name, success_count, total_services, created_at FROM pings ORDER BY created_at DESC LIMIT 20`
    );

    const rows = data.results[0].response.result.rows.map((row) => ({
      id: row[0].value,
      url: row[1].value,
      blogName: row[2].value,
      successCount: row[3].value,
      totalServices: row[4].value,
      createdAt: row[5].value,
    }));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ history: rows }),
    };
  } catch (error) {
    console.error("History error:", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
