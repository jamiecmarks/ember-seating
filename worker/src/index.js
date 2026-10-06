// Ember seating API: a Cloudflare Worker backed by a D1 (SQLite) database.
// Same protocol as the old Apps Script: POST a JSON body {action, ...} and get {ok, ...} back.

const ALLOWED_ORIGINS = [
  "https://jamiecmarks.github.io",
  "http://localhost:8765",
  "http://localhost:8766",
];
const MAX_PICKS = 3;

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      Vary: "Origin",
    };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return json({ ok: true, message: "Ember seating API is running." }, cors);

    let body = {};
    let out;
    try {
      body = await request.json();
      out = await handle(body, env);
    } catch (err) {
      out = { ok: false, error: err instanceof SyntaxError ? "Bad request." : String(err.message || err) };
    }
    // Echo the action so the page can tell a real reply from a stray one.
    out.action = body.action;
    return json(out, cors);
  },
};

function json(obj, headers) {
  return new Response(JSON.stringify(obj), { headers: { ...headers, "Content-Type": "application/json" } });
}

async function handle(req, env) {
  switch (req.action) {
    case "submit": return submit(req, env);
    case "admin": return admin(req, env);
    case "saveAttendance": return saveAttendance(req, env);
    case "clear": return clear(req, env);
    default: throw new Error("Unknown action.");
  }
}

// ---------------- Staff ----------------

async function submit(req, env) {
  const name = cleanName(req.name);
  const picks = Array.isArray(req.picks) ? req.picks.map(String) : [];
  if (!picks.length || picks.length > MAX_PICKS) throw new Error(`Pick between 1 and ${MAX_PICKS} desks.`);
  if (new Set(picks).size !== picks.length) throw new Error("Each pick must be a different desk.");
  if (!picks.every((p) => /^[A-Za-z0-9-]{1,8}$/.test(p))) throw new Error("Invalid desk ID.");

  await env.DB.prepare(
    `INSERT INTO picks (name_key, name, picks, updated_at) VALUES (?1, ?2, ?3, ?4)
     ON CONFLICT(name_key) DO UPDATE SET name = excluded.name, picks = excluded.picks, updated_at = excluded.updated_at`
  ).bind(name.toLowerCase(), name, JSON.stringify(picks), new Date().toISOString()).run();
  return { ok: true };
}

// ---------------- Admin ----------------

async function admin(req, env) {
  await checkAdmin(req.password, env);
  const [picks, att] = await env.DB.batch([
    env.DB.prepare("SELECT name, picks, updated_at FROM picks ORDER BY name"),
    env.DB.prepare("SELECT name, days FROM attendance"),
  ]);
  return {
    ok: true,
    picks: picks.results.map((r) => ({ name: r.name, picks: JSON.parse(r.picks), updatedAt: r.updated_at })),
    attendance: Object.fromEntries(att.results.map((r) => [r.name, r.days])),
  };
}

async function saveAttendance(req, env) {
  await checkAdmin(req.password, env);
  const entries = Object.entries(req.attendance || {}).filter(([k]) => typeof k === "string" && k.length <= 80);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM attendance"),
    ...entries.map(([name, days]) =>
      env.DB.prepare("INSERT INTO attendance (name, days) VALUES (?1, ?2)").bind(name, Math.max(0, Number(days) || 0))
    ),
  ]);
  return { ok: true };
}

async function clear(req, env) {
  await checkAdmin(req.password, env);
  await env.DB.batch([env.DB.prepare("DELETE FROM picks"), env.DB.prepare("DELETE FROM attendance")]);
  return { ok: true };
}

// ---------------- Helpers ----------------

function cleanName(name) {
  const n = String(name || "").trim();
  if (!n || n.length > 80) throw new Error("Choose your name.");
  return n;
}

async function checkAdmin(password, env) {
  const expected = env.ADMIN_PASSWORD;
  if (!expected) throw new Error("Admin password not set. Run: npx wrangler secret put ADMIN_PASSWORD");
  const enc = new TextEncoder();
  // Compare hashes in constant time so the check doesn't leak how much of the password matched.
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(String(password || ""))),
    crypto.subtle.digest("SHA-256", enc.encode(expected)),
  ]);
  if (!crypto.subtle.timingSafeEqual(a, b)) throw new Error("Wrong password.");
}
