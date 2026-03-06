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

const PING_SERVICES = [
  { name: "Google", url: "https://www.google.com/ping", type: "get", param: "sitemap" },
  { name: "Bing", url: "https://www.bing.com/ping", type: "get", param: "sitemap" },
  { name: "IndexNow", url: "https://www.bing.com/indexnow", type: "get", param: "url" },
  { name: "Yandex", url: "https://webmaster.yandex.com/ping", type: "get", param: "sitemap" },
  { name: "Ping-o-Matic", url: "http://rpc.pingomatic.com/", type: "xmlrpc", method: "weblogUpdates.extendedPing" },
  { name: "Feedburner", url: "http://ping.feedburner.com/", type: "xmlrpc", method: "weblogUpdates.ping" },
  { name: "BlogPing", url: "http://blogping.com/api/ping", type: "xmlrpc", method: "weblogUpdates.ping" },
  { name: "Technorati", url: "http://rpc.technorati.com/rpc/ping", type: "xmlrpc", method: "weblogUpdates.ping" },
  { name: "BlogLines", url: "http://www.bloglines.com/ping", type: "xmlrpc", method: "weblogUpdates.ping" },
  { name: "Weblogs.com", url: "http://rpc.weblogs.com/RPC2", type: "xmlrpc", method: "weblogUpdates.extendedPing" },
];

async function pingGetService(service, url) {
  try {
    const pingUrl = `${service.url}?${service.param}=${encodeURIComponent(url)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(pingUrl, { signal: controller.signal });
    clearTimeout(timeout);
    return { name: service.name, success: res.ok, status: res.status };
  } catch {
    return { name: service.name, success: false, status: "timeout" };
  }
}

async function pingXmlRpcService(service, blogName, url) {
  try {
    const xmlBody = `<?xml version="1.0"?><methodCall><methodName>${service.method}</methodName><params><param><value><string>${blogName}</string></value></param><param><value><string>${url}</string></value></param></params></methodCall>`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(service.url, {
      method: "POST",
      headers: { "Content-Type": "text/xml" },
      body: xmlBody,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return { name: service.name, success: res.ok, status: res.status };
  } catch {
    return { name: service.name, success: false, status: "timeout" };
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { url, blogName = "My Blog" } = body;
  if (!url) return { statusCode: 400, body: JSON.stringify({ error: "URL is required" }) };
  try { new URL(url); } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid URL format" }) };
  }

  try {
    await tursoQuery(`CREATE TABLE IF NOT EXISTS pings (id INTEGER PRIMARY KEY AUTOINCREMENT, url TEXT NOT NULL, blog_name TEXT, success_count INTEGER, total_services INTEGER, results TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  } catch (e) { console.error("Create table:", e.message); }

  const settled = await Promise.allSettled(
    PING_SERVICES.map((s) => s.type === "get" ? pingGetService(s, url) : pingXmlRpcService(s, blogName, url))
  );
  const results = settled.map((r) => r.status === "fulfilled" ? r.value : { name: "Unknown", success: false, status: "error" });
  const successCount = results.filter((r) => r.success).length;

  try {
    await tursoQuery(
      `INSERT INTO pings (url, blog_name, success_count, total_services, results) VALUES (?, ?, ?, ?, ?)`,
      [url, blogName, successCount, PING_SERVICES.length, JSON.stringify(results)]
    );
  } catch (e) { console.error("DB insert:", e.message); }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ success: true, url, blogName, successCount, totalServices: PING_SERVICES.length, results }),
  };
};
