// Office floor plan + SVG renderer, shared by the staff and admin pages.
// Coordinates follow the original sketch (1300 x 725 canvas).
(function () {
  const COLS = [80, 310, 540, 770, 1000];
  const ROWS = [
    { row: "A", y: 182, chair: "up" },
    { row: "B", y: 272, chair: "down" },
    { row: "C", y: 456, chair: "up" },
    { row: "D", y: 546, chair: "down" },
  ];
  const W = 214, H = 72;

  // Seat features. Edit these if the office changes.
  const STANDING = ["A1", "B1", "C3", "D3"];
  const NEAR_SNACKS = ["A2", "A3"];
  const NEAR_DOOR = ["A1"];

  const FIXTURES = [
    { label: "DOOR", x: 14, y: 40, w: 44, h: 104, vertical: true, cls: "door" },
    { label: "SNACKS", x: 430, y: 20, w: 290, h: 64 },
    { label: "MEETING ROOM", x: 14, y: 180, w: 44, h: 268, vertical: true },
    { label: "MEETING ROOM", x: 14, y: 458, w: 44, h: 250, vertical: true },
    { label: "WINDOW", x: 1240, y: 20, w: 40, h: 688, vertical: true, cls: "window" },
  ];

  const SEATS = [];
  ROWS.forEach((r) =>
    COLS.forEach((x, i) => {
      const id = r.row + (i + 1);
      const tags = [];
      if (STANDING.includes(id)) tags.push("Standing");
      if (i === COLS.length - 1) tags.push("Window");
      if (NEAR_SNACKS.includes(id)) tags.push("Snacks");
      if (NEAR_DOOR.includes(id)) tags.push("Door");
      if (i === 0) tags.push("Rooms");
      SEATS.push({ id, x, y: r.y, w: W, h: H, chair: r.chair, standing: STANDING.includes(id), tags });
    })
  );
  const BY_ID = Object.fromEntries(SEATS.map((s) => [s.id, s]));

  function esc(v) {
    return String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function tagText(seat) {
    return seat.tags.join(" · ") || "Desk";
  }

  // opts: fill(seat)->{bg,fg,cls}, label(seat), sub(seat), badge(seat), selected, onSeat(id), aria(seat)
  function render(el, opts) {
    const o = Object.assign({ fill: () => null, label: (s) => s.id, sub: tagText, badge: () => null }, opts);
    let s = `<svg viewBox="0 0 1300 725" class="office" role="group" aria-label="Office floor plan">
      <defs>
        <pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" class="dot"/></pattern>
        <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" class="hatch"/></pattern>
      </defs>
      <rect x="0.5" y="0.5" width="1299" height="724" rx="10" class="floor"/>
      <rect x="0.5" y="0.5" width="1299" height="724" rx="10" fill="url(#dots)"/>`;

    for (const f of FIXTURES) {
      const cx = f.x + f.w / 2, cy = f.y + f.h / 2;
      s += `<g class="fixture ${f.cls || ""}"><rect x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" rx="6"/>`;
      if (f.cls === "window") s += `<rect x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" rx="6" fill="url(#hatch)" class="hatch-fill"/>`;
      s += `<text x="${cx}" y="${cy}" ${f.vertical ? `transform="rotate(90 ${cx} ${cy})"` : ""}>${esc(f.label)}</text></g>`;
    }

    for (const seat of SEATS) {
      const f = o.fill(seat) || {};
      const cls = ["seat", seat.standing ? "standing" : "", f.cls || "", o.selected === seat.id ? "selected" : ""].join(" ");
      const cx = seat.x + seat.w / 2;
      const chairY = seat.chair === "up" ? seat.y - 16 : seat.y + seat.h + 6;
      const aria = o.aria ? o.aria(seat) : `Desk ${seat.id}, ${tagText(seat)}`;
      s += `<g class="${cls}" data-id="${seat.id}" tabindex="0" role="button" aria-label="${esc(aria)}">`;
      s += `<rect class="chair" x="${cx - 30}" y="${chairY}" width="60" height="10" rx="5"/>`;
      s += `<rect class="desk" x="${seat.x}" y="${seat.y}" width="${seat.w}" height="${seat.h}" rx="8" ${f.bg ? `style="fill:${f.bg}"` : ""}/>`;
      const fg = f.fg ? `style="fill:${f.fg}"` : "";
      s += `<text class="seat-id" x="${seat.x + 16}" y="${seat.y + 27}" ${fg}>${esc(o.label(seat))}</text>`;
      const sub = o.sub(seat);
      if (sub) s += `<text class="seat-sub" x="${seat.x + 16}" y="${seat.y + 52}" ${fg}>${esc(sub)}</text>`;
      const badge = o.badge(seat);
      if (badge != null && badge !== "") {
        s += `<rect class="badge" x="${seat.x + seat.w - 38}" y="${seat.y + 12}" width="26" height="22" rx="5"/>`;
        s += `<text class="badge-text" x="${seat.x + seat.w - 25}" y="${seat.y + 24}">${esc(badge)}</text>`;
      }
      s += `</g>`;
    }
    s += `</svg>`;
    el.innerHTML = s;

    const fire = (e) => {
      const g = e.target.closest(".seat");
      if (g && o.onSeat) o.onSeat(g.dataset.id);
    };
    el.onclick = fire;
    el.onkeydown = (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fire(e); }
    };
  }

  window.Office = { SEATS, seatById: (id) => BY_ID[id], render, tagText, esc };
})();
