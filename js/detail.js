/* ACCL detail page: detail.html?paper=<id> | ?project=<id> | ?facility=<id>
   Content comes from data/publications.json, data/projects.json, data/facilities.json. */
(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s = "") => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const TYPE_LABEL = { book: "Book", chapter: "Book chapter", journal: "Journal article", conference: "Conference paper", abstract: "Abstract / talk" };
  const AREA_LABEL = { control: "Control", ai: "Artificial Intelligence", energy: "Energy Storage", education: "Education", sensing: "Sensing & IoT" };

  /* ---------- helpers ---------- */
  // Paragraphs: blank line in the JSON text ("\n\n") starts a new paragraph.
  const paras = t => String(t || "").split(/\n\s*\n/).map(p => `<p>${esc(p.trim())}</p>`).join("");
  const asImg = x => (typeof x === "string" ? { src: x, caption: "" } : x);
  const asList = x => (Array.isArray(x) ? x : x ? [x] : []);

  function videoEmbed(v) {
    const item = typeof v === "string" ? { url: v } : v;
    const url = item.url || "";
    let m, html;
    if ((m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/))) {
      html = `<iframe src="https://www.youtube-nocookie.com/embed/${m[1]}" title="${esc(item.caption || "Video")}" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe>`;
    } else if ((m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/))) {
      html = `<iframe src="https://player.vimeo.com/video/${m[1]}" title="${esc(item.caption || "Video")}" allow="fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe>`;
    } else if ((m = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/))) {
      html = `<iframe src="https://drive.google.com/file/d/${m[1]}/preview" title="${esc(item.caption || "Video")}" allow="autoplay; fullscreen" allowfullscreen loading="lazy"></iframe>`;
    } else {
      html = `<video src="${esc(url)}" controls preload="metadata" playsinline></video>`;
    }
    return `<figure class="fig" style="border:0;background:transparent"><div class="video">${html}</div>${item.caption ? `<figcaption style="padding:0">${esc(item.caption)}</figcaption>` : ""}</figure>`;
  }

  const figures = list => {
    const imgs = asList(list).map(asImg);
    if (!imgs.length) return "";
    return `<div class="figs ${imgs.length === 1 ? "one" : ""}">${imgs.map(f =>
      `<figure class="fig"><img src="${esc(f.src)}" alt="${esc(f.caption || "")}" loading="lazy" data-cap="${esc(f.caption || "")}">${f.caption ? `<figcaption>${esc(f.caption)}</figcaption>` : ""}</figure>`).join("")}</div>`;
  };

  const section = (title, body) => (body ? `<section class="d-sec"><h2>${esc(title)}</h2>${body}</section>` : "");
  const bullets = arr => (asList(arr).length ? `<ul class="d-list">${asList(arr).map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : "");
  const boldPI = s => esc(s).replace(/(A(?:vimanyu|\.)\s*Sahoo)/g, "<b>$1</b>");
  const doiOf = p => p.doi || ((p.link || "").match(/doi\.org\/(.+)$/) || [])[1] || "";

  function bibtex(p) {
    const first = (p.authors.split(",")[0] || "").trim().split(/\s+/).pop().replace(/[^A-Za-z]/g, "");
    const word = (p.title.match(/[A-Za-z]{4,}/) || ["paper"])[0].toLowerCase();
    const key = `${first.toLowerCase()}${p.year}${word}`;
    const authors = p.authors.split(/,\s*/).join(" and ");
    const kind = { journal: "article", conference: "inproceedings", book: "book", chapter: "incollection", abstract: "misc" }[p.type] || "misc";
    const venueField = { article: "journal", inproceedings: "booktitle", incollection: "booktitle", book: "publisher", misc: "howpublished" }[kind];
    const lines = [`  title = {${p.title}}`, `  author = {${authors}}`, `  ${venueField} = {${p.venue}}`, `  year = {${p.year}}`];
    const doi = doiOf(p); if (doi) lines.push(`  doi = {${doi}}`);
    return `@${kind}{${key},\n${lines.join(",\n")}\n}`;
  }

  /* ---------- page chrome ---------- */
  function initChrome() {
    $("#year").textContent = new Date().getFullYear();
    const root = document.documentElement;
    try { const t = localStorage.getItem("accl-theme"); if (t) root.dataset.theme = t; } catch {}
    $("#theme-toggle").addEventListener("click", () => {
      const isDark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
      root.dataset.theme = isDark ? "light" : "dark";
      try { localStorage.setItem("accl-theme", root.dataset.theme); } catch {}
    });
    const links = $("#links"), btn = $("#menu-btn");
    btn.addEventListener("click", () => btn.setAttribute("aria-expanded", links.classList.toggle("open")));
  }

  function wireUp() {
    // lightbox for figures
    $$(".fig img").forEach(img => img.addEventListener("click", () => {
      const lb = document.createElement("div");
      lb.className = "lightbox";
      lb.innerHTML = `<div><img src="${esc(img.src)}" alt=""><p>${esc(img.dataset.cap || "")}</p></div>`;
      lb.addEventListener("click", () => lb.remove());
      document.addEventListener("keydown", function k(e) { if (e.key === "Escape") { lb.remove(); document.removeEventListener("keydown", k); } });
      document.body.appendChild(lb);
    }));
    const cb = $("#copy-bib");
    if (cb) cb.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText($("#bib").textContent); cb.textContent = "Copied!"; setTimeout(() => (cb.textContent = "Copy BibTeX"), 1500); } catch {}
    });
  }

  const hero = ({ crumb, kicker, title, sub, meta, actions }) => `
    <section class="d-hero"><div class="wrap">
      <div class="crumbs"><a href="index.html">Home</a> / <a href="index.html#${crumb[1]}">${esc(crumb[0])}</a></div>
      ${kicker ? `<p class="eyebrow mono">${kicker}</p>` : ""}
      <h1>${esc(title)}</h1>
      ${sub || ""}
      ${meta ? `<div class="d-meta">${meta}</div>` : ""}
      ${actions ? `<div class="d-actions">${actions}</div>` : ""}
    </div></section>`;

  const btn = (label, url, primary) => (url ? `<a class="btn ${primary ? "primary" : "ghost"}" href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>` : "");
  const extraLinks = links => asList(links).map(l => btn(l.label, l.url)).join("");
  const paperItem = p => `<li><a href="detail.html?paper=${encodeURIComponent(p.id)}">${esc(p.title)}</a><small>${esc(p.venue)} · ${p.year}</small></li>`;

  /* ---------- paper ---------- */
  function renderPaper(p, data) {
    document.title = `${p.title} · ACCL`;
    const projects = data.projects.filter(x => asList(x.publications).includes(p.id));
    const doi = doiOf(p);
    const videos = asList(p.video);

    const body = [
      section("Abstract", p.abstract ? `<div class="prose">${paras(p.abstract)}</div>` : ""),
      section("Key contributions", bullets(p.highlights)),
      section("Results", (p.results ? `<div class="prose">${paras(p.results)}</div>` : "") + figures(p.figures)),
      section(videos.length > 1 ? "Videos" : "Video", videos.map(videoEmbed).join("")),
      section("Citation", `<pre class="bib" id="bib">${esc(bibtex(p))}</pre><p><button class="btn ghost" id="copy-bib" style="margin-top:12px">Copy BibTeX</button></p>`)
    ].join("");

    return hero({
      crumb: ["Publications", "publications"],
      kicker: `${TYPE_LABEL[p.type] || ""} · ${p.year}${p.status ? ` · ${esc(p.status)}` : ""}`,
      title: p.title,
      sub: `<p class="d-authors">${boldPI(p.authors)}</p>`,
      meta: `<span><b>${esc(p.venue)}</b></span>`,
      actions: btn(doi ? "View paper (DOI)" : "View paper", p.link, true) + btn("PDF", p.pdf) + btn("Code", p.code) + btn("Slides", p.slides) + btn("Dataset", p.dataset) + extraLinks(p.links)
    }) + `<div class="wrap d-body"><div>${body}</div>
      <aside class="d-side">
        <div class="d-card"><h3>Details</h3><dl>
          <div><dt>Type</dt><dd>${esc(TYPE_LABEL[p.type] || p.type)}</dd></div>
          <div><dt>Venue</dt><dd>${esc(p.venue)}</dd></div>
          <div><dt>Year</dt><dd>${p.year}</dd></div>
          ${p.status ? `<div><dt>Status</dt><dd>${esc(p.status)}</dd></div>` : ""}
          ${doi ? `<div><dt>DOI</dt><dd><a href="https://doi.org/${esc(doi)}" target="_blank" rel="noopener">${esc(doi)}</a></dd></div>` : ""}
        </dl></div>
        ${projects.length ? `<div class="d-card"><h3>Funded by / part of</h3><ul>${projects.map(x => `<li><a href="detail.html?project=${encodeURIComponent(x.id)}">${esc(x.title)}</a><small>${esc(x.sponsor)}</small></li>`).join("")}</ul></div>` : ""}
      </aside></div>`;
  }

  /* ---------- project ---------- */
  function renderProject(p, data) {
    document.title = `${p.title} · ACCL`;
    const pubs = asList(p.publications).map(id => data.publications.find(x => x.id === id)).filter(Boolean).sort((a, b) => b.year - a.year);
    const team = asList(p.team);
    const videos = asList(p.video);
    const awards = asList(p.awardLinks);

    const body = [
      section("Overview", `<div class="prose">${paras(p.summary)}${p.description ? paras(p.description) : ""}</div>`),
      section("Objectives", bullets(p.objectives)),
      section("Highlights", bullets(p.highlights)),
      section("Results", (p.results ? `<div class="prose">${paras(p.results)}</div>` : "") + figures(p.figures)),
      section("Gallery", figures(p.images)),
      section(videos.length > 1 ? "Videos" : "Video", videos.map(videoEmbed).join("")),
      section("Publications from this project", pubs.length ? `<div class="d-card"><ul>${pubs.map(paperItem).join("")}</ul></div>` : "")
    ].join("");

    return hero({
      crumb: ["Projects", "projects"],
      kicker: `${p.status === "current" ? "Current project" : "Completed project"}${p.period ? ` · ${esc(p.period)}` : ""}`,
      title: p.title,
      meta: `<span>Sponsor: <b>${esc(p.sponsor)}</b></span>${p.award ? `<span>${esc(p.award)}</span>` : ""}`,
      actions: awards.map((u, i) => btn(awards.length > 1 ? `NSF award ${i + 1}` : "Award page", u, i === 0)).join("") + extraLinks(p.links)
    }) + `<div class="wrap d-body"><div>${body}</div>
      <aside class="d-side">
        <div class="d-card"><h3>Project details</h3><dl>
          <div><dt>Status</dt><dd>${p.status === "current" ? "Current" : "Completed"}</dd></div>
          <div><dt>Sponsor</dt><dd>${esc(p.sponsor)}</dd></div>
          ${p.award ? `<div><dt>Award</dt><dd>${esc(p.award)}</dd></div>` : ""}
          ${p.amount ? `<div><dt>Amount</dt><dd>${esc(p.amount)}</dd></div>` : ""}
          ${p.period ? `<div><dt>Period</dt><dd>${esc(p.period)}</dd></div>` : ""}
          ${p.role ? `<div><dt>Role</dt><dd>${esc(p.role)}</dd></div>` : ""}
          <div><dt>Area</dt><dd>${esc(AREA_LABEL[p.area] || p.area)}</dd></div>
        </dl></div>
        ${asList(p.collaborators).length ? `<div class="d-card"><h3>Collaborators</h3><ul>${p.collaborators.map(c => `<li>${esc(c)}</li>`).join("")}</ul></div>` : ""}
        ${team.length ? `<div class="d-card"><h3>Team</h3><ul>${team.map(c => `<li>${esc(c)}</li>`).join("")}</ul></div>` : ""}
      </aside></div>`;
  }

  /* ---------- facility ---------- */
  function renderFacility(f) {
    document.title = `${f.name} · ACCL`;
    const body = [
      section("Overview", `<div class="prose">${paras(f.summary)}${f.description ? paras(f.description) : ""}</div>`),
      section("Gallery", figures(f.images)),
      section("Video", asList(f.video).map(videoEmbed).join("")),
      section("Equipment", `<div class="figs">${f.equipment.map(e => `
        <div class="d-card"><h3 style="color:var(--text);font:600 1rem var(--font-h);text-transform:none;letter-spacing:0">${esc(e.name)}${e.status ? ` <span class="tag status">${esc(e.status)}</span>` : ""}</h3>
        ${e.image ? `<img src="${esc(e.image)}" alt="${esc(e.name)}" style="width:100%;border-radius:8px;margin-bottom:10px" loading="lazy">` : ""}
        <ul class="d-list" style="list-style:disc">${e.specs.map(s => `<li style="border:0;padding:2px 0">${esc(s)}</li>`).join("")}</ul></div>`).join("")}</div>`)
    ].join("");
    return hero({
      crumb: ["Facilities", "facilities"],
      kicker: "Laboratory facility",
      title: f.name,
      meta: `<span>Room <b>${esc(f.room)}</b></span>${f.size ? `<span><b>${esc(f.size)}</b></span>` : ""}`
    }) + `<div class="wrap d-body"><div>${body}</div>
      <aside class="d-side"><div class="d-card"><h3>Location</h3><dl>
        <div><dt>Room</dt><dd>${esc(f.room)}</dd></div>
        ${f.size ? `<div><dt>Size</dt><dd>${esc(f.size)}</dd></div>` : ""}
        <div><dt>Building</dt><dd>Engineering Building, University of Alabama in Huntsville</dd></div>
      </dl></div></aside></div>`;
  }

  /* ---------- boot ---------- */
  document.addEventListener("DOMContentLoaded", async () => {
    initChrome();
    const q = new URLSearchParams(location.search);
    const main = $("#detail");
    const notFound = what => `<div class="wrap notfound"><h1>Not found</h1><p>We couldn't find that ${what}.</p><p><a class="btn primary" href="index.html">Back to home</a></p></div>`;
    try {
      const get = f => fetch(`data/${f}.json`, { cache: "no-cache" }).then(r => { if (!r.ok) throw new Error(f); return r.json(); });
      const [publications, projects, facilities] = await Promise.all(["publications", "projects", "facilities"].map(get));
      const data = { publications, projects, facilities };
      let html;
      if (q.has("paper")) { const p = publications.find(x => x.id === q.get("paper")); html = p ? renderPaper(p, data) : notFound("paper"); }
      else if (q.has("project")) { const p = projects.find(x => x.id === q.get("project")); html = p ? renderProject(p, data) : notFound("project"); }
      else if (q.has("facility")) { const f = facilities.find(x => x.id === q.get("facility")); html = f ? renderFacility(f) : notFound("facility"); }
      else html = notFound("page");
      main.innerHTML = html;
      wireUp();
    } catch (err) {
      console.error(err);
      main.innerHTML = `<p class="wrap empty">Couldn't load site data (${esc(err.message)}). If you opened this file directly from disk, run a local server instead — see README.</p>`;
    }
  });
})();
