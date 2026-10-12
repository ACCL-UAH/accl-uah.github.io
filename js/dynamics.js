/* ACCL hero background: live simulations of dynamical systems tied to the lab's research.
   Every scene integrates its ODE in real time (RK4) and draws onto the #net canvas.
   Scenes rotate automatically; the caption dots let visitors pick one. */
(() => {
  "use strict";
  const canvas = document.getElementById("net");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const INK = [11, 26, 46];
  const SCENE_MS = 16000;

  let W = 0, H = 0, DPR = 1, cx = 0, cy = 0, S = 1;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const wide = W > 900;
    cx = wide ? W * 0.7 : W * 0.5;          // keep the art to the right of the headline on desktop
    cy = H * (wide ? 0.5 : 0.42);
    S = Math.min(wide ? W * 0.3 : W * 0.48, H * 0.44);
    clear(1);
  }
  const clear = a => { ctx.fillStyle = `rgba(${INK},${a})`; ctx.fillRect(0, 0, W, H); };
  const rnd = (a, b) => a + Math.random() * (b - a);

  // Generic RK4 step for f(state) -> derivative (arrays)
  function rk4(f, x, dt) {
    const k1 = f(x);
    const k2 = f(x.map((v, i) => v + dt / 2 * k1[i]));
    const k3 = f(x.map((v, i) => v + dt / 2 * k2[i]));
    const k4 = f(x.map((v, i) => v + dt * k3[i]));
    return x.map((v, i) => v + dt / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
  }
  // Blue → amber palette
  const mix = (t, a = 0.9) => {
    const c0 = [94, 170, 240], c1 = [245, 165, 36];
    return `rgba(${c0.map((v, i) => Math.round(v + (c1[i] - v) * t))},${a})`;
  };
  // 3D → 2D with slow rotation about the vertical axis plus a fixed tilt
  function project(p, ang, scale, ox = 0, oy = 0, oz = 0) {
    const x = p[0] - ox, y = p[1] - oy, z = p[2] - oz;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const X = x * ca - y * sa, Y = x * sa + y * ca;
    const tilt = 0.35, ct = Math.cos(tilt), st = Math.sin(tilt);
    const Z = z * ct - Y * st;
    const depth = Y * ct + z * st;
    return [cx + X * scale, cy - Z * scale, depth];
  }

  /* ---------- Scene 1: Lorenz attractor ---------- */
  const lorenz = {
    name: "Lorenz attractor",
    desc: "Deterministic chaos: six trajectories that start 10⁻³ apart quickly diverge.",
    link: { label: "Learning under uncertainty", href: "#research" },
    fade: 0.012,
    init() {
      this.t = 0;
      const base = [rnd(-1, 1), rnd(-1, 1), rnd(20, 26)];
      this.ps = Array.from({ length: 6 }, (_, i) => ({ x: base.map(v => v + i * 1e-3), prev: null, c: mix(i / 5, 1) }));
    },
    f: ([x, y, z]) => [10 * (y - x), x * (28 - z) - y, x * y - (8 / 3) * z],
    step() {
      this.t += 1;
      const ang = this.t * 0.0025, sc = S / 27;
      ctx.lineWidth = 1.7; ctx.lineCap = "round";
      for (const p of this.ps) {
        for (let k = 0; k < 3; k++) {
          p.x = rk4(this.f, p.x, 0.006);
          const q = project(p.x, ang, sc, 0, 0, 25);
          if (p.prev) { ctx.strokeStyle = p.c; ctx.beginPath(); ctx.moveTo(p.prev[0], p.prev[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); }
          p.prev = q;
        }
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(p.prev[0], p.prev[1], 1.8, 0, 7); ctx.fill();
      }
    }
  };

  /* ---------- Scene 2: Event-triggered control of a Van der Pol oscillator ---------- */
  const vdp = {
    name: "Event-triggered control",
    desc: "Van der Pol flow converges to its limit cycle; the amber trajectory is stabilized with feedback updated only at trigger events (●).",
    link: { label: "Resource-aware intelligent control", href: "detail.html?project=resource-aware-cps" },
    fade: 0.06,
    mu: 1.2,
    init() {
      this.ps = Array.from({ length: 420 }, () => this.spawn());
      this.resetCtrl();
    },
    spawn() { return { x: [rnd(-3.2, 3.2), rnd(-4, 4)], age: Math.floor(rnd(0, 140)) }; },
    resetCtrl() {
      const a = rnd(0, 6.28);
      this.c = { x: [3 * Math.cos(a), 3.6 * Math.sin(a)], xs: null, path: [], events: [], t: 0 };
      this.c.xs = this.c.x.slice(); this.c.events.push(this.c.x.slice());
    },
    f(x, u = 0) { return [x[1], this.mu * (1 - x[0] * x[0]) * x[1] - x[0] + u]; },
    map(x) { return [cx + x[0] * S / 3.6, cy - x[1] * S / 4.6]; },
    step() {
      // background flow field particles
      ctx.lineWidth = 1;
      for (const p of this.ps) {
        const a = this.map(p.x);
        p.x = rk4(x => this.f(x), p.x, 0.012);
        const b = this.map(p.x);
        ctx.strokeStyle = `rgba(94,170,240,${Math.min(0.5, p.age / 120)})`;
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        if (++p.age > 260) Object.assign(p, this.spawn(), { age: 0 });
      }
      // controlled trajectory: u = -mu(1-x1s^2)x2s - k1 x1s - k2 x2s held between events
      const c = this.c, k1 = 1.2, k2 = 1.6;
      for (let k = 0; k < 2; k++) {
        const u = -this.mu * (1 - c.xs[0] ** 2) * c.xs[1] + c.xs[0] - k1 * c.xs[0] - k2 * c.xs[1];
        c.x = rk4(x => this.f(x, u), c.x, 0.012);
        const e = Math.hypot(c.x[0] - c.xs[0], c.x[1] - c.xs[1]);
        if (e > 0.18 * Math.hypot(c.x[0], c.x[1]) + 0.01) { c.xs = c.x.slice(); c.events.push(c.x.slice()); }
        c.path.push(c.x.slice());
      }
      c.t++;
      ctx.strokeStyle = "rgba(245,165,36,.95)"; ctx.lineWidth = 2;
      ctx.beginPath(); c.path.forEach((p, i) => { const m = this.map(p); i ? ctx.lineTo(m[0], m[1]) : ctx.moveTo(m[0], m[1]); }); ctx.stroke();
      ctx.fillStyle = "#fff";
      for (const e of c.events) { const m = this.map(e); ctx.beginPath(); ctx.arc(m[0], m[1], 2.6, 0, 7); ctx.fill(); }
      const o = this.map([0, 0]); ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(o[0], o[1], 6, 0, 7); ctx.stroke();
      if (c.t > 420 || Math.hypot(c.x[0], c.x[1]) < 0.02) this.resetCtrl();
    }
  };

  /* ---------- Scene 3: Networked consensus (Kuramoto oscillators on a graph) ---------- */
  const kuramoto = {
    name: "Networked consensus",
    desc: "Kuramoto oscillators on a communication graph: as coupling grows, agents synchronize.",
    link: { label: "Autonomy beyond consensus", href: "detail.html?project=naha-autonomy" },
    fade: 1,
    init() {
      const N = 28;
      this.N = N; this.t = 0; this.K = 0;
      this.th = Array.from({ length: N }, () => rnd(0, 6.283));
      this.w = Array.from({ length: N }, () => rnd(-0.6, 0.6));
      this.pos = Array.from({ length: N }, (_, i) => { const a = i / N * 6.283 - 1.5708; return [Math.cos(a), Math.sin(a)]; });
      this.E = [];
      for (let i = 0; i < N; i++) { this.E.push([i, (i + 1) % N]); this.E.push([i, (i + 2) % N]); }
      for (let k = 0; k < 7; k++) { const i = Math.floor(rnd(0, N)), j = (i + Math.floor(rnd(6, N - 6))) % N; this.E.push([i, j]); }  // long-range links (small-world)
    },
    step() {
      this.t++; this.K = Math.min(2.2, this.t / 260);
      const dt = 0.04, d = new Array(this.N).fill(0);
      for (let i = 0; i < this.N; i++) d[i] = this.w[i];
      for (const [i, j] of this.E) { const s = Math.sin(this.th[j] - this.th[i]); d[i] += this.K * s; d[j] -= this.K * s; }
      for (let i = 0; i < this.N; i++) this.th[i] += dt * d[i];
      clear(1);
      const sc = S * 0.9, P = this.pos.map(p => [cx + p[0] * sc, cy + p[1] * sc]);
      // edges glow when neighbours agree
      for (const [i, j] of this.E) {
        const agree = (1 + Math.cos(this.th[i] - this.th[j])) / 2;
        ctx.strokeStyle = `rgba(94,170,240,${0.08 + 0.45 * agree ** 4})`; ctx.lineWidth = 1 + agree ** 6;
        ctx.beginPath(); ctx.moveTo(P[i][0], P[i][1]); ctx.lineTo(P[j][0], P[j][1]); ctx.stroke();
      }
      // nodes: colour = phase, little hand shows phase direction
      let R = [0, 0];
      for (let i = 0; i < this.N; i++) {
        const th = this.th[i], c = mix((1 + Math.sin(th)) / 2, 1);
        R[0] += Math.cos(th) / this.N; R[1] += Math.sin(th) / this.N;
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(P[i][0], P[i][1], 7, 0, 7); ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(P[i][0], P[i][1]); ctx.lineTo(P[i][0] + Math.cos(th) * 14, P[i][1] + Math.sin(th) * 14); ctx.stroke();
      }
      // order parameter gauge
      const r = Math.hypot(R[0], R[1]);
      ctx.strokeStyle = "rgba(255,255,255,.18)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, sc * 0.32, 0, 7); ctx.stroke();
      ctx.strokeStyle = "#f5a524"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + R[0] * sc * 0.32, cy + R[1] * sc * 0.32); ctx.stroke();
      ctx.fillStyle = "rgba(233,238,245,.75)"; ctx.font = "12px 'IBM Plex Mono', monospace"; ctx.textAlign = "center";
      ctx.fillText(`order parameter r = ${r.toFixed(2)}   coupling K = ${this.K.toFixed(2)}`, cx, cy + sc * 0.32 + 20);
      if (this.t > 900) this.init();
    }
  };

  /* ---------- Scene 4: Battery pack thermal Laplacian with an internal fault ---------- */
  const battery = {
    name: "Battery pack thermal dynamics",
    desc: "Graph-Laplacian heat flow across a Li-ion pack: an internal fault heats one cell and spreads to its neighbours.",
    link: { label: "Spatio-temporal battery pack modeling", href: "detail.html?project=battery-pack-modeling" },
    fade: 1,
    init() {
      this.cols = 12; this.rows = 6; this.n = this.cols * this.rows;
      this.T = new Array(this.n).fill(0).map(() => rnd(0, 0.06));
      this.t = 0; this.newFault();
      for (let k = 0; k < 40; k++) this.sim();   // start with the fault already developing
    },
    newFault() { this.fault = Math.floor(rnd(0, this.n)); this.ft = 0; },
    idx(r, c) { return r * this.cols + c; },
    sim() {
      const { rows, cols } = this, T = this.T, dT = new Array(this.n).fill(0);
      for (let k = 0; k < 3; k++) {
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          const i = this.idx(r, c); let lap = 0;
          if (r > 0) lap += T[this.idx(r - 1, c)] - T[i];
          if (r < rows - 1) lap += T[this.idx(r + 1, c)] - T[i];
          if (c > 0) lap += 1.4 * (T[this.idx(r, c - 1)] - T[i]);   // stronger coupling along the series string
          if (c < cols - 1) lap += 1.4 * (T[this.idx(r, c + 1)] - T[i]);
          const cool = (r === 0 || r === rows - 1 ? 0.012 : 0.006) * T[i];
          const q = i === this.fault && this.ft < 330 ? 0.2 * Math.min(1, this.ft / 40) : 0;   // fault: heat ramps up, then the cell vents
          dT[i] = 0.09 * lap - cool + q;
        }
        for (let i = 0; i < this.n; i++) T[i] = Math.max(0, T[i] + dT[i]);
        this.ft++;
      }
      if (this.ft > 450) this.newFault();
    },
    step() {
      const { rows, cols } = this, T = this.T;
      this.sim();
      clear(1);
      const pad = 6, cw = Math.min((S * 1.3) / cols, (S * 0.95) / rows), rad = cw / 2 - pad / 2;
      const x0 = cx - cols * cw / 2 + cw / 2, y0 = cy - rows * cw / 2 + cw / 2;
      ctx.strokeStyle = "rgba(94,170,240,.25)"; ctx.lineWidth = 1.5;
      ctx.strokeRect(x0 - cw / 2 - 6, y0 - cw / 2 - 6, cols * cw + 12, rows * cw + 12);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const i = this.idx(r, c), v = Math.min(1, T[i] / 1.4), x = x0 + c * cw, y = y0 + r * cw;
        const col = heat(v);
        if (v > 0.25) { ctx.fillStyle = col.replace(",1)", `,${0.18 * v})`); ctx.beginPath(); ctx.arc(x, y, rad * 1.8, 0, 7); ctx.fill(); }
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, rad, 0, 7); ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,.25)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, rad * 0.45, 0, 7); ctx.stroke();
      }
      const fx = x0 + (this.fault % cols) * cw, fy = y0 + Math.floor(this.fault / cols) * cw;
      if (this.ft < 330) { ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(fx, fy, rad + 4 + 2 * Math.sin(this.ft * 0.2), 0, 7); ctx.stroke(); }
      ctx.fillStyle = "rgba(233,238,245,.75)"; ctx.font = "12px 'IBM Plex Mono', monospace"; ctx.textAlign = "center";
      ctx.fillText("dT/dt = −α L T − β (T − T∞) + q_fault", cx, y0 - cw / 2 - 22);
    }
  };
  function heat(v) {
    const stops = [[22, 48, 82], [94, 170, 240], [245, 165, 36], [235, 80, 60]];
    const s = v * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(s)), t = s - i;
    return `rgba(${stops[i].map((a, k) => Math.round(a + (stops[i + 1][k] - a) * t))},1)`;
  }

  /* ---------- Scene 5: Aizawa attractor (particle cloud) ---------- */
  const aizawa = {
    name: "Aizawa attractor",
    desc: "Three hundred particles tracing a strange attractor: nonlinear dynamics in three dimensions.",
    link: { label: "Nonlinear systems research", href: "#publications" },
    fade: 0.07,
    init() { this.t = 0; this.ps = Array.from({ length: 320 }, () => ({ x: [rnd(-1, 1) * 0.3, rnd(-1, 1) * 0.3, rnd(-0.5, 1.5)] })); },
    f: ([x, y, z]) => {
      const a = 0.95, b = 0.7, c = 0.6, d = 3.5, e = 0.25, f = 0.1;
      return [(z - b) * x - d * y, d * x + (z - b) * y, c + a * z - z ** 3 / 3 - (x * x + y * y) * (1 + e * z) + f * z * x ** 3];
    },
    step() {
      this.t++;
      const ang = this.t * 0.003, sc = S / 1.7;
      for (const p of this.ps) {
        p.x = rk4(this.f, p.x, 0.01);
        const q = project(p.x, ang, sc, 0, 0, 0.6);
        ctx.fillStyle = mix(Math.min(1, Math.max(0, (p.x[2] + 0.6) / 2.4)), 0.85);
        ctx.fillRect(q[0], q[1], 1.6, 1.6);
      }
    }
  };

  const scenes = [lorenz, vdp, kuramoto, battery, aizawa];

  /* ---------- Caption + scene picker ---------- */
  const cap = document.getElementById("dyn-caption");
  let cur = 0, started = 0, running = true, raf = 0;
  function setScene(i, manual) {
    cur = (i + scenes.length) % scenes.length;
    const s = scenes[cur];
    s.init(); clear(1); started = performance.now();
    if (manual) started += 30000;                       // linger longer on a scene the visitor picked
    if (cap) {
      cap.querySelector(".dyn-name").textContent = s.name;
      cap.querySelector(".dyn-desc").textContent = s.desc;
      const a = cap.querySelector(".dyn-link"); a.textContent = `${s.link.label} →`; a.href = s.link.href;
      cap.querySelectorAll(".dyn-dots button").forEach((b, k) => b.setAttribute("aria-current", k === cur));
    }
    if (reduce) for (let k = 0; k < 500; k++) { if (s.fade < 1) clear(s.fade); s.step(); }
  }
  if (cap) {
    cap.querySelector(".dyn-dots").innerHTML = scenes.map((s, k) => `<button type="button" aria-label="Show ${s.name}" title="${s.name}"></button>`).join("");
    cap.querySelectorAll(".dyn-dots button").forEach((b, k) => b.addEventListener("click", () => setScene(k, true)));
  }

  function frame(now) {
    if (!running) return;
    const s = scenes[cur];
    if (s.fade < 1) clear(s.fade);
    s.step();
    if (now - started > SCENE_MS) setScene(cur + 1);
    raf = requestAnimationFrame(frame);
  }

  new IntersectionObserver(([e]) => {
    const vis = e.isIntersecting && !document.hidden;
    if (vis && !running && !reduce) { running = true; raf = requestAnimationFrame(frame); }
    if (!vis) { running = false; cancelAnimationFrame(raf); }
  }).observe(canvas);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { running = false; cancelAnimationFrame(raf); }
    else if (!reduce) { running = true; started = performance.now(); raf = requestAnimationFrame(frame); }
  });
  // Re-measure whenever the hero's size actually changes (fonts/data loading, rotation, window resize)
  let rt, lastW = 0, lastH = 0;
  new ResizeObserver(() => {
    if (Math.abs(canvas.clientWidth - lastW) < 2 && Math.abs(canvas.clientHeight - lastH) < 2) return;
    lastW = canvas.clientWidth; lastH = canvas.clientHeight;
    clearTimeout(rt); rt = setTimeout(() => { resize(); if (started) setScene(cur); }, 120);
  }).observe(canvas);

  resize();
  setScene(0);
  if (reduce) running = false; else raf = requestAnimationFrame(frame);
  window.ACCLDynamics = { setScene, scenes };
})();
