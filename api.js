// Talks to the Google Apps Script backend, or a local demo store when no API_URL is set.
window.SeatingAPI = (function () {
  const cfg = window.SEATING_CONFIG;
  // Add ?demo to the URL to try the app without touching the real data.
  const demo = !cfg.API_URL || new URLSearchParams(location.search).has("demo");

  async function call(action, data = {}) {
    if (demo) return mock(action, data);
    let res;
    try {
      // text/plain avoids a CORS preflight, which Apps Script can't answer.
      res = await fetch(cfg.API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action, ...data }),
      });
    } catch {
      throw new Error("Couldn't reach the seating server. Check your connection and try again.");
    }
    if (!res.ok) throw new Error(`Server error (${res.status}).`);
    const out = await res.json();
    if (!out.ok) throw new Error(out.error || "Something went wrong.");
    return out;
  }

  // ---------------- Demo mode (browser-only) ----------------
  const KEY = "ember-seating-demo";
  const DEMO_PASSWORD = "admin";

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || { picks: {}, attendance: {} }; }
    catch { return { picks: {}, attendance: {} }; }
  }
  function save(db) {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch {}
  }
  function adminCheck(d) {
    if (d.password !== DEMO_PASSWORD) throw new Error("Wrong password. (Demo password is 'admin'.)");
  }

  function mock(action, d) {
    const db = load();
    const key = (d.name || "").trim().toLowerCase();
    switch (action) {
      case "submit": {
        if (!key) throw new Error("Choose your name.");
        const picks = d.picks || [];
        if (!picks.length || picks.length > cfg.MAX_PICKS || new Set(picks).size !== picks.length)
          throw new Error(`Pick between 1 and ${cfg.MAX_PICKS} different desks.`);
        db.picks[key] = { name: d.name.trim(), picks, updatedAt: new Date().toISOString() };
        save(db);
        return { ok: true };
      }
      case "admin":
        adminCheck(d);
        return {
          ok: true,
          picks: Object.values(db.picks),
          attendance: db.attendance,
        };
      case "saveAttendance":
        adminCheck(d);
        db.attendance = d.attendance || {};
        save(db);
        return { ok: true };
      case "demoSeed": {
        const S = window.Office.SEATS;
        const weight = (s) => 1 + s.tags.length * 2 + (s.tags.includes("Window") ? 3 : 0);
        const fresh = { picks: {}, attendance: {} };
        cfg.STAFF.slice(0, cfg.STAFF.length - 2).forEach((name, i) => {
          // Weighted random sampling: popular desks come up more often, but not always.
          const pool = S.map((s) => ({ id: s.id, w: Math.random() ** (1 / weight(s)) }));
          pool.sort((a, b) => b.w - a.w);
          const picks = pool.slice(0, cfg.MAX_PICKS).map((p) => p.id);
          fresh.picks[name.toLowerCase()] = { name, picks, updatedAt: new Date(Date.now() - i * 3.6e6).toISOString() };
          fresh.attendance[name] = 10 + Math.floor(Math.random() * 45);
        });
        save(fresh);
        return { ok: true };
      }
      case "clear":
        adminCheck(d);
        save({ picks: {}, attendance: {} });
        return { ok: true };
      default:
        throw new Error("Unknown action.");
    }
  }

  return { call, demo };
})();
