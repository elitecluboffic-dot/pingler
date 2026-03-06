const { createClient } = require("@libsql/client");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const db = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    // Buat tabel jika belum ada
    await db.execute(`
      CREATE TABLE IF NOT EXISTS pings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL,
        blog_name TEXT,
        success_count INTEGER,
        total_services INTEGER,
        results TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const result = await db.execute(
      `SELECT id, url, blog_name, success_count, total_services, created_at 
       FROM pings 
       ORDER BY created_at DESC 
       LIMIT 20`
    );

    const rows = result.rows.map((row) => ({
      id: row[0],
      url: row[1],
      blogName: row[2],
      successCount: row[3],
      totalServices: row[4],
      createdAt: row[5],
    }));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ history: rows }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to fetch history" }),
    };
  }
};
