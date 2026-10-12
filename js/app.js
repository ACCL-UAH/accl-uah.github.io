/* ACCL site — all content comes from /data/*.json. Edit those files to update the site. */
(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s = "") => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const TYPE_LABEL = { book: "Book", chapter: "Book chapter", journal: "Journal", conference: "Conference", abstract: "Abstract" };
  const TAG_ORDER = ["All", "Funding", "Paper", "Talk", "People", "Service", "Media"];
  const AREA_PATTERNS = {
    control: /control|event-trigger|regulat|observer|sampling|game|attack|networked|identification|pseudospectral/i,
    ai: /learning|neural|reinforcement|meta|graph|deep|classification|autoencoder|evolutionary/i,
    energy: /battery|lithium|li-ion|soh|soc\b|impedance|bms|electrochemical/i
  };
  const ICONS = {
    control: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 12h4l3-7 4 14 3-7h4"/></svg>',
    ai: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="M8 7l3 9M16 7l-3 9M8.5 6h7"/></svg>',
    energy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="7" width="16" height="10" rx="2"/><path d="M21 10v4M11 9l-2 3h4l-2 3"/></svg>'
  };

  /* ---------- Data loading ---------- */
  async function loadData() {
    if (window.ACCL_DATA) return window.ACCL_DATA; // bundled preview
    const get = f => fetch(`data/${f}.json`, { cache: "no-cache" }).then(r => { if (!r.ok) throw new Error(f); return r.json(); });
    const [site, people, publications, news] = await Promise.all(["site", "people", "publications", "news"].map(get));
    return { site, people, publications, news };
  }

  /* ---------- Theme ---------- */
  function initTheme() {
    const root = document.documentElement;
    let saved = null;
    try { saved = localStorage.getItem("accl-theme"); } catch {}
    if (saved) root.dataset.theme = saved;
    $("#theme-toggle").addEventListener("click", () => {
      const isDark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
      root.dataset.theme = isDark ? "light" : "dark";
      try { localStorage.setItem("accl-theme", root.dataset.theme); } catch {}
    });
  }

  /* ---------- Nav ---------- */
  function initNav() {
    const nav = $("#nav"), links = $("#links"), btn = $("#menu-btn");
    addEventListener("scroll", () => nav.classList.toggle("scrolled", scrollY > 8), { passive: true });
    btn.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      btn.setAttribute("aria-expanded", open);
    });
    $$("a", links).forEach(a => a.addEventListener("click", () => { links.classList.remove("open"); btn.setAttribute("aria-expanded", false); }));

    const map = new Map($$("a", links).map(a => [a.getAttribute("href").slice(1), a]));
    const spy = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { map.forEach(a => a.classList.remove("active")); map.get(e.target.id)?.classList.add("active"); }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    map.forEach((_, id) => { const el = document.getElementById(id); if (el) spy.observe(el); });
  }

  /* ---------- Hero network animation ---------- */
  function initCanvas() {
    const c = $("#net"), ctx = c.getContext("2d");
    let W, H, nodes = [], pulses = [], dpr = Math.min(devicePixelRatio || 1, 2);
    const LINK = 150;

    function resize() {
      W = c.clientWidth; H = c.clientHeight;
      c.width = W * dpr; c.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(90, (W * H) / 14000));
      nodes = Array.from({ length: n }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25,
        r: Math.random() * 1.6 + 1, flash: 0
      }));
    }

    function edges() {
      const out = [];
      for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < LINK) out.push([a, b, d]);
      }
      return out;
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      const E = edges();
      for (const [a, b, d] of E) {
        ctx.strokeStyle = `rgba(94,170,240,${(1 - d / LINK) * .35})`;
        ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      // event-triggered pulses travel along edges
      if (!reduceMotion && E.length && Math.random() < .05 && pulses.length < 14) {
        const [a, b] = E[(Math.random() * E.length) | 0];
        pulses.push({ a, b, t: 0 });
      }
      pulses = pulses.filter(p => {
        p.t += .02;
        if (p.t >= 1) { p.b.flash = 1; return false; }
        const x = p.a.x + (p.b.x - p.a.x) * p.t, y = p.a.y + (p.b.y - p.a.y) * p.t;
        ctx.fillStyle = "rgba(245,165,36,.95)"; ctx.beginPath(); ctx.arc(x, y, 2.2, 0, 7); ctx.fill();
        return true;
      });
      for (const n of nodes) {
        if (n.flash > 0) {
          ctx.fillStyle = `rgba(245,165,36,${n.flash * .35})`; ctx.beginPath(); ctx.arc(n.x, n.y, 4 + 10 * (1 - n.flash), 0, 7); ctx.fill();
          n.flash -= .03;
        }
        ctx.fillStyle = n.flash > 0 ? "#f5a524" : "rgba(200,220,245,.8)";
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, 7); ctx.fill();
        if (!reduceMotion) {
          n.x += n.vx; n.y += n.vy;
          if (n.x < 0 || n.x > W) n.vx *= -1;
          if (n.y < 0 || n.y > H) n.vy *= -1;
        }
      }
    }

    let running = true;
    new IntersectionObserver(([e]) => { running = e.isIntersecting; if (running && !reduceMotion) loop(); }).observe(c);
    function loop() { if (!running) return; draw(); requestAnimationFrame(loop); }
    addEventListener("resize", () => { resize(); draw(); });
    resize(); draw(); if (!reduceMotion) loop();
  }

  /* ---------- Hero + about ---------- */
  function renderHero({ site, people, publications }) {
    const { lab } = site;
    $("#hero-eyebrow").textContent = `${lab.short} · ${lab.university}`;
    $("#hero-tagline").textContent = lab.tagline;
    if (lab.announcement) {
      $("#announce").hidden = false;
      $("#announce-text").textContent = lab.announcement.text;
      $("#announce-link").href = lab.announcement.link;
    }
    const peer = publications.filter(p => ["journal", "conference", "book", "chapter"].includes(p.type)).length;
    const journals = publications.filter(p => p.type === "journal").length;
    const current = people.filter(p => p.group === "current").length;
    const since = Math.min(...publications.map(p => p.year));
    const stats = [[peer, "peer-reviewed works"], [journals, "journal articles"], [current, "current members"], [new Date().getFullYear() - since, "years of research"]];
    $("#stats").innerHTML = stats.map(([n, l]) => `<div><dt data-n="${n}">0</dt><dd>${l}</dd></div>`).join("");
    $$("#stats dt").forEach(el => countUp(el, +el.dataset.n));
  }

  function countUp(el, target) {
    if (reduceMotion) { el.textContent = target; return; }
    const t0 = performance.now(), dur = 1200;
    (function tick(t) {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(target * e);
      if (k < 1) requestAnimationFrame(tick);
    })(t0);
  }

  const initials = name => name.replace(/,.*$/, "").replace(/\b(Md|Dr)\.?\s/g, "").split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const avatar = (p, cls = "avatar") => p.photo
    ? `<img class="${cls}" src="${esc(p.photo)}" alt="${esc(p.name)}" loading="lazy">`
    : `<div class="${cls}" aria-hidden="true">${initials(p.name)}</div>`;

  function renderAbout({ site }) {
    const { lab, pi, themes } = site;
    $("#about-text").textContent = lab.about;
    $("#themes").innerHTML = themes.map(t => `<div class="theme reveal"><h3>${esc(t.title)}</h3><p>${esc(t.text)}</p></div>`).join("");
    $("#pi-card").innerHTML = `
      ${avatar(pi)}
      <h3>${esc(pi.name)}</h3>
      <p class="role">${esc(pi.title)}<br>${esc(pi.department)}<br>${esc(pi.university)}</p>
      <ul>
        <li><span>email</span><a href="mailto:${esc(pi.email)}">${esc(pi.email)}</a></li>
        <li><span>phone</span><a href="tel:${esc(pi.phone.replace(/\D/g, ""))}">${esc(pi.phone)}</a></li>
        <li><span>office</span>${esc(pi.office)}</li>
      </ul>
      <div class="pill-links">${pi.links.map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`).join("")}</div>`;
    $("#scholar-link").href = pi.links.find(l => /scholar/i.test(l.label))?.url || "#";
  }

  /* ---------- Research ---------- */
  function renderResearch({ site, publications }) {
    const tabs = $("#area-tabs"), panel = $("#area-panel");
    tabs.innerHTML = site.areas.map((a, i) =>
      `<button class="area-tab" role="tab" aria-selected="${i === 0}" data-k="${a.key}">${ICONS[a.icon] || ""}${esc(a.title)}</button>`).join("");

    function show(key) {
      const a = site.areas.find(x => x.key === key);
      $$(".area-tab", tabs).forEach(b => b.setAttribute("aria-selected", b.dataset.k === key));
      const rx = AREA_PATTERNS[key];
      const rel = publications.filter(p => p.type !== "abstract" && rx && rx.test(p.title)).sort((x, y) => y.year - x.year).slice(0, 4);
      panel.innerHTML = `
        <div><h3>Focus topics</h3><ol class="focus-list">${a.items.map(i => `<li>${esc(i)}</li>`).join("")}</ol></div>
        <div class="related"><h4>Recent related work</h4><ul>${rel.map(p =>
          `<li>${p.link ? `<a href="${esc(p.link)}" target="_blank" rel="noopener">${esc(p.title)}</a>` : esc(p.title)}<small>${esc(p.venue)} · ${p.year}</small></li>`).join("")}</ul>
          <p><a class="text-link" href="#publications" data-area="${key}">See all related publications →</a></p></div>`;
      $("[data-area]", panel).addEventListener("click", () => {
        const kw = { control: "control", ai: "learning", energy: "battery" }[key];
        $("#pub-search").value = kw; $("#pub-search").dispatchEvent(new Event("input"));
      });
    }
    tabs.addEventListener("click", e => { const b = e.target.closest(".area-tab"); if (b) show(b.dataset.k); });
    show(site.areas[0].key);

    $("#apps").innerHTML = site.applications.map(a => `<div class="app reveal"><h3>${esc(a.title)}</h3><p>${esc(a.text)}</p></div>`).join("");
  }

  /* ---------- Publications ---------- */
  function renderPublications({ publications }) {
    const state = { q: "", type: "all", year: "all", limit: 15 };
    const list = $("#pub-list"), more = $("#pub-more"), count = $("#pub-count");

    // type chips
    const types = ["all", ...Object.keys(TYPE_LABEL).filter(t => publications.some(p => p.type === t))];
    $("#pub-types").innerHTML = types.map(t => {
      const n = t === "all" ? publications.length : publications.filter(p => p.type === t).length;
      return `<button class="chip" data-t="${t}" aria-pressed="${t === "all"}">${t === "all" ? "All" : TYPE_LABEL[t]}<span class="c">${n}</span></button>`;
    }).join("");
    $("#pub-types").addEventListener("click", e => {
      const b = e.target.closest(".chip"); if (!b) return;
      state.type = b.dataset.t; state.limit = 15;
      $$(".chip", $("#pub-types")).forEach(c => c.setAttribute("aria-pressed", c === b));
      update();
    });

    // year select + chart
    const years = [...new Set(publications.map(p => p.year))].sort((a, b) => b - a);
    const sel = $("#pub-year");
    sel.innerHTML = `<option value="all">All years</option>` + years.map(y => `<option>${y}</option>`).join("");
    sel.addEventListener("change", () => { state.year = sel.value; state.limit = 15; update(); });

    const asc = [...years].reverse();
    const counts = asc.map(y => publications.filter(p => p.year === y).length);
    const max = Math.max(...counts);
    const chart = $("#pub-chart");
    chart.innerHTML = asc.map((y, i) =>
      `<button class="bar" data-y="${y}" style="height:${Math.max(6, (counts[i] / max) * 100)}%" aria-label="${y}: ${counts[i]} publications"><span class="n">${counts[i]}</span><span>'${String(y).slice(2)}</span></button>`).join("");
    chart.addEventListener("click", e => {
      const b = e.target.closest(".bar"); if (!b) return;
      state.year = state.year === b.dataset.y ? "all" : b.dataset.y;
      sel.value = state.year; state.limit = 15; update();
    });

    let t;
    $("#pub-search").addEventListener("input", e => { clearTimeout(t); t = setTimeout(() => { state.q = e.target.value.trim(); state.limit = 15; update(); }, 120); });
    more.addEventListener("click", () => { state.limit += 20; update(); });

    const hl = (text, q) => {
      let s = esc(text);
      if (q) q.split(/\s+/).filter(w => w.length > 1).forEach(w => {
        s = s.replace(new RegExp(`(${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})(?![^<]*>)`, "gi"), "<mark>$1</mark>");
      });
      return s;
    };

    function update() {
      const q = state.q.toLowerCase();
      const res = publications
        .filter(p => state.type === "all" || p.type === state.type)
        .filter(p => state.year === "all" || String(p.year) === String(state.year))
        .filter(p => !q || q.split(/\s+/).every(w => `${p.title} ${p.authors} ${p.venue}`.toLowerCase().includes(w)))
        .sort((a, b) => b.year - a.year);

      $$(".bar", chart).forEach(b => b.classList.toggle("on", b.dataset.y === String(state.year)));
      count.textContent = `${res.length} of ${publications.length} items`;
      if (!res.length) { list.innerHTML = `<li class="empty">No publications match these filters.</li>`; more.hidden = true; return; }

      list.innerHTML = res.slice(0, state.limit).map(p => {
        const authors = hl(p.authors, state.q).replace(/(A(?:vimanyu|\.)\s*Sahoo)/g, "<b>$1</b>");
        return `<li class="pub">
          <div class="yr">${p.year}</div>
          <div>
            <p class="t">${hl(p.title, state.q)}</p>
            <p class="a">${authors}</p>
            <p class="v">${hl(p.venue, state.q)}</p>
            <div class="tags"><span class="tag">${TYPE_LABEL[p.type]}</span>${p.status ? `<span class="tag status">${esc(p.status)}</span>` : ""}</div>
          </div>
          ${p.link ? `<a class="go" href="${esc(p.link)}" target="_blank" rel="noopener" aria-label="Open paper">↗</a>` : "<span></span>"}
        </li>`;
      }).join("");
      more.hidden = res.length <= state.limit;
      more.textContent = `Show more (${res.length - state.limit} remaining)`;
    }
    update();
  }

  /* ---------- People ---------- */
  function renderPeople({ people }) {
    const grid = $("#people-grid"), tabs = $("#people-tabs");
    function show(g) {
      $$("button", tabs).forEach(b => b.setAttribute("aria-selected", b.dataset.g === g));
      grid.innerHTML = people.filter(p => p.group === g).map(p => `
        <article class="person">
          ${avatar(p)}
          <h3>${esc(p.name)}</h3>
          <div class="lvl">${esc(p.level)}</div>
          <div class="prog">${esc(p.program)}</div>
          ${p.topic ? `<div class="topic">${esc(p.topic)}</div>` : ""}
          ${p.now ? `<div class="now">Now: ${esc(p.now)}</div>` : ""}
          ${p.when ? `<div class="when">${esc(p.when)}</div>` : ""}
        </article>`).join("");
    }
    tabs.addEventListener("click", e => { const b = e.target.closest("button"); if (b) show(b.dataset.g); });
    show("current");
  }

  /* ---------- News ---------- */
  function renderNews({ news, site }) {
    const fmt = d => { const [y, m] = d.split("-"); return new Date(+y, +m - 1).toLocaleDateString("en-US", { month: "short", year: "numeric" }); };
    const state = { tag: "All", limit: 8 };
    const tags = TAG_ORDER.filter(t => t === "All" || news.some(n => n.tag === t));
    $("#news-tags").innerHTML = tags.map(t => `<button class="chip" data-t="${t}" aria-pressed="${t === "All"}">${t}</button>`).join("");
    $("#news-tags").addEventListener("click", e => {
      const b = e.target.closest(".chip"); if (!b) return;
      state.tag = b.dataset.t; state.limit = 8;
      $$(".chip", $("#news-tags")).forEach(c => c.setAttribute("aria-pressed", c === b));
      update();
    });
    const more = $("#news-more");
    more.addEventListener("click", () => { state.limit += 10; update(); });

    function update() {
      const res = news.filter(n => state.tag === "All" || n.tag === state.tag).sort((a, b) => b.date.localeCompare(a.date));
      $("#timeline").innerHTML = res.slice(0, state.limit).map(n => `
        <li data-tag="${esc(n.tag)}">
          <div class="d">${fmt(n.date)} <span class="tag">${esc(n.tag)}</span></div>
          <p>${esc(n.text)}${n.link ? ` <a href="${esc(n.link)}" target="_blank" rel="noopener">Read more ↗</a>` : ""}</p>
        </li>`).join("");
      more.hidden = res.length <= state.limit;
    }
    update();

    $("#media").innerHTML = site.media.map(m => `<li><a href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.label)} ↗</a></li>`).join("");
  }

  /* ---------- Join + contact ---------- */
  function renderJoin({ site }) {
    $("#positions").innerHTML = site.positions.map(p => `
      <article class="position reveal">
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.summary)}</p>
        <ul>${p.qualifications.map(q => `<li>${esc(q)}</li>`).join("")}</ul>
      </article>`).join("");
    const email = site.pi.email;
    $("#apply").innerHTML = esc(site.howToApply).replace(esc(email), `<a href="mailto:${esc(email)}?subject=Ph.D.%20position%20inquiry">${esc(email)}</a>`);
  }

  function renderContact({ site }) {
    const { pi, lab } = site;
    const q = encodeURIComponent(`${pi.address}`);
    $("#contact-grid").innerHTML = `
      <div class="contact-card">
        <p class="kicker mono">07 / Contact</p>
        <h2>Get in touch</h2>
        <p class="body-lg" style="margin:0">Interested in collaborating or joining ${esc(lab.short)}? Reach out directly.</p>
        <dl>
          <dt>Name</dt><dd>${esc(pi.name)}</dd>
          <dt>Email</dt><dd><a href="mailto:${esc(pi.email)}">${esc(pi.email)}</a><button class="copy" data-copy="${esc(pi.email)}">copy</button></dd>
          <dt>Phone</dt><dd>${esc(pi.phone)}</dd>
          <dt>Office</dt><dd>${esc(pi.office)}</dd>
          <dt>Address</dt><dd>${esc(pi.department)}<br>${esc(pi.university)}<br>${esc(pi.address)}</dd>
        </dl>
      </div>
      <div class="map"><iframe title="Map to ${esc(pi.university)}" loading="lazy" src="https://www.google.com/maps?q=${q}&output=embed"></iframe></div>`;
    $(".copy").addEventListener("click", async e => {
      try { await navigator.clipboard.writeText(e.target.dataset.copy); e.target.textContent = "copied"; setTimeout(() => (e.target.textContent = "copy"), 1500); } catch {}
    });
  }

  /* ---------- Reveal on scroll ---------- */
  function initReveal() {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .12 });
    $$(".reveal").forEach(el => io.observe(el));
  }

  /* ---------- Boot ---------- */
  document.addEventListener("DOMContentLoaded", async () => {
    $("#year").textContent = new Date().getFullYear();
    initTheme(); initNav(); initCanvas();
    try {
      const data = await loadData();
      renderHero(data); renderAbout(data); renderResearch(data);
      renderPublications(data); renderPeople(data); renderNews(data);
      renderJoin(data); renderContact(data);
      initReveal();
    } catch (err) {
      console.error(err);
      $("#main").insertAdjacentHTML("afterbegin",
        `<p class="wrap empty">Couldn't load site data (${esc(err.message)}). If you opened index.html directly from disk, run a local server instead — see README.</p>`);
    }
  });
})();
