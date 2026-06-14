"use strict";
// attest.fail frontend. Compiled to ../app.js by tsc (see tsconfig.json).
// Single-file script (no imports) so the output is a plain classic script.
const S = {
    latest: null,
    history: [],
    metric: "trust_gap_pct",
    range: 0,
    sort: { key: "score", dir: -1 },
};
let chartPts = [];
const byId = (id) => document.getElementById(id);
const setText = (id, txt) => { const n = document.getElementById(id); if (n)
    n.textContent = txt; };
async function load() {
    try {
        const [l, h] = await Promise.all([
            fetch("/api/latest").then((r) => r.json()),
            fetch("/api/history").then((r) => r.json()),
        ]);
        if (l && l.providers)
            return { latest: l, history: (h || []) };
        throw new Error("no live data");
    }
    catch (e) {
        const s = window.__ATTEST_SNAPSHOT__;
        if (s)
            return { latest: s.latest, history: s.history || [] };
        return { latest: null, history: [] };
    }
}
function fmtTime(iso) {
    return (iso || "").replace("T", " ").slice(5, 16);
}
/* ---------- hero ---------- */
function renderHero() {
    const d = S.latest;
    if (!d)
        return;
    const s = d.summary;
    setText("hero-gap", s.trust_gap_pct + "%");
    setText("hero-rest", " of audited providers (" + s.deviating + " of " + s.with_reference +
        " with a reference) serve a different model than they attest.");
    setText("board-sub", s.scored + " providers tested · " + s.skipped + " skipped (no key)");
    setText("board-stat", s.trust_gap_pct + "%");
    setText("board-stat-sub", s.deviating + " of " + s.with_reference + " deviate");
    setText("data-note", "Live cycle " + d.cycle + ".");
    setText("cycle-stamp", d.seed_commit ? d.seed_commit.slice(0, 24) + "…" : "");
}
/* ---------- frontier ---------- */
function renderFrontier() {
    const el = byId("frontier");
    const h = S.history;
    if (!h.length) {
        el.innerHTML = "";
        return;
    }
    const now = h[h.length - 1].trust_gap_pct;
    const base = h[0].trust_gap_pct;
    const pos = (g) => 100 - g; // lower gap -> further right (better)
    el.innerHTML =
        '<div class="track"></div>' +
            '<div class="fill" style="width:' + pos(now) + '%"></div>' +
            '<div class="cap top" style="left:3%">100% · theatre</div>' +
            '<div class="cap top" style="left:97%">0% · verified</div>' +
            '<div class="tick" style="left:' + pos(base) + '%"></div>' +
            '<div class="cap bot" style="left:' + pos(base) + '%">baseline ' + base + '%</div>' +
            '<div class="tick now" style="left:' + pos(now) + '%"></div>' +
            '<div class="cap bot strong" style="left:' + pos(now) + '%">now ' + now + '%</div>';
}
/* ---------- chart ---------- */
function renderChart() {
    const svg = byId("chart-svg");
    let h = S.history.slice();
    if (S.range > 0)
        h = h.slice(-S.range);
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
    chartPts = [];
    if (h.length) {
        const n = h.length;
        const pts = h.map((d, i) => [x(i, n), y(d[S.metric])]);
        if (n === 1)
            pts.push([R, pts[0][1]]);
        const line = pts.map((p) => p[0] + "," + p[1]).join(" ");
        g += '<polygon class="area" points="' + L + "," + B + " " + line + " " + pts[pts.length - 1][0] + "," + B + '"/>';
        g += '<polyline class="line" points="' + line + '"/>';
        h.forEach((d, i) => {
            const isNow = i === n - 1;
            g += '<circle class="pt' + (isNow ? " pt-now" : "") + '" cx="' + x(i, n) + '" cy="' + y(d[S.metric]) + '" r="' + (isNow ? 4.5 : 3) + '"/>';
            chartPts.push({ cx: x(i, n), cycle: d.cycle, val: d[S.metric] });
        });
        const fmt = (t) => (t || "").slice(5, 10);
        g += '<text class="axis-lbl" x="' + L + '" y="' + (B + 22) + '">cycle ' + h[0].cycle + " · " + fmt(h[0].generated_at) + "</text>";
        g += '<text class="axis-lbl" x="' + R + '" y="' + (B + 22) + '" text-anchor="end">cycle ' + h[n - 1].cycle + " · " + fmt(h[n - 1].generated_at) + "</text>";
    }
    svg.innerHTML = g;
}
function wireChartTooltip() {
    const svg = byId("chart-svg");
    const tip = byId("chart-tip");
    svg.addEventListener("mousemove", (e) => {
        if (!chartPts.length)
            return;
        const rect = svg.getBoundingClientRect();
        const vbx = ((e.clientX - rect.left) / rect.width) * 780;
        let best = chartPts[0];
        for (const p of chartPts)
            if (Math.abs(p.cx - vbx) < Math.abs(best.cx - vbx))
                best = p;
        const label = S.metric === "trust_gap_pct" ? "trust gap" : "pass rate";
        tip.textContent = "cycle " + best.cycle + " · " + label + " " + best.val + "%";
        tip.style.left = e.clientX + "px";
        tip.style.top = e.clientY + "px";
        tip.hidden = false;
    });
    svg.addEventListener("mouseleave", () => { tip.hidden = true; });
}
/* ---------- leaderboard ---------- */
const VORDER = { fail: 0, unknown: 1, partial: 2, skipped: 3, pass: 4 };
function sortRows(rows) {
    const k = S.sort.key, dir = S.sort.dir;
    const val = (r) => {
        var _a;
        if (k === "name")
            return r.displayName.toLowerCase();
        if (k === "verdict")
            return (_a = VORDER[r.verdict]) !== null && _a !== void 0 ? _a : 9;
        if (k === "delta")
            return r.delta == null ? -1e9 : r.delta;
        return r.score == null ? -1 : r.score;
    };
    return rows.slice().sort((a, b) => {
        const av = val(a), bv = val(b);
        if (av < bv)
            return -dir;
        if (av > bv)
            return dir;
        return 0;
    });
}
function deltaCell(d) {
    if (d == null)
        return '<span class="delta zero">—</span>';
    if (d === 0)
        return '<span class="delta zero">0</span>';
    const cls = d > 0 ? "up" : "down";
    const sign = d > 0 ? "▲ +" : "▼ ";
    return '<span class="delta ' + cls + '">' + sign + d + "</span>";
}
function scoreSub(p) {
    if (p.status === "skipped")
        return "no key";
    const id = p.identity;
    if (id && !id.no_reference && id.exact != null)
        return "exact " + id.exact + " · sim " + id.sim;
    if (p.attestation && p.attestation.present)
        return "attest " + p.attestation.score;
    return "no reference";
}
function renderBoard() {
    const d = S.latest;
    const tb = byId("board-body");
    if (!d || !d.providers) {
        tb.innerHTML = "";
        return;
    }
    const checked = fmtTime(d.generated_at);
    tb.innerHTML = "";
    sortRows(d.providers).forEach((p) => {
        const v = p.verdict || "unknown";
        const cls = ["pass", "fail", "partial", "skipped", "unknown"].indexOf(v) >= 0 ? v : "unknown";
        const label = v.charAt(0).toUpperCase() + v.slice(1);
        const tr = document.createElement("tr");
        tr.innerHTML =
            '<td><span class="prov">' + p.displayName + "<small>" + (p.tags || []).join(" · ") + "</small></span></td>" +
                '<td class="r"><span class="score">' + (p.score == null ? "—" : p.score) + '</span><small class="score-sub">' + scoreSub(p) + "</small></td>" +
                '<td class="r">' + deltaCell(p.delta) + "</td>" +
                '<td class="r"><span class="vd ' + cls + '">' + label + "</span></td>" +
                '<td class="r checked">' + checked + "</td>";
        tb.appendChild(tr);
    });
}
/* ---------- wiring ---------- */
function wireToggles() {
    byId("metric-toggle").addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (!b)
            return;
        S.metric = b.dataset.metric;
        Array.from(e.currentTarget.children).forEach((c) => c.classList.toggle("on", c === b));
        renderChart();
    });
    byId("range-toggle").addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (!b)
            return;
        S.range = parseInt(b.dataset.range || "0", 10);
        Array.from(e.currentTarget.children).forEach((c) => c.classList.toggle("on", c === b));
        renderChart();
    });
    document.querySelectorAll("th[data-sort]").forEach((th) => {
        th.addEventListener("click", () => {
            const k = th.dataset.sort;
            S.sort.dir = S.sort.key === k ? -S.sort.dir : (k === "name" ? 1 : -1);
            S.sort.key = k;
            document.querySelectorAll("th[data-sort]").forEach((o) => o.classList.toggle("sorted", o === th));
            renderBoard();
        });
    });
}
function wireModals() {
    document.querySelectorAll("[data-modal]").forEach((b) => b.addEventListener("click", () => { byId(b.dataset.modal).hidden = false; }));
    document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => { b.closest(".overlay").hidden = true; }));
    document.querySelectorAll(".overlay").forEach((o) => o.addEventListener("click", (e) => { if (e.target === o)
        o.hidden = true; }));
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape")
            document.querySelectorAll(".overlay").forEach((o) => (o.hidden = true));
    });
}
function wireForm() {
    const f = document.getElementById("submit-form");
    if (!f)
        return;
    f.addEventListener("submit", async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(f).entries());
        const msg = byId("form-msg");
        try {
            const r = await fetch("/api/submit", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            }).then((x) => x.json());
            msg.textContent = r.ok ? "Queued. We'll probe it next cycle." : (r.error || "error");
            if (r.ok)
                f.reset();
        }
        catch (err) {
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
    wireChartTooltip();
    wireModals();
    wireForm();
}
main();
