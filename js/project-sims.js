/* ACCL project concept simulations.
   Each funded project (data/projects.json "id") can have an interactive, physics-based
   simulation that runs on its detail page. Add or edit sims in the SIMS registry below. */
(() => {
  "use strict";

  /* ================= Shared helpers ================= */
  const C = { bg: "#0b1a2e", panel: "#13263f", line: "rgba(94,170,240,.14)", blue: "#5eaaf0", amber: "#f5a524", red: "#eb503c", green: "#3ddc84", violet: "#a78bfa", text: "#e9eef5", muted: "#9fb0c4" };
  const MONO = "'IBM Plex Mono', ui-monospace, monospace", SANS = "'IBM Plex Sans', system-ui, sans-serif";
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

  class Buf { constructor(n) { this.n = n; this.a = []; } push(v) { this.a.push(v); if (this.a.length > this.n) this.a.shift(); } get last() { return this.a[this.a.length - 1]; } clear() { this.a = []; } }

  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function text(ctx, s, x, y, o = {}) {
    ctx.font = `${o.weight || 400} ${o.size || 12}px ${o.sans ? SANS : MONO}`;
    ctx.fillStyle = o.color || C.muted; ctx.textAlign = o.align || "left"; ctx.textBaseline = o.base || "alphabetic";
    ctx.fillText(s, x, y);
  }
  function panel(ctx, R, title) {
    ctx.fillStyle = C.panel; rr(ctx, R.x, R.y, R.w, R.h, 10); ctx.fill();
    if (title) text(ctx, title, R.x + 12, R.y + 18, { size: 11, color: C.muted });
  }
  /* Time-series plot. series: [{d:Buf|array, c, name, lw, dash}] */
  function plot(ctx, R, o) {
    panel(ctx, R, o.title);
    ctx.font = `400 10px ${MONO}`;
    const legW = o.series.filter(s => s.name).reduce((a, s) => a + ctx.measureText(s.name).width + 24, 0);
    ctx.font = `400 11px ${MONO}`;
    const wrap = o.title && ctx.measureText(o.title).width + legW + 36 > R.w;
    const pad = { l: 40, r: 12, t: wrap ? 40 : 28, b: 14 }, x0 = R.x + pad.l, y0 = R.y + pad.t, w = R.w - pad.l - pad.r, h = R.h - pad.t - pad.b;
    const ymin = o.ymin, ymax = o.ymax, n = o.n, Y = v => y0 + h - (clamp(v, ymin, ymax) - ymin) / (ymax - ymin) * h;
    ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    for (let k = 0; k <= 2; k++) {
      const v = ymin + (ymax - ymin) * k / 2, y = Y(v);
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + w, y); ctx.stroke();
      text(ctx, (o.fmt || (v => +v.toFixed(2)))(v), x0 - 6, y + 4, { size: 10, align: "right" });
    }
    if (o.thr != null) {
      ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = C.red; ctx.beginPath(); ctx.moveTo(x0, Y(o.thr)); ctx.lineTo(x0 + w, Y(o.thr)); ctx.stroke(); ctx.restore();
      if (o.thrLabel) text(ctx, o.thrLabel, x0 + w - 4, Y(o.thr) - 5, { size: 10, color: C.red, align: "right" });
    }
    ctx.save(); rr(ctx, x0, y0 - 2, w, h + 4, 2); ctx.clip();
    for (const s of o.series) {
      const d = s.d.a || s.d; if (d.length < 2) continue;
      ctx.strokeStyle = s.c; ctx.lineWidth = s.lw || 1.8; ctx.setLineDash(s.dash || []);
      ctx.beginPath();
      d.forEach((v, i) => { const x = x0 + (i + (n - d.length)) / (n - 1) * w, y = Y(v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.stroke();
    }
    ctx.restore(); ctx.setLineDash([]);
    // legend
    let lx = R.x + R.w - 12;
    for (const s of [...o.series].reverse()) {
      if (!s.name) continue;
      ctx.font = `400 10px ${MONO}`; const tw = ctx.measureText(s.name).width;
      const ly = wrap ? R.y + 32 : R.y + 18;
      lx -= tw; text(ctx, s.name, lx, ly, { size: 10, color: C.text });
      ctx.fillStyle = s.c; ctx.fillRect(lx - 14, ly - 5, 10, 3); lx -= 24;
    }
  }
  function layout(W, H, frac = 0.54) {
    const narrow = W < 640, g = 12;
    if (!narrow) return { narrow, viz: { x: g, y: g, w: W * frac - g * 1.5, h: H - 2 * g }, side: { x: W * frac + g / 2, y: g, w: W * (1 - frac) - g * 1.5, h: H - 2 * g } };
    return { narrow, viz: { x: g, y: g, w: W - 2 * g, h: H * 0.48 - g }, side: { x: g, y: H * 0.48 + g / 2, w: W - 2 * g, h: H * 0.52 - g * 1.5 } };
  }
  const rows = (R, n, g = 10) => Array.from({ length: n }, (_, i) => ({ x: R.x, y: R.y + i * (R.h + g) / n, w: R.w, h: (R.h + g) / n - g }));
  const cols = (R, n, g = 10) => Array.from({ length: n }, (_, i) => ({ x: R.x + i * (R.w + g) / n, y: R.y, w: (R.w + g) / n - g, h: R.h }));
  function chip(ctx, s, x, y, color) {
    ctx.font = `600 11px ${MONO}`; const w = ctx.measureText(s).width + 16;
    ctx.fillStyle = color + "26"; rr(ctx, x, y, w, 20, 10); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 1; rr(ctx, x, y, w, 20, 10); ctx.stroke();
    text(ctx, s, x + 8, y + 14, { size: 11, color, weight: 600 }); return w;
  }
  function heat(v) {
    const st = [[22, 48, 82], [94, 170, 240], [245, 165, 36], [235, 80, 60]], s = clamp(v, 0, 1) * (st.length - 1), i = Math.min(st.length - 2, Math.floor(s)), t = s - i;
    return `rgb(${st[i].map((a, k) => Math.round(a + (st[i + 1][k] - a) * t))})`;
  }

  /* ================= Simulations ================= */
  const SIMS = {};

  /* ---------- 1. Resource-aware intelligent control: periodic vs event-triggered ---------- */
  SIMS["resource-aware-cps"] = {
    title: "Periodic vs. event-triggered feedback",
    caption: "Two identical inverted pendulums receive the same random disturbance kicks. The left loop sends a measurement every 30 ms; the right loop transmits only when the state error exceeds a threshold. Both stay balanced, but the event-triggered loop uses a fraction of the network bandwidth.",
    init(s) {
      const sys = () => ({ x: [0.15, 0], xs: [0.15, 0], msgs: 0, ticks: new Buf(400), th: new Buf(300) });
      Object.assign(s, { t: 0, P: sys(), E: sys(), lastP: 0, kick: 1.2, flash: 0 });
    },
    step(s) {
      const dt = 0.002, K = [30, 8];
      for (let k = 0; k < 8; k++) {
        s.t += dt;
        if (s.t > s.kick) { const d = rnd(-2.2, 2.2); s.P.x[1] += d; s.E.x[1] += d; s.kick = s.t + rnd(1.4, 2.6); s.flash = 1; }
        if (s.t - s.lastP >= 0.03) { s.P.xs = s.P.x.slice(); s.P.msgs++; s.P.ticks.push(s.t); s.lastP = s.t; }
        const e = Math.hypot(s.E.x[0] - s.E.xs[0], s.E.x[1] - s.E.xs[1]);
        if (e > 0.3 * Math.hypot(s.E.x[0], s.E.x[1]) + 0.015) { s.E.xs = s.E.x.slice(); s.E.msgs++; s.E.ticks.push(s.t); }
        for (const S of [s.P, s.E]) {
          const u = -(K[0] * S.xs[0] + K[1] * S.xs[1]);
          S.x = [S.x[0] + dt * S.x[1], S.x[1] + dt * (9.8 * Math.sin(S.x[0]) + u)];
        }
      }
      s.P.th.push(s.P.x[0]); s.E.th.push(s.E.x[0]); s.flash *= 0.9;
    },
    draw(ctx, s, W, H) {
      const L = layout(W, H, 0.56), halves = cols(L.viz, 2);
      [[s.P, "Periodic (30 ms)", C.blue], [s.E, "Event-triggered", C.amber]].forEach(([S, name, col], i) => {
        const R = halves[i]; panel(ctx, R, name);
        const px = R.x + R.w / 2, py = R.y + R.h * 0.66, len = Math.min(R.h * 0.42, R.w * 0.6);
        ctx.fillStyle = "rgba(255,255,255,.08)"; ctx.fillRect(R.x + 14, py + 8, R.w - 28, 3);
        ctx.fillStyle = C.text; rr(ctx, px - 22, py - 6, 44, 14, 4); ctx.fill();
        const tx = px + Math.sin(S.x[0]) * len, ty = py - Math.cos(S.x[0]) * len;
        ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(tx, ty); ctx.stroke();
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(tx, ty, 9, 0, 7); ctx.fill();
        if (s.flash > 0.05) { ctx.strokeStyle = `rgba(235,80,60,${s.flash})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(tx, ty, 16 + 12 * (1 - s.flash), 0, 7); ctx.stroke(); }
        // transmission timeline (last 3 s)
        const ty0 = R.y + R.h - 34, tx0 = R.x + 12, tw = R.w - 24;
        ctx.fillStyle = "rgba(255,255,255,.05)"; ctx.fillRect(tx0, ty0, tw, 18);
        ctx.strokeStyle = col; ctx.lineWidth = 1.2;
        for (const t of S.ticks.a) { const x = tx0 + tw - (s.t - t) / 3 * tw; if (x > tx0) { ctx.beginPath(); ctx.moveTo(x, ty0 + 2); ctx.lineTo(x, ty0 + 16); ctx.stroke(); } }
        text(ctx, "transmissions (last 3 s)", tx0, ty0 - 6, { size: 10 });
        text(ctx, `${S.msgs} messages`, R.x + 12, R.y + 36, { size: 12, color: col, weight: 600 });
      });
      const [r1, r2] = rows(L.side, 2);
      plot(ctx, r1, { title: "Pendulum angle (rad)", n: 300, ymin: -0.4, ymax: 0.4, series: [{ d: s.P.th, c: C.blue, name: "periodic" }, { d: s.E.th, c: C.amber, name: "event", dash: [5, 3] }] });
      panel(ctx, r2, "Network usage");
      const max = Math.max(s.P.msgs, s.E.msgs, 1), bw = r2.w - 140;
      [[s.P.msgs, C.blue, "periodic"], [s.E.msgs, C.amber, "event-triggered"]].forEach(([m, c, n], i) => {
        const y = r2.y + 38 + i * 34;
        text(ctx, n, r2.x + 12, y + 13, { size: 11, color: C.text });
        ctx.fillStyle = c; rr(ctx, r2.x + 128, y, Math.max(4, bw * m / max), 18, 4); ctx.fill();
      });
      const save = s.P.msgs ? Math.round(100 * (1 - s.E.msgs / s.P.msgs)) : 0;
      text(ctx, `${save}% fewer transmissions`, r2.x + 12, r2.y + r2.h - 14, { size: 13, color: C.green, weight: 600 });
    }
  };

  /* ---------- 2. Vulnerability of learning-based controllers: stealthy reward poisoning ---------- */
  SIMS["cps-vulnerability"] = {
    title: "Stealthy reward poisoning and data-enabled detection",
    caption: "Two learning agents estimate where the reward is maximized from noisy reward feedback. The amber agent's rewards are slowly biased by an attacker, a drift too small to notice step-to-step, so it learns the attacker's target. A detector compares learning against occasional trusted samples; when its CUSUM statistic crosses the threshold, the poisoned channel is isolated and the agent recovers.",
    controls: [{ key: "attack", on: "Attack: on", off: "Attack: off", init: true }, { key: "detect", on: "Detector: on", off: "Detector: off", init: true }],
    init(s) {
      const G = [0.28, 0.62], A = [0.74, 0.3];
      const ag = c => ({ p: [G[0] + rnd(-0.03, 0.03), G[1] + rnd(-0.03, 0.03)], g: G.slice(), c, trail: new Buf(140) });
      Object.assign(s, { K: 0.15, Gn: 0.1, t: 0, G, A, clean: ag(C.blue), pois: ag(C.amber), S: 0, alarm: false, isolated: false, dC: new Buf(360), dP: new Buf(360), cus: new Buf(360), ref: G.slice() });
    },
    step(s) {
      const dt = 1 / 60; s.t += dt;
      const ramp = s.attack && !s.isolated ? clamp((s.t - 2) / 8, 0, 1) : 0;
      if (s.t % 0.5 < dt) s.ref = [s.G[0] + gauss() * 0.02, s.G[1] + gauss() * 0.02];   // trusted (secure) reward sample
      for (const a of [s.clean, s.pois]) {
        let z = [s.G[0] + gauss() * 0.05, s.G[1] + gauss() * 0.05];                         // what the reward data says the optimum is
        if (a === s.pois) z = [z[0] + ramp * (s.A[0] - s.G[0]), z[1] + ramp * (s.A[1] - s.G[1])];
        a.g = [lerp(a.g[0], z[0], 0.025), lerp(a.g[1], z[1], 0.025)];
        a.p = [a.p[0] + 0.035 * (a.g[0] - a.p[0]) + gauss() * 0.003, a.p[1] + 0.035 * (a.g[1] - a.p[1]) + gauss() * 0.003];
        a.trail.push(a.p.slice());
      }
      const dev = Math.hypot(s.pois.g[0] - s.ref[0], s.pois.g[1] - s.ref[1]);
      s.S = Math.max(0, s.S + (dev - s.K) * s.Gn);
      if (s.detect && !s.alarm && s.S > 1.2) { s.alarm = true; s.isolated = true; s.alarmT = s.t; }
      s.dC.push(Math.hypot(s.clean.g[0] - s.G[0], s.clean.g[1] - s.G[1])); s.dP.push(Math.hypot(s.pois.g[0] - s.G[0], s.pois.g[1] - s.G[1])); s.cus.push(s.S);
      if (s.isolated) s.S *= 0.985;
      if (s.t > 18) this.init(s);
    },
    draw(ctx, s, W, H) {
      const L = layout(W, H), R = L.viz; panel(ctx, R, "Learning arena");
      const X = v => R.x + 16 + v * (R.w - 32), Y = v => R.y + 30 + v * (R.h - 46);
      ctx.strokeStyle = C.line; ctx.lineWidth = 1;
      for (let i = 0; i <= 10; i++) { ctx.beginPath(); ctx.moveTo(X(i / 10), Y(0)); ctx.lineTo(X(i / 10), Y(1)); ctx.stroke(); ctx.beginPath(); ctx.moveTo(X(0), Y(i / 10)); ctx.lineTo(X(1), Y(i / 10)); ctx.stroke(); }
      // reward landscape rings
      for (let r = 1; r <= 4; r++) { ctx.strokeStyle = `rgba(61,220,132,${0.25 - r * 0.045})`; ctx.beginPath(); ctx.arc(X(s.G[0]), Y(s.G[1]), r * 26, 0, 7); ctx.stroke(); }
      ctx.fillStyle = C.green; ctx.beginPath(); ctx.arc(X(s.G[0]), Y(s.G[1]), 6, 0, 7); ctx.fill();
      text(ctx, "true optimum", X(s.G[0]) + 10, Y(s.G[1]) + 18, { size: 11, color: C.green });
      ctx.strokeStyle = C.red; ctx.lineWidth = 2.5; const ax = X(s.A[0]), ay = Y(s.A[1]);
      ctx.beginPath(); ctx.moveTo(ax - 7, ay - 7); ctx.lineTo(ax + 7, ay + 7); ctx.moveTo(ax + 7, ay - 7); ctx.lineTo(ax - 7, ay + 7); ctx.stroke();
      text(ctx, "attacker's target", ax > R.x + R.w - 140 ? ax - 10 : ax + 10, ay - 10, { size: 11, color: C.red, align: ax > R.x + R.w - 140 ? "right" : "left" });
      for (const a of [s.clean, s.pois]) {
        ctx.strokeStyle = a.c + "88"; ctx.lineWidth = 1.5; ctx.beginPath();
        a.trail.a.forEach((p, i) => i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1]))); ctx.stroke();
        ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = a.c; ctx.beginPath(); ctx.moveTo(X(a.p[0]), Y(a.p[1])); ctx.lineTo(X(a.g[0]), Y(a.g[1])); ctx.stroke(); ctx.restore();
        ctx.strokeStyle = a.c; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(a.g[0]), Y(a.g[1]), 5, 0, 7); ctx.stroke();
        ctx.fillStyle = a.c; ctx.beginPath(); ctx.arc(X(a.p[0]), Y(a.p[1]), 8, 0, 7); ctx.fill();
      }
      let cx = R.x + 12; const cy = R.y + R.h - 30;
      cx += chip(ctx, "clean agent", cx, cy, C.blue) + 6;
      cx += chip(ctx, "poisoned agent", cx, cy, C.amber) + 6;
      if (s.alarm) chip(ctx, "ALARM · channel isolated", cx, cy, C.red);
      else if (s.attack && s.t > 2) chip(ctx, "attack in progress", cx, cy, C.red);
      const [r1, r2] = rows(L.side, 2);
      plot(ctx, r1, { title: "Learned optimum: error", n: 360, ymin: 0, ymax: 0.6, series: [{ d: s.dC, c: C.blue, name: "clean" }, { d: s.dP, c: C.amber, name: "poisoned" }] });
      plot(ctx, r2, { title: "Detector statistic (CUSUM)", n: 360, ymin: 0, ymax: 2, thr: 1.2, thrLabel: "alarm", series: [{ d: s.cus, c: C.violet, name: s.detect ? "on" : "off" }] });
    }
  };

  /* ---------- 3. Spatio-temporal battery pack modeling with online learning ---------- */
  SIMS["battery-pack-modeling"] = {
    title: "Pack-level thermal model with online learning",
    caption: "Top: the true temperature field of a 10×4 cell pack, coupled through a graph Laplacian, with one cell generating extra heat. Bottom: the estimator measures only the sensored cells (●) and learns the unknown cell-to-cell thermal coupling α online, using a sensitivity-based gradient. Watch α̂ converge to the true value and the estimation error fall.",
    init(s) {
      const c = 10, r = 4, n = c * r;
      Object.assign(s, { mu: 0.002, c, r, n, T: new Array(n).fill(0), Th: new Array(n).fill(0), xi: new Array(n).fill(0), a: 0.09, ah: 0.015, t: 0, ft: 0, f: Math.floor(rnd(0, n)), sens: Array.from({ length: n }, (_, i) => (i % c) % 3 === 0 && Math.floor(i / c) % 2 === 0 || i === n - 1), aH: new Buf(900), eH: new Buf(900) });
    },
    lap(s, T, i) { const c = s.c, r = s.r, x = i % c, y = Math.floor(i / c); let l = 0; if (x > 0) l += T[i - 1] - T[i]; if (x < c - 1) l += T[i + 1] - T[i]; if (y > 0) l += T[i - c] - T[i]; if (y < r - 1) l += T[i + c] - T[i]; return l; },
    step(s) {
      for (let k = 0; k < 3; k++) {
        s.ft++; if (s.ft > 420) { s.ft = 0; s.f = Math.floor(rnd(0, s.n)); }
        const q = s.ft < 300 ? 0.16 * Math.min(1, s.ft / 30) : 0;
        const dT = s.T.map((v, i) => s.a * this.lap(s, s.T, i) - 0.01 * v + (i === s.f ? q : 0));
        // estimator: Laplacian model with sensor correction; ξ = ∂T̂/∂α is the sensitivity state
        const Lh = s.Th.map((v, i) => this.lap(s, s.Th, i)), Lx = s.xi.map((v, i) => this.lap(s, s.xi, i));
        const dTh = s.Th.map((v, i) => s.ah * Lh[i] - 0.01 * v + (s.sens[i] ? 0.25 * (s.T[i] - v) : 0) + (i === s.f ? q : 0));
        const dxi = s.xi.map((v, i) => s.ah * Lx[i] + Lh[i] - 0.01 * v - (s.sens[i] ? 0.25 * v : 0));
        s.T = s.T.map((v, i) => Math.max(0, v + dT[i])); s.Th = s.Th.map((v, i) => Math.max(0, v + dTh[i])); s.xi = s.xi.map((v, i) => v + dxi[i]);
        // output-error gradient (normalized) on the sensored cells
        let num = 0, den = 1e-3;
        for (let i = 0; i < s.n; i++) if (s.sens[i]) { num += (s.T[i] - s.Th[i]) * s.xi[i]; den += s.xi[i] * s.xi[i]; }
        s.ah = clamp(s.ah + s.mu * num / den, 0.005, 0.2);
      }
      s.aH.push(s.ah);
      s.eH.push(Math.sqrt(s.T.reduce((a, v, i) => a + (v - s.Th[i]) ** 2, 0) / s.n));
    },
    draw(ctx, s, W, H) {
      const L = layout(W, H), [g1, g2] = rows(L.viz, 2);
      [[s.T, g1, "True pack temperatures"], [s.Th, g2, "Estimated (Laplacian model + online learning)"]].forEach(([T, R, name], gi) => {
        panel(ctx, R, name);
        const cw = Math.min((R.w - 24) / s.c, (R.h - 34) / s.r), x0 = R.x + (R.w - cw * s.c) / 2 + cw / 2, y0 = R.y + 26 + cw / 2;
        for (let i = 0; i < s.n; i++) {
          const x = x0 + (i % s.c) * cw, y = y0 + Math.floor(i / s.c) * cw, v = T[i] / 1.6;
          if (v > 0.3) { ctx.fillStyle = heat(v).replace("rgb", "rgba").replace(")", `,${0.2 * v})`); ctx.beginPath(); ctx.arc(x, y, cw * 0.75, 0, 7); ctx.fill(); }
          ctx.fillStyle = heat(v); ctx.beginPath(); ctx.arc(x, y, cw * 0.42, 0, 7); ctx.fill();
          if (gi === 1 && s.sens[i]) { ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill(); }
          if (gi === 0 && i === s.f && s.ft < 300) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, cw * 0.5, 0, 7); ctx.stroke(); }
        }
      });
      const [r1, r2] = rows(L.side, 2), aT = new Array(s.aH.a.length).fill(s.a);
      plot(ctx, r1, { title: "Thermal coupling α (learned online)", n: 900, ymin: 0, ymax: 0.12, fmt: v => v.toFixed(2), series: [{ d: aT, c: C.green, name: "true α", dash: [5, 4] }, { d: s.aH, c: C.amber, name: "estimate α̂" }] });
      plot(ctx, r2, { title: "Field estimation error (RMS)", n: 900, ymin: 0, ymax: 1.2, series: [{ d: s.eH, c: C.blue, name: "RMSE" }] });
    }
  };

  /* ---------- 4. NSF REU: Smart Personal Protective Equipment ---------- */
  SIMS["reu-smapp"] = {
    title: "Smart PPE: wireless sensing on a first responder",
    caption: "A responder moves near a fire and a radiation source. Sensors on the suit (heart, heat flux, radiation) stream data wirelessly to the base station, and the system raises alerts when exposure crosses safe limits.",
    init(s) { Object.assign(s, { t: 0, x: 0.75, ecg: new Buf(360), flux: new Buf(360), rad: new Buf(360), packets: [], phase: 0 }); },
    step(s) {
      const dt = 1 / 60; s.t += dt;
      s.x = 0.55 + 0.33 * Math.sin(s.t * 0.35);                                 // walk back and forth
      const fireD = s.x, heatF = clamp(1.25 - fireD * 1.4, 0, 1) * (0.85 + 0.15 * Math.sin(s.t * 7)), radD = Math.abs(s.x - 0.62);
      const hr = 80 + 55 * heatF; s.phase += dt * hr / 60;
      const p = s.phase % 1, g = (m, w, a) => a * Math.exp(-((p - m) ** 2) / (2 * w * w));
      s.ecg.push(g(0.2, 0.025, 0.12) - g(0.36, 0.008, 0.15) + g(0.4, 0.012, 1) - g(0.44, 0.01, 0.25) + g(0.68, 0.05, 0.3) + gauss() * 0.015);
      s.flux.push(heatF * 22 + gauss() * 0.4); s.hr = hr; s.heatF = heatF;
      const lam = radD < 0.08 ? 0.9 : 0.05; s.rad.push(Math.random() < lam ? rnd(0.6, 1) : rnd(0, 0.08));
      if (Math.random() < 0.12) s.packets.push({ k: Math.floor(rnd(0, 3)), t: 0 });
      s.packets.forEach(q => q.t += dt * 1.2); s.packets = s.packets.filter(q => q.t < 1);
    },
    draw(ctx, s, W, H) {
      const L = layout(W, H), R = L.viz; panel(ctx, R, "Scene");
      const gy = R.y + R.h - 34;
      // fire
      const fx = R.x + 30;
      for (let i = 0; i < 26; i++) { const h = 30 + 50 * Math.abs(Math.sin(s.t * 3 + i)), x = fx + (i % 6) * 6 - 10; ctx.fillStyle = `rgba(${235},${80 + i * 5},${40},${0.12})`; ctx.beginPath(); ctx.ellipse(x, gy - h / 2, 10, h / 2, 0, 0, 7); ctx.fill(); }
      const glow = ctx.createRadialGradient(fx, gy - 30, 5, fx, gy - 30, R.w * 0.45); glow.addColorStop(0, "rgba(245,120,36,.35)"); glow.addColorStop(1, "rgba(245,120,36,0)"); ctx.fillStyle = glow; ctx.fillRect(R.x, R.y, R.w, R.h);
      text(ctx, "fire", fx - 10, gy + 18, { size: 11, color: C.amber });
      // radiation source
      const rx = R.x + 16 + 0.62 * (R.w - 32);
      ctx.fillStyle = "rgba(167,139,250,.15)"; ctx.beginPath(); ctx.arc(rx, gy, 40, Math.PI, 0); ctx.fill();
      text(ctx, "☢ source", rx - 26, gy + 18, { size: 11, color: C.violet });
      ctx.strokeStyle = "rgba(255,255,255,.15)"; ctx.beginPath(); ctx.moveTo(R.x + 10, gy); ctx.lineTo(R.x + R.w - 10, gy); ctx.stroke();
      // responder
      const px = R.x + 16 + s.x * (R.w - 32), sc = Math.min(1.1, R.h / 260), step = Math.sin(s.t * 6);
      ctx.save(); ctx.translate(px, gy); ctx.scale(sc, sc);
      ctx.strokeStyle = C.text; ctx.lineWidth = 7; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(0, -60); ctx.lineTo(-10 * step, 0); ctx.moveTo(0, -60); ctx.lineTo(10 * step, 0); ctx.stroke();
      ctx.fillStyle = "#c9d6e6"; rr(ctx, -16, -118, 32, 62, 10); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-14, -108); ctx.lineTo(-24, -76 + 6 * step); ctx.moveTo(14, -108); ctx.lineTo(24, -76 - 6 * step); ctx.stroke();
      ctx.fillStyle = C.amber; ctx.beginPath(); ctx.arc(0, -132, 13, Math.PI, 0); ctx.fill(); ctx.fillRect(-17, -133, 34, 4);
      ctx.fillStyle = "#e7d3c0"; ctx.beginPath(); ctx.arc(0, -126, 9, 0, Math.PI); ctx.fill();
      const sensors = [[0, -100, C.red], [12, -84, C.amber], [0, -140, C.violet]];
      sensors.forEach(([x, y, c], i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill(); ctx.strokeStyle = c; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, 7 + 4 * ((s.t * 2 + i / 3) % 1), 0, 7); ctx.stroke(); });
      ctx.restore();
      // base station + packets
      const bx = R.x + R.w - 34, by = R.y + 46;
      ctx.strokeStyle = C.text; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx, by + 30); ctx.lineTo(bx, by); ctx.stroke();
      for (let k = 1; k <= 2; k++) { ctx.beginPath(); ctx.arc(bx, by, 6 * k, -2.4, -0.7); ctx.stroke(); }
      text(ctx, "base", bx - 14, by + 44, { size: 10 });
      s.packets.forEach(q => {
        const [sx, sy, c] = [[px, gy - 100 * sc, C.red], [px + 12 * sc, gy - 84 * sc, C.amber], [px, gy - 140 * sc, C.violet]][q.k];
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(lerp(sx, bx, q.t), lerp(sy, by, q.t) - Math.sin(q.t * Math.PI) * 30, 3, 0, 7); ctx.fill();
      });
      if (s.heatF > 0.65) chip(ctx, "HEAT FLUX ALERT", R.x + 12, R.y + 28, C.red);
      const [r1, r2, r3] = rows(L.side, 3, 8);
      plot(ctx, r1, { title: `Heart (ECG) · ${Math.round(s.hr)} bpm`, n: 360, ymin: -0.4, ymax: 1.1, fmt: () => "", series: [{ d: s.ecg, c: C.red, lw: 1.5 }] });
      plot(ctx, r2, { title: "Heat flux (kW/m²)", n: 360, ymin: 0, ymax: 24, thr: 15, thrLabel: "limit", fmt: v => v.toFixed(0), series: [{ d: s.flux, c: C.amber }] });
      plot(ctx, r3, { title: "Radiation counts", n: 360, ymin: 0, ymax: 1, fmt: () => "", series: [{ d: s.rad, c: C.violet, lw: 1.2 }] });
    }
  };

  /* ---------- 5. Networked autonomous heterogeneous agents: beyond consensus ---------- */
  SIMS["naha-autonomy"] = {
    title: "Resilient formation with aperiodic communication",
    caption: "Eight heterogeneous agents (drones ▲, surface vessels ●, underwater ■) form a ring by exchanging states only when needed; links flash at each transmission. One agent is compromised and starts broadcasting false positions. Neighbors cross-check broadcasts against their own range sensing, isolate it, and the rest of the team still converges.",
    controls: [{ key: "attack", on: "Compromised agent: on", off: "Compromised agent: off", init: true }],
    init(s) {
      const N = 8;
      s.N = N; s.t = 0; s.msgs = 0;
      s.ag = Array.from({ length: N }, (_, i) => { const x = [rnd(0.15, 0.85), rnd(0.15, 0.85)]; return { x, xh: x.slice(), type: i % 3, bad: false, off: [0.24 * Math.cos(i / N * 6.283), 0.24 * Math.sin(i / N * 6.283)] }; });
      s.E = new Set(); const add = (i, j) => s.E.add(i < j ? `${i}-${j}` : `${j}-${i}`);
      for (let i = 0; i < N; i++) { add(i, (i + 1) % N); add(i, (i + 3) % N); }
      s.flash = {}; s.err = new Buf(400); s.rate = new Buf(400); s.win = [];
    },
    step(s) {
      const dt = 1 / 60; s.t += dt; const A = s.ag, k = 0.9;
      if (s.attack && s.t > 5) A[0].bad = true;
      const edges = [...s.E].map(e => e.split("-").map(Number));
      const u = A.map(() => [0, 0]);
      for (const [i, j] of edges) {
        for (const [a, b] of [[i, j], [j, i]]) {
          u[a][0] += -k * ((A[a].x[0] - A[a].off[0]) - (A[b].xh[0] - A[b].off[0]));
          u[a][1] += -k * ((A[a].x[1] - A[a].off[1]) - (A[b].xh[1] - A[b].off[1]));
        }
      }
      A.forEach((a, i) => {
        if (a.bad) { a.x = [a.x[0] + 0.02 * Math.cos(s.t), a.x[1] + 0.0], a.x = [clamp(a.x[0], 0.05, 0.95), a.x[1]]; }
        else a.x = [clamp(a.x[0] + dt * u[i][0], 0.03, 0.97), clamp(a.x[1] + dt * u[i][1], 0.03, 0.97)];
        if (a.bad) { const b = Math.min(0.35, (s.t - 5) * 0.08); a.xh = [a.x[0] + b, a.x[1] - b * 0.6]; if (s.t - (a.lt || 0) > 0.15) { a.lt = s.t; this.tx(s, i); } }
        else if (Math.hypot(a.x[0] - a.xh[0], a.x[1] - a.xh[1]) > 0.012) { a.xh = a.x.slice(); this.tx(s, i); }
      });
      // neighbours cross-check broadcasts with range sensing
      for (const e of [...s.E]) { const [i, j] = e.split("-").map(Number); for (const b of [i, j]) if (Math.hypot(A[b].xh[0] - A[b].x[0], A[b].xh[1] - A[b].x[1]) > 0.08) { s.E.delete(e); A[b].iso = true; } }
      Object.keys(s.flash).forEach(k2 => { s.flash[k2] -= dt * 3; if (s.flash[k2] <= 0) delete s.flash[k2]; });
      const good = A.filter(a => !a.bad), c = [0, 0]; good.forEach(a => { c[0] += (a.x[0] - a.off[0]) / good.length; c[1] += (a.x[1] - a.off[1]) / good.length; });
      s.err.push(good.reduce((m, a) => m + Math.hypot(a.x[0] - a.off[0] - c[0], a.x[1] - a.off[1] - c[1]), 0) / good.length);
      s.win = s.win.filter(t => s.t - t < 1); s.rate.push(s.win.length);
      if (s.t > 16) this.init(s);
    },
    tx(s, i) { s.msgs++; s.win.push(s.t); for (const e of s.E) { const [a, b] = e.split("-").map(Number); if (a === i || b === i) s.flash[e] = 1; } },
    draw(ctx, s, W, H) {
      const L = layout(W, H), R = L.viz; panel(ctx, R, "Operating area");
      ctx.strokeStyle = "rgba(94,170,240,.08)"; ctx.lineWidth = 1;
      for (let i = 0; i < 9; i++) { const y = R.y + 30 + i * (R.h - 40) / 9; ctx.beginPath(); for (let x = R.x + 10; x < R.x + R.w - 10; x += 8) ctx.lineTo(x, y + 3 * Math.sin(x * 0.05 + s.t * 2 + i)); ctx.stroke(); }
      const X = v => R.x + 14 + v * (R.w - 28), Y = v => R.y + 28 + v * (R.h - 42);
      for (const e of s.E) {
        const [i, j] = e.split("-").map(Number), f = s.flash[e] || 0, a = s.ag[i].xh, b = s.ag[j].xh;
        ctx.strokeStyle = f > 0 ? `rgba(245,165,36,${0.25 + 0.75 * f})` : "rgba(94,170,240,.25)"; ctx.lineWidth = 1 + 2 * f;
        ctx.beginPath(); ctx.moveTo(X(s.ag[i].x[0]), Y(s.ag[i].x[1])); ctx.lineTo(X(s.ag[j].x[0]), Y(s.ag[j].x[1])); ctx.stroke();
      }
      s.ag.forEach(a => {
        const x = X(a.x[0]), y = Y(a.x[1]), c = a.bad ? C.red : [C.blue, C.green, C.violet][a.type];
        if (a.bad) { ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = C.red; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(X(a.xh[0]), Y(a.xh[1])); ctx.stroke(); ctx.restore(); ctx.strokeStyle = C.red; ctx.beginPath(); ctx.arc(X(a.xh[0]), Y(a.xh[1]), 7, 0, 7); ctx.stroke(); text(ctx, "false report", X(a.xh[0]) + 10, Y(a.xh[1]) + 4, { size: 10, color: C.red }); }
        ctx.fillStyle = c;
        if (a.type === 0) { ctx.beginPath(); ctx.moveTo(x, y - 9); ctx.lineTo(x + 8, y + 6); ctx.lineTo(x - 8, y + 6); ctx.closePath(); ctx.fill(); }
        else if (a.type === 1) { ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill(); }
        else ctx.fillRect(x - 6, y - 6, 12, 12);
        if (a.iso) { ctx.strokeStyle = C.red; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 14, 0, 7); ctx.stroke(); }
      });
      if (s.ag[0].iso) chip(ctx, "compromised agent isolated", R.x + 12, R.y + R.h - 30, C.red);
      else if (s.ag[0].bad) chip(ctx, "false data injected", R.x + 12, R.y + R.h - 30, C.amber);
      const [r1, r2] = rows(L.side, 2);
      plot(ctx, r1, { title: "Formation error (healthy agents)", n: 400, ymin: 0, ymax: 0.3, series: [{ d: s.err, c: C.green, name: "error" }] });
      plot(ctx, r2, { title: "Transmissions per second", n: 400, ymin: 0, ymax: 180, fmt: v => v.toFixed(0), series: [{ d: new Array(s.rate.a.length).fill(s.N * 20), c: C.blue, name: "periodic 20 Hz", dash: [5, 4] }, { d: s.rate, c: C.amber, name: "event-based" }] });
    }
  };

  /* ---------- 6. AI-enabled robotic inspection ---------- */
  SIMS["robotic-inspection"] = {
    title: "Autonomous inspection with safe path planning",
    caption: "A mobile robot plans collision-free paths (A* over a map inflated by a safety margin) through an energy facility, sweeping its camera across tanks and pipe racks. Defects that enter the field of view are detected and localized while coverage and clearance are tracked.",
    init(s) {
      const gw = 36, gh = 20, occ = new Array(gw * gh).fill(0), set = (x, y) => { if (x >= 0 && y >= 0 && x < gw && y < gh) occ[y * gw + x] = 1; };
      const tanks = [[7, 6, 3], [7, 14, 3], [27, 10, 4]];
      tanks.forEach(([cx, cy, r]) => { for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) set(x, y); });
      for (let x = 14; x <= 20; x++) { set(x, 5); set(x, 14); }  // pipe racks
      for (let y = 8; y <= 11; y++) set(17, y);
      const inf = occ.map((v, i) => { if (v) return 2; const x = i % gw, y = Math.floor(i / gw); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (occ[(y + dy) * gw + x + dx] && x + dx >= 0 && x + dx < gw) return 1; return 0; });
      const edge = []; occ.forEach((v, i) => { if (!v) return; const x = i % gw, y = Math.floor(i / gw); if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !occ[(y + dy) * gw + x + dx])) edge.push([x, y]); });
      const defects = Array.from({ length: 7 }, () => { const e = edge[Math.floor(rnd(0, edge.length))]; return { x: e[0] + 0.5, y: e[1] + 0.5, found: 0, cls: ["crack", "corrosion", "leak"][Math.floor(rnd(0, 3))], conf: rnd(0.86, 0.98) }; });
      Object.assign(s, { gw, gh, occ, inf, defects, seen: new Array(gw * gh).fill(0), pos: [2.5, 2.5], hd: 0, wps: [[12, 2], [12, 10], [3, 10], [3, 18], [12, 18], [22, 17], [33, 17], [33, 3], [22, 3], [21, 10], [2, 2]], wi: 0, path: [], cov: new Buf(500), clr: new Buf(500), t: 0 });
      this.plan(s);
    },
    plan(s) {
      const { gw, gh, inf } = s, start = [Math.floor(s.pos[0]), Math.floor(s.pos[1])], goal = s.wps[s.wi], key = (x, y) => y * gw + x;
      const open = [[0, start]], g = new Map([[key(...start), 0]]), from = new Map();
      while (open.length) {
        open.sort((a, b) => a[0] - b[0]); const [, cur] = open.shift();
        if (cur[0] === goal[0] && cur[1] === goal[1]) break;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
          const nx = cur[0] + dx, ny = cur[1] + dy; if (nx < 0 || ny < 0 || nx >= gw || ny >= gh || inf[key(nx, ny)]) continue;
          if (dx && dy && (inf[key(cur[0] + dx, cur[1])] || inf[key(cur[0], cur[1] + dy)])) continue;
          const ng = g.get(key(...cur)) + Math.hypot(dx, dy);
          if (ng < (g.get(key(nx, ny)) ?? 1e9)) { g.set(key(nx, ny), ng); from.set(key(nx, ny), cur); open.push([ng + Math.hypot(goal[0] - nx, goal[1] - ny), [nx, ny]]); }
        }
      }
      const p = []; let c = goal; while (c && !(c[0] === start[0] && c[1] === start[1])) { p.unshift([c[0] + 0.5, c[1] + 0.5]); c = from.get(key(...c)); }
      s.path = p.length ? p : [[goal[0] + 0.5, goal[1] + 0.5]];
    },
    step(s) {
      s.t += 1 / 60;
      if (!s.path.length) { s.wi = (s.wi + 1) % s.wps.length; if (s.wi === 0) { this.init(s); return; } this.plan(s); }
      const tgt = s.path[0], dx = tgt[0] - s.pos[0], dy = tgt[1] - s.pos[1], d = Math.hypot(dx, dy);
      const want = Math.atan2(dy, dx); let dh = want - s.hd; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); s.hd += clamp(dh, -0.12, 0.12);
      const v = 0.075 * (Math.abs(dh) < 0.6 ? 1 : 0.3);
      if (d < 0.12) s.path.shift(); else { s.pos[0] += Math.cos(s.hd) * v; s.pos[1] += Math.sin(s.hd) * v; }
      const scan = s.hd + 0.6 * Math.sin(s.t * 1.6);
      s.scan = scan;
      for (let y = 0; y < s.gh; y++) for (let x = 0; x < s.gw; x++) { const ddx = x + 0.5 - s.pos[0], ddy = y + 0.5 - s.pos[1], r = Math.hypot(ddx, ddy); if (r < 5.5) { let a = Math.atan2(ddy, ddx) - scan; a = Math.atan2(Math.sin(a), Math.cos(a)); if (Math.abs(a) < 0.5) s.seen[y * s.gw + x] = 1; } }
      for (const df of s.defects) { const ddx = df.x - s.pos[0], ddy = df.y - s.pos[1]; let a = Math.atan2(ddy, ddx) - scan; a = Math.atan2(Math.sin(a), Math.cos(a)); if (Math.hypot(ddx, ddy) < 5.5 && Math.abs(a) < 0.5) df.found = Math.min(1, df.found + 0.04); }
      const free = s.occ.filter(v => !v).length; s.cov.push(100 * s.seen.filter((v, i) => v && !s.occ[i]).length / free);
      let md = 9; for (let i = 0; i < s.occ.length; i++) if (s.occ[i]) md = Math.min(md, Math.hypot(i % s.gw + 0.5 - s.pos[0], Math.floor(i / s.gw) + 0.5 - s.pos[1]) - 0.5);
      s.clr.push(md);
    },
    draw(ctx, s, W, H) {
      const L = layout(W, H, 0.6), R = L.viz; panel(ctx, R, "Facility map");
      const cs = Math.min((R.w - 20) / s.gw, (R.h - 34) / s.gh), ox = R.x + (R.w - cs * s.gw) / 2, oy = R.y + 26, X = v => ox + v * cs, Y = v => oy + v * cs;
      for (let i = 0; i < s.occ.length; i++) {
        const x = i % s.gw, y = Math.floor(i / s.gw);
        ctx.fillStyle = s.occ[i] ? "#2c4a73" : s.inf[i] ? "rgba(235,80,60,.12)" : s.seen[i] ? "rgba(61,220,132,.10)" : "rgba(255,255,255,.02)";
        ctx.fillRect(X(x) + 0.5, Y(y) + 0.5, cs - 1, cs - 1);
      }
      // camera cone
      ctx.fillStyle = "rgba(245,165,36,.16)"; ctx.beginPath(); ctx.moveTo(X(s.pos[0]), Y(s.pos[1])); ctx.arc(X(s.pos[0]), Y(s.pos[1]), 5.5 * cs, s.scan - 0.5, s.scan + 0.5); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = "rgba(94,170,240,.8)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X(s.pos[0]), Y(s.pos[1])); s.path.forEach(p => ctx.lineTo(X(p[0]), Y(p[1]))); ctx.stroke(); ctx.restore();
      s.wps.forEach((w, i) => { ctx.strokeStyle = i === s.wi ? C.amber : "rgba(255,255,255,.25)"; ctx.lineWidth = 1.5; ctx.strokeRect(X(w[0] + 0.2), Y(w[1] + 0.2), cs * 0.6, cs * 0.6); });
      for (const df of s.defects) {
        if (!df.found) continue; const a = df.found, x = X(df.x), y = Y(df.y);
        ctx.strokeStyle = `rgba(235,80,60,${a})`; ctx.lineWidth = 2; ctx.strokeRect(x - cs * 0.9, y - cs * 0.9, cs * 1.8, cs * 1.8);
        if (a > 0.6) text(ctx, `${df.cls} ${df.conf.toFixed(2)}`, x + cs, y - cs, { size: 10, color: "#ffb4a8" });
      }
      ctx.save(); ctx.translate(X(s.pos[0]), Y(s.pos[1])); ctx.rotate(s.hd); ctx.fillStyle = C.amber; rr(ctx, -cs * 0.7, -cs * 0.5, cs * 1.4, cs, 3); ctx.fill(); ctx.fillStyle = C.bg; ctx.fillRect(cs * 0.3, -cs * 0.2, cs * 0.3, cs * 0.4); ctx.restore();
      const found = s.defects.filter(d => d.found > 0.6).length;
      chip(ctx, `defects found ${found}/${s.defects.length}`, R.x + 12, R.y + R.h - 26, C.red);
      const [r1, r2] = rows(L.side, 2);
      plot(ctx, r1, { title: "Inspection coverage (%)", n: 500, ymin: 0, ymax: 100, fmt: v => v.toFixed(0), series: [{ d: s.cov, c: C.green, name: "coverage" }] });
      plot(ctx, r2, { title: "Clearance to obstacles (cells)", n: 500, ymin: 0, ymax: 4, thr: 0.5, thrLabel: "safety margin", series: [{ d: s.clr, c: C.blue, name: "min distance" }] });
    }
  };

  /* ---------- 7. Meta & multimodal learning for smart borescope inspection ---------- */
  SIMS["smart-borescope"] = {
    title: "Few-shot defect recognition in a borescope feed",
    caption: "The borescope travels through a narrow cavity. Each new defect is embedded by the network and classified by its distance to class prototypes built from only a handful of labeled examples (few-shot), while unlabeled samples (grey) refine the embedding space.",
    init(s) {
      Object.assign(s, { t: 0, z: 0, defects: [], next: 0.6, log: [], cloud: Array.from({ length: 60 }, () => { const k = Math.floor(rnd(0, 3)); return { k, p: [this.P[k][0] + gauss() * 0.09, this.P[k][1] + gauss() * 0.09] }; }), q: null });
    },
    P: [[0.25, 0.3], [0.75, 0.32], [0.5, 0.78]], N: ["crack", "corrosion", "pitting"], Cc: [C.red, C.amber, C.violet],
    step(s) {
      const dt = 1 / 60; s.t += dt; s.z += dt * 1.2;
      if (s.t > s.next) { s.defects.push({ d: 9, a: rnd(0, 6.28), k: Math.floor(rnd(0, 3)), shown: false }); s.next = s.t + rnd(1.4, 2.4); }
      s.defects.forEach(d => { d.d -= dt * 1.6; if (d.d < 2.6 && !d.shown) { d.shown = true; d.conf = rnd(0.88, 0.99); s.q = { k: d.k, p: [0.5, 0.5], t: 0 }; s.log.unshift(`${this.N[d.k]} · ${d.conf.toFixed(2)}`); s.log = s.log.slice(0, 4); } });
      s.defects = s.defects.filter(d => d.d > 0.7);
      if (s.q) { s.q.t = Math.min(1, s.q.t + dt * 1.2); const P = this.P[s.q.k]; s.q.p = [lerp(0.5, P[0] + 0.05, s.q.t), lerp(0.5, P[1] + 0.05, s.q.t)]; }
    },
    draw(ctx, s, W, H) {
      const L = layout(W, H), R = L.viz; panel(ctx, R, "Borescope view");
      const cx = R.x + R.w / 2, cy = R.y + R.h / 2 + 8, Rm = Math.min(R.w, R.h) * 0.46;
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, Rm, 0, 7); ctx.clip();
      const bg = ctx.createRadialGradient(cx, cy, 2, cx, cy, Rm); bg.addColorStop(0, "#05080d"); bg.addColorStop(1, "#5a4a3a"); ctx.fillStyle = bg; ctx.fillRect(cx - Rm, cy - Rm, 2 * Rm, 2 * Rm);
      for (let i = 0; i < 14; i++) { const d = ((i - s.z) % 14 + 14) % 14 + 0.6, r = Rm * 0.9 / d; ctx.strokeStyle = `rgba(230,200,160,${Math.min(0.35, 0.6 / d)})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke(); }
      for (let k = 0; k < 16; k++) { const a = k / 16 * 6.283; ctx.strokeStyle = "rgba(230,200,160,.08)"; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * Rm, cy + Math.sin(a) * Rm); ctx.stroke(); }
      for (const d of s.defects) {
        const r = Rm * 0.9 / d.d, x = cx + Math.cos(d.a) * r * 0.85, y = cy + Math.sin(d.a) * r * 0.85, sz = 60 / d.d;
        ctx.strokeStyle = this.Cc[d.k]; ctx.fillStyle = this.Cc[d.k]; ctx.lineWidth = Math.max(1, 4 / d.d * 2);
        if (d.k === 0) { ctx.beginPath(); ctx.moveTo(x - sz, y - sz * 0.3); ctx.lineTo(x - sz * 0.3, y + sz * 0.2); ctx.lineTo(x + sz * 0.2, y - sz * 0.4); ctx.lineTo(x + sz, y + sz * 0.3); ctx.stroke(); }
        else if (d.k === 1) { ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.ellipse(x, y, sz, sz * 0.6, d.a, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
        else for (let j = 0; j < 5; j++) { ctx.beginPath(); ctx.arc(x + Math.cos(j * 2.1) * sz * 0.6, y + Math.sin(j * 1.7) * sz * 0.5, sz * 0.18, 0, 7); ctx.fill(); }
        if (d.shown) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.strokeRect(x - sz * 1.3, y - sz * 1.1, sz * 2.6, sz * 2.2); text(ctx, `${this.N[d.k]} ${d.conf.toFixed(2)}`, x - sz * 1.3, y - sz * 1.1 - 5, { size: 11, color: "#fff" }); }
      }
      ctx.restore();
      ctx.strokeStyle = "#2c4a73"; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, cy, Rm, 0, 7); ctx.stroke();
      const [r1, r2] = rows(L.side, 2, 10);
      panel(ctx, r1, "Embedding space · prototypes from 5 labeled shots");
      const X = v => r1.x + 20 + v * (r1.w - 40), Y = v => r1.y + 30 + v * (r1.h - 44);
      s.cloud.forEach(c => { ctx.fillStyle = "rgba(159,176,196,.35)"; ctx.beginPath(); ctx.arc(X(c.p[0]), Y(c.p[1]), 2.5, 0, 7); ctx.fill(); });
      this.P.forEach((p, k) => { ctx.strokeStyle = this.Cc[k]; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(p[0]), Y(p[1]), 18, 0, 7); ctx.stroke(); ctx.fillStyle = this.Cc[k]; ctx.beginPath(); ctx.arc(X(p[0]), Y(p[1]), 5, 0, 7); ctx.fill(); text(ctx, this.N[k], X(p[0]) + 22, Y(p[1]) + 4, { size: 11, color: this.Cc[k] }); });
      if (s.q) { ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = "#fff"; ctx.beginPath(); ctx.moveTo(X(s.q.p[0]), Y(s.q.p[1])); ctx.lineTo(X(this.P[s.q.k][0]), Y(this.P[s.q.k][1])); ctx.stroke(); ctx.restore(); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(X(s.q.p[0]), Y(s.q.p[1]), 5, 0, 7); ctx.fill(); text(ctx, "query", X(s.q.p[0]) + 8, Y(s.q.p[1]) - 6, { size: 10, color: "#fff" }); }
      panel(ctx, r2, "Detections");
      s.log.forEach((l, i) => text(ctx, l, r2.x + 14, r2.y + 40 + i * 20, { size: 12, color: i ? C.muted : C.text, weight: i ? 400 : 600 }));
    }
  };

  /* ---------- 8. Incipient internal fault detection for EV batteries ---------- */
  SIMS["ev-incipient-fault"] = {
    title: "Detecting an internal short before the surface heats up",
    caption: "A two-state thermal model of a cylindrical cell (core and surface) under a drive-cycle current. At t = 5 s an internal short starts generating heat in the core. An observer that uses only measured current and surface temperature estimates the hidden internal heat q̂ and core temperature; the alarm fires while the surface is still only slightly warm.",
    init(s) { Object.assign(s, { t: 0, Tc: 25, Ts: 25, Tch: 25, Tsh: 25, qh: 0, alarm: null, H: { Tc: new Buf(480), Ts: new Buf(480), Tch: new Buf(480), q: new Buf(480) } }); },
    step(s) {
      const sub = 10, dt = 0.25 / sub;                                        // 15 s of cell time per real second
      for (let k = 0; k < sub; k++) {
        s.t += dt / 15;
        const I = 30 * Math.sin(s.t * 2.2) + 15 * Math.sign(Math.sin(s.t * 0.9)), Qj = I * I * 0.0025;
        const qf = s.t > 5 ? Math.min(14, (s.t - 5) * 7) : 0;
        const Cc = 62, Cs = 4.5, Rc = 1.9, Ru = 3.1, Ta = 25;
        s.Tc += dt * ((Qj + qf - (s.Tc - s.Ts) / Rc) / Cc);
        s.Ts += dt * (((s.Tc - s.Ts) / Rc - (s.Ts - Ta) / Ru) / Cs);
        const Tsm = s.Ts + gauss() * 0.03, e = Tsm - s.Tsh;
        s.Tch += dt * ((Qj + s.qh - (s.Tch - s.Tsh) / Rc) / Cc + 0.2 * e);
        s.Tsh += dt * (((s.Tch - s.Tsh) / Rc - (s.Tsh - Ta) / Ru) / Cs + 1.6 * e);
        s.qh = Math.max(0, s.qh + dt * 3.2 * e);
        if (!s.alarm && s.qh > 4) s.alarm = { t: s.t, Ts: s.Ts };
      }
      s.H.Tc.push(s.Tc); s.H.Ts.push(s.Ts); s.H.Tch.push(s.Tch); s.H.q.push(s.qh);
      if (s.t > 16) this.init(s);
    },
    draw(ctx, s, W, H) {
      const L = layout(W, H, 0.42), R = L.viz; panel(ctx, R, `Cell cross-section · t = ${s.t.toFixed(1)} s`);
      const cx = R.x + R.w / 2, cy = R.y + R.h / 2 + 6, rad = Math.min(R.w, R.h) * 0.34;
      const n = (T) => clamp((T - 25) / 25, 0, 1);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad); g.addColorStop(0, heat(n(s.Tc))); g.addColorStop(0.75, heat(lerp(n(s.Tc), n(s.Ts), 0.7))); g.addColorStop(1, heat(n(s.Ts)));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rad, 0, 7); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.12)"; for (let k = 1; k < 6; k++) { ctx.beginPath(); ctx.arc(cx, cy, rad * k / 6, 0, 7); ctx.stroke(); }
      ctx.strokeStyle = "#c9d6e6"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, rad, 0, 7); ctx.stroke();
      if (s.t > 5) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cx - 8, cy - 14); ctx.lineTo(cx + 2, cy - 2); ctx.lineTo(cx - 4, cy + 2); ctx.lineTo(cx + 8, cy + 16); ctx.stroke(); text(ctx, "internal short", cx, cy + rad * 0.45, { size: 11, color: "#fff", align: "center" }); }
      text(ctx, `core ${s.Tc.toFixed(1)}°C`, cx, cy - rad - 10, { size: 11, color: C.text, align: "center" });
      text(ctx, `surface ${s.Ts.toFixed(1)}°C (measured)`, cx, cy + rad + 20, { size: 11, color: C.blue, align: "center" });
      if (s.alarm) chip(ctx, `ALARM at t=${s.alarm.t.toFixed(1)} s · surface only +${(s.alarm.Ts - 25).toFixed(1)}°C`, R.x + 10, R.y + R.h - 28, C.red);
      const [r1, r2] = rows(L.side, 2);
      plot(ctx, r1, { title: "Temperatures (°C)", n: 480, ymin: 24, ymax: 55, fmt: v => v.toFixed(0), series: [{ d: s.H.Tc, c: C.red, name: "core (true)" }, { d: s.H.Tch, c: C.amber, name: "core (est.)", dash: [5, 3] }, { d: s.H.Ts, c: C.blue, name: "surface" }] });
      plot(ctx, r2, { title: "Estimated internal heat q̂ (W)", n: 480, ymin: 0, ymax: 16, thr: 4, thrLabel: "fault threshold", fmt: v => v.toFixed(0), series: [{ d: s.H.q, c: C.violet, name: "q̂" }] });
    }
  };

  /* ---------- 9. Smart BMS: SOC & SOH estimation ---------- */
  SIMS["smart-bms"] = {
    title: "Simultaneous SOC and SOH estimation",
    caption: "An equivalent-circuit cell model runs a drive cycle. The observer starts with a wrong state of charge and the nominal (new-cell) capacity; using only measured voltage and current it converges to the true SOC, while coulomb-counting windows reveal the faded capacity, i.e. the state of health.",
    init(s) { Object.assign(s, { t: 0, soc: 0.92, soch: 0.55, V1: 0, V1h: 0, Q: 2.55, Qh: 3.0, mode: "drive", win: { q: 0, s0: 0.55 }, H: { soc: new Buf(480), soch: new Buf(480), V: new Buf(480), I: new Buf(480) }, sohH: new Buf(480) }); },
    ocv: z => 3.0 + 1.05 * z - 0.35 * Math.exp(-14 * z) + 0.12 * Math.tanh(8 * (z - 0.5)),
    step(s) {
      const sub = 20, dt = 4;                                                  // 80 s of battery time per frame
      for (let k = 0; k < sub; k++) {
        s.t += dt;
        let I;
        if (s.mode === "drive") { const p = s.t / 60; I = 1.6 + 1.2 * Math.sin(p * 1.7) + 0.8 * Math.sin(p * 4.3) + (Math.sin(p * 0.6) > 0.7 ? 2.2 : 0); if (s.soc < 0.12) s.mode = "charge"; }
        else { I = -2.4; if (s.soc > 0.93) s.mode = "drive"; }
        const R0 = 0.06, R1 = 0.03, C1 = 1500;
        s.soc -= I * dt / (3600 * s.Q); s.V1 += dt * (-s.V1 / (R1 * C1) + I / C1);
        const V = this.ocv(s.soc) - I * R0 - s.V1 + gauss() * 0.003;
        s.V1h += dt * (-s.V1h / (R1 * C1) + I / C1);
        const Vh = this.ocv(s.soch) - I * R0 - s.V1h;
        s.soch = clamp(s.soch - I * dt / (3600 * s.Qh) + 0.004 * (V - Vh), 0, 1);
        s.win.q += I * dt / 3600;
        if (Math.abs(s.win.s0 - s.soch) > 0.25) { const est = Math.abs(s.win.q / (s.win.s0 - s.soch)); if (est > 1.5 && est < 4) s.Qh = lerp(s.Qh, est, 0.5); s.win = { q: 0, s0: s.soch }; }
        s.I = I; s.V = V;
      }
      s.H.soc.push(s.soc); s.H.soch.push(s.soch); s.H.V.push(s.V); s.H.I.push(s.I); s.sohH.push(s.Qh / 3.0 * 100);
      if (s.H.soc.a.length >= 480 && s.mode === "drive" && s.soc > 0.9) this.init(s);
    },
    draw(ctx, s, W, H) {
      const L = layout(W, H, 0.36), R = L.viz; panel(ctx, R, s.mode === "drive" ? "Drive cycle (discharging)" : "Charging");
      const bw = Math.min(R.w * 0.42, 120), bh = Math.min(R.h - 110, 240), bx = R.x + R.w / 2 - bw / 2, by = R.y + 44;
      ctx.fillStyle = "#c9d6e6"; ctx.fillRect(bx + bw * 0.35, by - 10, bw * 0.3, 10);
      ctx.strokeStyle = "#c9d6e6"; ctx.lineWidth = 3; rr(ctx, bx, by, bw, bh, 10); ctx.stroke();
      const fh = (bh - 10) * s.soc; ctx.fillStyle = s.soc < 0.2 ? C.red : C.green; rr(ctx, bx + 5, by + bh - 5 - fh, bw - 10, fh, 6); ctx.fill();
      const ey = by + bh - 5 - (bh - 10) * s.soch; ctx.strokeStyle = C.amber; ctx.lineWidth = 3; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(bx - 12, ey); ctx.lineTo(bx + bw + 12, ey); ctx.stroke(); ctx.setLineDash([]);
      text(ctx, `SOC ${Math.round(s.soc * 100)}%`, bx + bw / 2, by + bh + 22, { size: 12, color: C.green, align: "center", weight: 600 });
      text(ctx, `estimate ${Math.round(s.soch * 100)}%`, bx + bw / 2, by + bh + 40, { size: 12, color: C.amber, align: "center" });
      text(ctx, `SOH ${Math.round(s.Qh / 3 * 100)}%  (true ${Math.round(s.Q / 3 * 100)}%)`, bx + bw / 2, by + bh + 58, { size: 12, color: C.violet, align: "center" });
      const [r1, r2, r3] = rows(L.side, 3, 8);
      plot(ctx, r1, { title: "State of charge", n: 480, ymin: 0, ymax: 1, series: [{ d: s.H.soc, c: C.green, name: "true" }, { d: s.H.soch, c: C.amber, name: "estimate", dash: [5, 3] }] });
      plot(ctx, r2, { title: "Measured terminal voltage (V)", n: 480, ymin: 2.8, ymax: 4.3, fmt: v => v.toFixed(1), series: [{ d: s.H.V, c: C.blue, name: "voltage", lw: 1.4 }] });
      plot(ctx, r3, { title: "State of health: capacity vs. new (%)", n: 480, ymin: 75, ymax: 105, fmt: v => v.toFixed(0), series: [{ d: new Array(s.sohH.a.length).fill(s.Q / 3 * 100), c: C.green, name: "true", dash: [5, 4] }, { d: s.sohH, c: C.violet, name: "estimate" }] });
    }
  };

  /* ---------- 10. Model-based fault detection for induction motors ---------- */
  SIMS["induction-motor-fdi"] = {
    title: "Model-based detection of a broken rotor bar",
    caption: "Three-phase stator currents drive a rotating magnetic field. At t = 6 s a rotor bar breaks, producing a twice-slip-frequency modulation in the currents. An online parameter estimator tracks the effective rotor resistance and flags the fault when it leaves its healthy band.",
    init(s) { Object.assign(s, { t: 0, ang: 0, rot: 0, Rh: 1.0, ia: new Buf(300), ib: new Buf(300), ic: new Buf(300), R: new Buf(480), fault: false, alarm: false }); },
    step(s) {
      const dt = 1 / 60; s.t += dt; s.fault = s.t > 6;
      const f = 1.2, slip = 0.05; s.ang += dt * f * 6.283; s.rot += dt * f * (1 - slip) * 6.283;
      for (let k = 0; k < 5; k++) {
        const tt = s.t + k * dt / 5, m = s.fault ? 0.22 * Math.sin(2 * slip * f * 6.283 * tt * 6) : 0, A = 1 + m, w = f * 6.283 * tt * 3;
        s.ia.push(A * Math.sin(w) + gauss() * 0.02); s.ib.push(A * Math.sin(w - 2.094) + gauss() * 0.02); s.ic.push(A * Math.sin(w + 2.094) + gauss() * 0.02);
      }
      const Rtrue = s.fault ? 1.0 + Math.min(0.32, (s.t - 6) * 0.12) : 1.0;
      s.Rh += 0.04 * (Rtrue - s.Rh) + gauss() * 0.004; s.R.push(s.Rh);
      if (s.Rh > 1.12) s.alarm = true;
      if (s.t > 16) this.init(s);
    },
    draw(ctx, s, W, H) {
      const L = layout(W, H, 0.44), R = L.viz; panel(ctx, R, "Motor cross-section");
      const cx = R.x + R.w / 2, cy = R.y + R.h / 2 + 8, Ro = Math.min(R.w, R.h) * 0.4;
      ctx.fillStyle = "#1c3352"; ctx.beginPath(); ctx.arc(cx, cy, Ro, 0, 7); ctx.fill();
      ctx.fillStyle = C.panel; ctx.beginPath(); ctx.arc(cx, cy, Ro * 0.74, 0, 7); ctx.fill();
      for (let k = 0; k < 6; k++) {
        const a = k / 6 * 6.283, ph = k % 3, cur = Math.sin(s.ang * 3 - ph * 2.094) * (k >= 3 ? -1 : 1);
        ctx.fillStyle = cur > 0 ? `rgba(245,165,36,${0.3 + 0.7 * cur})` : `rgba(94,170,240,${0.3 - 0.7 * cur})`;
        ctx.save(); ctx.translate(cx + Math.cos(a) * Ro * 0.86, cy + Math.sin(a) * Ro * 0.86); ctx.rotate(a); rr(ctx, -9, -16, 18, 32, 4); ctx.fill(); ctx.restore();
        text(ctx, ["A", "B", "C"][ph] + (k >= 3 ? "'" : ""), cx + Math.cos(a) * Ro * 1.08, cy + Math.sin(a) * Ro * 1.08 + 4, { size: 11, align: "center", color: C.text });
      }
      const rr0 = Ro * 0.62; ctx.fillStyle = "#2c4a73"; ctx.beginPath(); ctx.arc(cx, cy, rr0, 0, 7); ctx.fill();
      for (let k = 0; k < 14; k++) {
        const a = s.rot + k / 14 * 6.283, broken = s.fault && k === 3;
        ctx.fillStyle = broken ? C.red : "#c9a46a"; ctx.save(); ctx.translate(cx + Math.cos(a) * rr0 * 0.82, cy + Math.sin(a) * rr0 * 0.82); ctx.rotate(a);
        if (broken) { ctx.fillRect(-7, -3, 5, 6); ctx.fillRect(2, -3, 5, 6); } else ctx.fillRect(-7, -3, 14, 6); ctx.restore();
      }
      ctx.fillStyle = "#c9d6e6"; ctx.beginPath(); ctx.arc(cx, cy, rr0 * 0.22, 0, 7); ctx.fill();
      const fa = s.ang; ctx.strokeStyle = C.green; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(fa) * rr0 * 0.95, cy + Math.sin(fa) * rr0 * 0.95); ctx.stroke();
      text(ctx, "field", cx + Math.cos(fa) * rr0, cy + Math.sin(fa) * rr0 - 6, { size: 10, color: C.green });
      if (s.alarm) chip(ctx, "FAULT: broken rotor bar", R.x + 10, R.y + R.h - 28, C.red); else if (s.fault) chip(ctx, "fault developing…", R.x + 10, R.y + R.h - 28, C.amber);
      const [r1, r2] = rows(L.side, 2);
      plot(ctx, r1, { title: "Stator currents (p.u.)", n: 300, ymin: -1.3, ymax: 1.3, fmt: v => v.toFixed(1), series: [{ d: s.ia, c: C.amber, name: "a", lw: 1.4 }, { d: s.ib, c: C.blue, name: "b", lw: 1.4 }, { d: s.ic, c: C.green, name: "c", lw: 1.4 }] });
      plot(ctx, r2, { title: "Estimated rotor resistance (p.u.)", n: 480, ymin: 0.9, ymax: 1.4, thr: 1.12, thrLabel: "healthy limit", series: [{ d: s.R, c: C.violet, name: "R̂r" }] });
    }
  };

  /* ---------- 11. Wireless heat flux sensor ---------- */
  SIMS["wireless-heat-flux"] = {
    title: "Wireless heat flux sensing for firefighters",
    caption: "A fire of varying intensity heats a sensor plate with four thermocouples. The IoT node computes heat flux from the temperature differences on board and sends compact readings over the cellular network once per second, so incident command sees ignition risk in real time, without water-cooled sensors or cabling.",
    init(s) { Object.assign(s, { t: 0, I: 0.6, q: 0, T: [25, 25, 25, 25], flux: new Buf(480), TH: [new Buf(480), new Buf(480), new Buf(480), new Buf(480)], pk: [], lastTx: 0, parts: [] }); },
    step(s) {
      const dt = 1 / 60; s.t += dt;
      s.I = 0.55 + 0.4 * Math.sin(s.t * 0.45) + 0.12 * Math.sin(s.t * 2.3);
      const inc = s.I * 32;                                             // incident flux kW/m²
      s.T = s.T.map((T, i) => { const depth = i / 3, Teq = 25 + inc * (11 - 7 * depth); return T + (Teq - T) * 0.02 * (1 - depth * 0.5); });
      const q = ((s.T[0] - s.T[3]) / 7) * 1.0 + gauss() * 0.2;
      s.q = Math.max(0, q); s.flux.push(s.q); s.T.forEach((T, i) => s.TH[i].push(T));
      if (s.t - s.lastTx > 1) { s.lastTx = s.t; s.pk.push({ t: 0, v: s.q }); }
      s.pk.forEach(p => p.t += dt * 0.9); s.pk = s.pk.filter(p => p.t < 1);
      for (let k = 0; k < 3; k++) s.parts.push({ x: rnd(-1, 1), y: 0, v: rnd(0.5, 1.2), life: 1 });
      s.parts.forEach(p => { p.y += p.v * dt * (0.6 + s.I); p.life -= dt * 1.1; p.x += gauss() * 0.01; }); s.parts = s.parts.filter(p => p.life > 0);
    },
    draw(ctx, s, W, H) {
      const L = layout(W, H), R = L.viz; panel(ctx, R, "Fire scene");
      const gy = R.y + R.h - 30, fx = R.x + R.w * 0.18, fw = R.w * 0.09;
      const glow = ctx.createRadialGradient(fx, gy - 40, 4, fx, gy - 40, R.w * 0.45); glow.addColorStop(0, `rgba(245,120,36,${0.25 + 0.3 * s.I})`); glow.addColorStop(1, "rgba(245,120,36,0)"); ctx.fillStyle = glow; ctx.fillRect(R.x, R.y, R.w, R.h);
      s.parts.forEach(p => { const x = fx + p.x * fw, y = gy - p.y * R.h * 0.55, r = 10 * p.life + 2; ctx.fillStyle = `rgba(${245},${Math.round(80 + 140 * p.life)},${40},${0.5 * p.life})`; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); });
      // sensor plate with thermocouples
      const px = R.x + R.w * 0.46, py = gy - 120, ph = 100;
      ctx.fillStyle = "#c9d6e6"; ctx.fillRect(px, py, 8, ph);
      for (let i = 0; i < 4; i++) { const x = px - 4 + i * 6, y = py + 14 + i * 22; ctx.fillStyle = heat((s.T[i] - 25) / 320); ctx.beginPath(); ctx.arc(px + 4, y, 7, 0, 7); ctx.fill(); text(ctx, `TC${i + 1} ${s.T[i].toFixed(0)}°C`, px + 16, y + 4, { size: 10, color: C.text }); }
      ctx.fillStyle = "#2c4a73"; rr(ctx, px - 2, py + ph + 2, 40, 22, 4); ctx.fill(); text(ctx, "MCU", px + 18, py + ph + 17, { size: 10, color: C.text, align: "center" });
      ctx.strokeStyle = C.text; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px + 34, py + ph + 2); ctx.lineTo(px + 34, py + ph - 20); ctx.stroke();
      // tower & phone
      const tx = R.x + R.w - 70, ty = R.y + 60;
      ctx.strokeStyle = C.muted; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tx - 14, ty + 70); ctx.lineTo(tx, ty); ctx.lineTo(tx + 14, ty + 70); ctx.moveTo(tx - 9, ty + 40); ctx.lineTo(tx + 9, ty + 40); ctx.stroke();
      text(ctx, "cell tower", tx, ty + 86, { size: 10, align: "center" });
      const ix = R.x + R.w - 34, iy = gy - 70; ctx.strokeStyle = C.text; rr(ctx, ix - 14, iy, 28, 48, 5); ctx.stroke();
      text(ctx, `${s.q.toFixed(0)}`, ix, iy + 24, { size: 11, color: s.q > 12.5 ? C.red : C.green, align: "center", weight: 600 }); text(ctx, "kW/m²", ix, iy + 38, { size: 8, align: "center" });
      text(ctx, "command", ix, iy + 62, { size: 10, align: "center" });
      s.pk.forEach(p => { const a = p.t < 0.5 ? p.t * 2 : (p.t - 0.5) * 2, [x0, y0, x1, y1] = p.t < 0.5 ? [px + 34, py + ph - 20, tx, ty] : [tx, ty, ix, iy]; ctx.fillStyle = C.amber; ctx.beginPath(); ctx.arc(lerp(x0, x1, a), lerp(y0, y1, a) - Math.sin(a * Math.PI) * 20, 3.5, 0, 7); ctx.fill(); });
      if (s.q > 12.5) chip(ctx, "IGNITION RISK", R.x + 12, R.y + 28, C.red);
      const [r1, r2] = rows(L.side, 2);
      plot(ctx, r1, { title: "Thermocouple temperatures (°C)", n: 480, ymin: 0, ymax: 400, fmt: v => v.toFixed(0), series: s.TH.map((d, i) => ({ d, c: heat(1 - i / 4), name: `TC${i + 1}`, lw: 1.4 })) });
      plot(ctx, r2, { title: "Heat flux (kW/m²) · 1 reading/s", n: 480, ymin: 0, ymax: 45, thr: 12.5, thrLabel: "ignition ≈12.5", fmt: v => v.toFixed(0), series: [{ d: s.flux, c: C.amber, name: "q″" }] });
    }
  };

  /* ================= Mount ================= */
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function mount(host, id) {
    const def = SIMS[id]; if (!def) return;
    host.innerHTML = `
      <div class="sim-head">
        <div><h3>${def.title}</h3><p>${def.caption}</p></div>
      </div>
      <div class="sim-canvas"><canvas></canvas></div>
      <div class="sim-ctrls">
        <button type="button" data-act="play">Pause</button>
        <button type="button" data-act="restart">Restart</button>
        ${(def.controls || []).map(c => `<button type="button" data-key="${c.key}" aria-pressed="${c.init}">${c.init ? c.on : c.off}</button>`).join("")}
        <span class="sim-badge">Live simulation · runs in your browser</span>
      </div>`;
    const cv = host.querySelector("canvas"), ctx = cv.getContext("2d");
    let W = 0, Hh = 0, s = {}, running = !reduce, visible = true, raf = 0;
    const flags = {}; (def.controls || []).forEach(c => (flags[c.key] = c.init));
    const reset = () => { s = Object.assign({}, flags); def.init(s); };
    function size() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      W = cv.clientWidth; Hh = W < 640 ? Math.round(W * 1.45) : Math.round(clamp(W * 0.48, 340, 470));
      cv.style.height = Hh + "px"; cv.width = W * dpr; cv.height = Hh * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function render() { if (W < 120) return; ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, Hh); def.draw(ctx, s, W, Hh); }
    function loop() { if (!running || !visible) return; def.step(s); render(); raf = requestAnimationFrame(loop); }
    host.querySelector(".sim-ctrls").addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.act === "play") { running = !running; b.textContent = running ? "Pause" : "Play"; if (running) loop(); }
      else if (b.dataset.act === "restart") { reset(); render(); if (running) { cancelAnimationFrame(raf); loop(); } }
      else if (b.dataset.key) {
        const c = def.controls.find(x => x.key === b.dataset.key); flags[c.key] = !flags[c.key]; s[c.key] = flags[c.key];
        b.setAttribute("aria-pressed", flags[c.key]); b.textContent = flags[c.key] ? c.on : c.off;
        reset(); render();
      }
    });
    new ResizeObserver(() => { size(); render(); }).observe(cv);
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible && running) { cancelAnimationFrame(raf); loop(); } }).observe(cv);
    size(); reset();
    if (reduce) { for (let k = 0; k < 420; k++) def.step(s); host.querySelector('[data-act="play"]').textContent = "Play"; }
    render(); if (running) loop();
  }

  window.ACCLSims = { has: id => !!SIMS[id], mount, ids: Object.keys(SIMS), _sims: SIMS };
})();
