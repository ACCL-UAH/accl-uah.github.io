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
    energy: /battery|lithium|li-ion|soh|soc\b|impedance|bms|electrochemical/i,
    robotics: /robot|manipulator|navigation|path planning|lane following|wheeled|autonomous vehicle|inspection/i
  };
  const ICONS = {
    control: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 12h4l3-7 4 14 3-7h4"/></svg>',
    ai: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="M8 7l3 9M16 7l-3 9M8.5 6h7"/></svg>',
    energy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="7" width="16" height="10" rx="2"/><path d="M21 10v4M11 9l-2 3h4l-2 3"/></svg>',
    robotics: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21h8M8 21v-4l5-6"/><circle cx="13" cy="11" r="1.6"/><path d="M14.2 9.8 18 6"/><path d="M18 6l2 1.5M18 6l1-2.3"/></svg>'
  };

  /* ---------- Data loading ---------- */
  async function loadData() {
    if (window.ACCL_DATA) return window.ACCL_DATA; // bundled preview
    const get = f => fetch(`data/${f}.json`, { cache: "no-cache" }).then(r => { if (!r.ok) throw new Error(f); return r.json(); });
    const names = ["site", "people", "publications", "news", "projects", "facilities", "teaching"];
    const vals = await Promise.all(names.map(get));
    return Object.fromEntries(names.map((n, i) => [n, vals[i]]));
  }

  const AREA_LABEL = { control: "Control", ai: "Artificial Intelligence", energy: "Energy Storage", robotics: "Robotics", education: "Education", sensing: "Sensing & IoT" };
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
  function renderHero({ site, people, publications, projects }) {
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
    const stats = [[peer, "peer-reviewed works"], [journals, "journal articles"], [projects.length, "funded projects"], [current, "current members"]];
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
  function renderResearch({ site, publications, projects }) {
    const tabs = $("#area-tabs"), panel = $("#area-panel");
    tabs.innerHTML = site.areas.map((a, i) =>
      `<button class="area-tab" role="tab" aria-selected="${i === 0}" data-k="${a.key}">${ICONS[a.icon] || ""}${esc(a.title)}</button>`).join("");

    function show(key) {
      const a = site.areas.find(x => x.key === key);
      $$(".area-tab", tabs).forEach(b => b.setAttribute("aria-selected", b.dataset.k === key));
      const rx = AREA_PATTERNS[key];
      const rel = publications.filter(p => p.type !== "abstract" && rx && rx.test(p.title)).sort((x, y) => y.year - x.year).slice(0, 4);
      const projs = projects.filter(p => p.area === key);
      panel.innerHTML = `
        <div><h3>Focus topics</h3><ol class="focus-list">${a.items.map(i => `<li>${esc(i)}</li>`).join("")}</ol>
          ${projs.length ? `<div class="related" style="margin-top:22px"><h4>Projects in this area</h4><ul>${projs.map(p =>
            `<li><a href="detail.html?project=${encodeURIComponent(p.id)}">${esc(p.title)}</a><small>${esc(p.sponsor)} · ${p.status === "current" ? "Current" : "Completed"}</small></li>`).join("")}</ul></div>` : ""}</div>
        <div class="related"><h4>Recent related work</h4><ul>${rel.map(p =>
          `<li><a href="detail.html?paper=${encodeURIComponent(p.id)}">${esc(p.title)}</a><small>${esc(p.venue)} · ${p.year}</small></li>`).join("")}</ul>
          <p><a class="text-link" href="#publications" data-area="${key}">See all related publications →</a></p></div>`;
      $("[data-area]", panel).addEventListener("click", () => {
        const kw = { control: "control", ai: "learning", energy: "battery", robotics: "robot" }[key];
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

    // Featured papers (any entry with a "featured" label) get a spotlight card above the list.
    const feat = publications.filter(p => p.featured).sort((a, b) => b.year - a.year);
    $("#pub-featured").innerHTML = feat.map(p => `
      <a class="feat-card" data-mark="${esc(p.featured.split(/\s/)[0])}" href="detail.html?paper=${encodeURIComponent(p.id)}">
        <span class="feat-label mono">★ Featured · ${esc(p.featured)}</span>
        <span class="feat-title">${esc(p.title)}</span>
        <span class="feat-meta">${esc(p.authors).replace(/(A(?:vimanyu|\.)\s*Sahoo)/g, "<b>$1</b>")} · ${esc(p.venue)}, ${p.year}</span>
        <span class="feat-go">Read more →</span>
      </a>`).join("");

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
        return `<li class="pub${p.featured ? " featured" : ""}">
          <div class="yr">${p.year}</div>
          <div>
            ${p.featured ? `<span class="star-badge">★ ${esc(p.featured)}</span>` : ""}
            <p class="t"><a class="pub-title" href="detail.html?paper=${encodeURIComponent(p.id)}">${hl(p.title, state.q)}</a></p>
            <p class="a">${authors}</p>
            <p class="v">${hl(p.venue, state.q)}</p>
            <div class="tags"><span class="tag">${TYPE_LABEL[p.type]}</span>${p.status ? `<span class="tag status">${esc(p.status)}</span>` : ""}${p.abstract ? `<span class="tag rich">Abstract</span>` : ""}${(p.figures || []).length ? `<span class="tag rich">Results</span>` : ""}${p.video ? `<span class="tag rich">▶ Video</span>` : ""}</div>
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
        <p class="kicker mono">10 / Contact</p>
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

  /* ---------- Projects ---------- */
  function renderProjects({ projects }) {
    const state = { status: "all", area: "all" };
    const n = s => projects.filter(p => s === "all" || p.status === s).length;
    $("#proj-status").innerHTML = [["all", "All"], ["current", "Current"], ["completed", "Completed"]]
      .map(([k, l]) => `<button role="tab" data-s="${k}" aria-selected="${k === "all"}">${l} <span class="c">${n(k)}</span></button>`).join("");
    const areas = ["all", ...Object.keys(AREA_LABEL).filter(a => projects.some(p => p.area === a))];
    $("#proj-areas").innerHTML = areas.map(a => `<button class="chip" data-a="${a}" aria-pressed="${a === "all"}">${a === "all" ? "All areas" : AREA_LABEL[a]}</button>`).join("");

    $("#proj-status").addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      state.status = b.dataset.s; $$("button", $("#proj-status")).forEach(x => x.setAttribute("aria-selected", x === b)); update();
    });
    $("#proj-areas").addEventListener("click", e => {
      const b = e.target.closest(".chip"); if (!b) return;
      state.area = b.dataset.a; $$(".chip", $("#proj-areas")).forEach(x => x.setAttribute("aria-pressed", x === b)); update();
    });

    function update() {
      const res = projects.filter(p => (state.status === "all" || p.status === state.status) && (state.area === "all" || p.area === state.area));
      $("#proj-grid").innerHTML = res.length ? res.map(p => {
        const img = (p.images || [])[0], sim = !img && window.ACCLSims && window.ACCLSims.has(p.id);
        return `<a class="proj" href="detail.html?project=${encodeURIComponent(p.id)}">
          ${img ? `<img class="proj-img" src="${esc(img.src || img)}" alt="" loading="lazy">`
            : sim ? `<div class="proj-img sim-mini"><canvas data-sim="${esc(p.id)}" aria-hidden="true"></canvas><span class="sim-mini-tag">live simulation</span></div>`
            : `<div class="proj-img ph" data-area="${esc(p.area)}">${ICONS[p.area] || ICONS.control}</div>`}
          <div class="proj-body">
            <div class="proj-meta"><span class="dot ${p.status}"></span>${p.status === "current" ? "Current" : "Completed"}${p.period ? ` · ${esc(p.period)}` : ""}</div>
            <h3>${esc(p.title)}</h3>
            <p class="sponsor">${esc(p.sponsor)}</p>
            <p class="sum">${esc(p.summary)}</p>
            <span class="more-link">View project →</span>
          </div></a>`;
      }).join("") : `<p class="empty">No projects match.</p>`;
      $$("#proj-grid canvas[data-sim]").forEach(cv => window.ACCLSims.mini(cv, cv.dataset.sim));
    }
    update();
  }

  /* ---------- Facilities ---------- */
  function renderFacilities({ facilities }) {
    $("#fac-grid").innerHTML = facilities.map(f => {
      const img = (f.images || [])[0];
      return `<article class="fac reveal">
        ${img ? `<img class="fac-img" src="${esc(img.src || img)}" alt="${esc(f.name)}" loading="lazy">` : ""}
        <div class="fac-head">
          <div><h3>${esc(f.name)}</h3><p class="mono fac-loc">${esc(f.room)}${f.size ? ` · ${esc(f.size)}` : ""}</p></div>
        </div>
        <p class="fac-sum">${esc(f.summary)}</p>
        <div class="equip">${f.equipment.map(e => `
          <details>
            <summary>${esc(e.name)}${e.status ? ` <span class="tag status">${esc(e.status)}</span>` : ""}</summary>
            <ul>${e.specs.map(s => `<li>${esc(s)}</li>`).join("")}</ul>
          </details>`).join("")}</div>
        <a class="text-link" href="detail.html?facility=${encodeURIComponent(f.id)}">Photos and details →</a>
      </article>`;
    }).join("");
  }

  /* ---------- Teaching ---------- */
  function renderTeaching({ teaching }) {
    const insts = [...new Set(teaching.courses.map(c => c.institution))];
    const short = i => i.replace("University of Alabama in Huntsville", "UAH").replace("Oklahoma State University", "Oklahoma State");
    $("#teach-tabs").innerHTML = insts.map((i, k) => `<button role="tab" data-i="${esc(i)}" aria-selected="${k === 0}">${esc(short(i))}</button>`).join("");
    function show(inst) {
      $$("button", $("#teach-tabs")).forEach(b => b.setAttribute("aria-selected", b.dataset.i === inst));
      $("#course-list").innerHTML = teaching.courses.filter(c => c.institution === inst).map(c => `
        <div class="course">
          <span class="code mono">${esc(c.code)}</span>
          <div>
            <h3>${c.link ? `<a href="${esc(c.link)}" target="_blank" rel="noopener">${esc(c.title)}</a>` : esc(c.title)}</h3>
            ${c.description ? `<p>${esc(c.description)}</p>` : ""}
            <div class="tags"><span class="tag">${esc(c.level)}</span>${(c.terms || []).map(t => `<span class="tag">${esc(t)}</span>`).join("")}${c.highlight ? `<span class="tag hl">★ ${esc(c.highlight)}</span>` : ""}${c.project ? `<span class="tag rich">Project: ${esc(c.project)}</span>` : ""}</div>
          </div>
        </div>`).join("");
    }
    $("#teach-tabs").addEventListener("click", e => { const b = e.target.closest("button"); if (b) show(b.dataset.i); });
    show(insts[0]);
    $("#outreach").innerHTML = teaching.outreach.map(o => `<li class="side-item"><strong>${o.link ? `<a href="${esc(o.link)}" target="_blank" rel="noopener">${esc(o.title)} ↗</a>` : esc(o.title)}</strong><p>${esc(o.text)}</p></li>`).join("");
    $("#service").innerHTML = teaching.service.map(s => `<li class="side-item"><strong>${esc(s.title)}</strong><p class="mono">${s.from ? `${esc(s.from)} – ${s.to ? esc(s.to) : "present"}` : s.since ? `Since ${esc(s.since)}` : ""}</p></li>`).join("");
  }

  /* ---------- Reveal on scroll ---------- */
  function initReveal() {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .12 });
    $$(".reveal").forEach(el => io.observe(el));
  }

  /* ---------- Boot ---------- */
  document.addEventListener("DOMContentLoaded", async () => {
    $("#year").textContent = new Date().getFullYear();
    initTheme(); initNav();
    try {
      const data = await loadData();
      renderHero(data); renderAbout(data); renderResearch(data);
      renderProjects(data); renderPublications(data); renderPeople(data);
      renderFacilities(data); renderTeaching(data); renderNews(data);
      renderJoin(data); renderContact(data);
      initReveal();
    } catch (err) {
      console.error(err);
      $("#main").insertAdjacentHTML("afterbegin",
        `<p class="wrap empty">Couldn't load site data (${esc(err.message)}). If you opened index.html directly from disk, run a local server instead — see README.</p>`);
    }
  });
})();
