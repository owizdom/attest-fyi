"use strict";

const S = { latest: null, history: [], metric: "trust_gap_pct", range: 0,
            sort: { key: "score", dir: -1 } };

const $ = (id) => document.getElementById(id);

async function load() {
  try {
    const [l, h] = await Promise.all([
      fetch("/api/latest").then((r) => r.json()),
      fetch("/api/history").then((r) => r.json()),
    ]);
    if (l && l.providers) return { latest: l, history: h || [] };
    throw new Error("no live data");
  } catch (e) {
    const s = window.__ATTEST_SNAPSHOT__;
    if (s) return { latest: s.latest, history: s.history || [] };
    return { latest: null, history: [] };
  }
}

/* ---------- hero ---------- */
function renderHero() {
  const d = S.latest;
  if (!d) return;
  const s = d.summary;
  $("hero-gap").textContent = s.trust_gap_pct + "%";
  $("hero-phrase").textContent =
    "of audited providers (" + s.deviating + " of " + s.with_reference +
    " with a reference) serve a different model than they attest.";
  $("board-sub").textContent =
    s.scored + " providers tested · " + s.skipped + " skipped (no key)";
  $("board-stat").textContent = s.trust_gap_pct + "%";
  $("board-stat-sub").textContent = s.deviating + " of " + s.with_reference + " deviate";
  $("data-note").textContent = "Live cycle " + d.cycle + ".";
  $("cycle-stamp").textContent = d.seed_commit ? d.seed_commit.slice(0, 22) + "…" : "";
}

/* ---------- frontier ---------- */
function renderFrontier() {
  const el = $("frontier");
  const h = S.history;
  if (!h.length) { el.innerHTML = ""; return; }
  const now = h[h.length - 1].trust_gap_pct;
  const base = h[0].trust_gap_pct;
  const pos = (g) => (100 - g);           // lower gap -> further right (better)
  const nowX = pos(now), baseX = pos(base);
  el.innerHTML =
    '<div class="track"></div>' +
    '<div class="fill" style="width:' + nowX + '%"></div>' +
    '<div class="cap top" style="left:2%">100% · theatre</div>' +
    '<div class="cap top" style="left:98%">0% · verified</div>' +
    '<div class="tick" style="left:' + baseX + '%"></div>' +
    '<div class="cap bot" style="left:' + baseX + '%">baseline ' + base + '%</div>' +
    '<div class="tick now" style="left:' + nowX + '%"></div>' +
    '<div class="cap bot" style="left:' + nowX + '%">now ' + now + '%</div>';
}

/* ---------- chart ---------- */
function renderChart() {
  const svg = $("chart-svg");
  let h = S.history.slice();
  if (S.range > 0) h = h.slice(-S.range);
  const L = 54, R = 760, T = 20, B = 250;
  const x = (i, n) => (n <= 1 ? L : L + (i / (n - 1)) * (R - L));
  const y = (v) => B - (v / 100) * (B - T);
  const ideal = S.metric === "trust_gap_pct" ? 0 : 100;

  let g = "";
  [0, 25, 50, 75, 100].forEach((v) => {
    g += '<line class="grid" x1="' + L + '" y1="' + y(v) + '" x2="' + R + '" y2="' + y(v) + '"/>';
    g += '<text class="axis-lbl" x="' + (L - 10) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + v + "%</text>";
  });
  g += '<line class="goal" x1="' + L + '" y1="' + y(ideal) + '" x2="' + R + '" y2="' + y(ideal) + '"/>';

  if (h.length) {
    const n = h.length;
    const pts = h.map((d, i) => [x(i, n), y(d[S.metric])]);
    if (n === 1) { pts.push([R, pts[0][1]]); }
    const line = pts.map((p) => p[0] + "," + p[1]).join(" ");
    const area = L + "," + B + " " + line + " " + pts[pts.length - 1][0] + "," + B;
    g += '<polygon class="area" points="' + area + '"/>';
    g += '<polyline class="line" points="' + line + '"/>';
    h.forEach((d, i) => {
      const cls = i === n - 1 ? "pt pt-now" : "pt";
      g += '<circle class="' + cls + '" cx="' + x(i, n) + '" cy="' + y(d[S.metric]) + '" r="' + (i === n - 1 ? 4.5 : 3) + '"/>';
    });
    const fmt = (t) => (t || "").slice(5, 10);
    g += '<text class="axis-lbl" x="' + L + '" y="' + (B + 22) + '">cycle ' + h[0].cycle + " · " + fmt(h[0].generated_at) + "</text>";
    g += '<text class="axis-lbl" x="' + R + '" y="' + (B + 22) + '" text-anchor="end">cycle ' + h[n - 1].cycle + " · " + fmt(h[n - 1].generated_at) + "</text>";
  }
  svg.innerHTML = g;
}

/* ---------- leaderboard ---------- */
const VORDER = { fail: 0, unknown: 1, partial: 2, skipped: 3, pass: 4 };

function sortRows(rows) {
  const k = S.sort.key, dir = S.sort.dir;
  return rows.slice().sort((a, b) => {
    let av, bv;
    if (k === "name") { av = a.displayName.toLowerCase(); bv = b.displayName.toLowerCase(); }
    else if (k === "tags") { av = (a.tags || []).join(); bv = (b.tags || []).join(); }
    else if (k === "verdict") { av = VORDER[a.verdict] || 9; bv = VORDER[b.verdict] || 9; }
    else { av = a.score == null ? -1 : a.score; bv = b.score == null ? -1 : b.score; }
    if (av < bv) return -dir;
    if (av > bv) return dir;
    return 0;
  });
}

function renderBoard() {
  const d = S.latest;
  const tb = $("board-body");
  if (!d || !d.providers) { tb.innerHTML = ""; return; }
  const rows = sortRows(d.providers);
  tb.innerHTML = "";
  rows.forEach((p) => {
    const v = p.verdict || "unknown";
    const cls = ["pass", "fail", "partial", "skipped", "unknown"].indexOf(v) >= 0 ? v : "unknown";
    const label = v.charAt(0).toUpperCase() + v.slice(1);
    const detail = p.status === "skipped"
      ? "skipped: " + (p.reason || "")
      : (p.identity && p.identity.detail) || "";
    const tr = document.createElement("tr");
    tr.innerHTML =
      '<td><span class="prov">' + p.displayName + "<small>" + (p.attested_label || p.id) + "</small></span></td>" +
      '<td class="stack-cell"><span class="stack">' + (p.tags || []).join(" · ") + "</span></td>" +
      '<td class="r"><span class="score">' + (p.score == null ? "—" : p.score) + "</span></td>" +
      '<td class="r"><span class="vd ' + cls + '">' + label + "</span></td>" +
      '<td class="r"><span class="detail">' + detail + "</span></td>";
    tb.appendChild(tr);
  });
}

/* ---------- wiring ---------- */
function wireToggles() {
  $("metric-toggle").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    S.metric = b.dataset.metric;
    [...e.currentTarget.children].forEach((c) => c.classList.toggle("on", c === b));
    renderChart();
  });
  $("range-toggle").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    S.range = parseInt(b.dataset.range, 10);
    [...e.currentTarget.children].forEach((c) => c.classList.toggle("on", c === b));
    renderChart();
  });
  document.querySelectorAll("th[data-sort]").forEach((th) => {
    th.addEventListener("click", () => {
      const k = th.dataset.sort;
      S.sort.dir = S.sort.key === k ? -S.sort.dir : (k === "name" || k === "tags" ? 1 : -1);
      S.sort.key = k;
      renderBoard();
    });
  });
}

function wireModals() {
  document.querySelectorAll("[data-modal]").forEach((b) =>
    b.addEventListener("click", () => { $(b.dataset.modal).hidden = false; }));
  document.querySelectorAll("[data-close]").forEach((b) =>
    b.addEventListener("click", () => { b.closest(".overlay").hidden = true; }));
  document.querySelectorAll(".overlay").forEach((o) =>
    o.addEventListener("click", (e) => { if (e.target === o) o.hidden = true; }));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") document.querySelectorAll(".overlay").forEach((o) => (o.hidden = true));
  });
}

function wireForm() {
  const f = $("submit-form");
  if (!f) return;
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(f).entries());
    const msg = $("form-msg");
    try {
      const r = await fetch("/api/submit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((x) => x.json());
      msg.textContent = r.ok ? "Queued. We'll probe it next cycle." : (r.error || "error");
      if (r.ok) f.reset();
    } catch (err) {
      msg.textContent = "Server offline — run `python3 attest.py serve` to enable submissions.";
    }
  });
}

async function main() {
  const d = await load();
  S.latest = d.latest;
  S.history = d.history;
  renderHero();
  renderFrontier();
  renderChart();
  renderBoard();
  wireToggles();
  wireModals();
  wireForm();
}
main();
