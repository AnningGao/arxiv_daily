// arXiv Daily Digest — client-side renderer.
// Loads a manifest of digests, renders the selected day's markdown with math
// and PDF figures, and offers month-grouped navigation plus full-text search.

import * as pdfjsLib from "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.min.mjs";
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs";

const menuEl = document.getElementById("menu");
const articleEl = document.getElementById("article");
const searchEl = document.getElementById("search");
const sidebarEl = document.getElementById("sidebar");
const toggleEl = document.getElementById("menu-toggle");

let manifest = { months: [] };
let searchIndex = [];
let flatDays = []; // [{date, month, title, path}] newest-first

// ---------------------------------------------------------------------------
// Math protection: pull $$...$$ and $...$ out before marked runs so it can't
// mangle _ / * inside formulas, then restore the spans afterwards.
// ---------------------------------------------------------------------------
function protectMath(src) {
  const store = [];
  const stash = (tex) => {
    const token = `@@MATH${store.length}@@`;
    store.push(tex);
    return token;
  };
  // Display math first ($$...$$), then inline ($...$). Skip escaped \$.
  let out = src.replace(/\$\$([\s\S]+?)\$\$/g, (_, t) => stash("$$" + t + "$$"));
  out = out.replace(/(^|[^\\$])\$(?!\$)([^\n$]+?)\$/g, (_, pre, t) => pre + stash("$" + t + "$"));
  return { text: out, store };
}

function restoreMath(html, store) {
  return html.replace(/@@MATH(\d+)@@/g, (_, i) => store[Number(i)]);
}

// ---------------------------------------------------------------------------
// PDF figures: render page 1 of a PDF to a <canvas> (no conversion), lazily.
// ---------------------------------------------------------------------------
const pdfObserver = new IntersectionObserver((entries, obs) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      obs.unobserve(entry.target);
      renderPdfCanvas(entry.target);
    }
  }
}, { rootMargin: "300px" });

async function renderPdfCanvas(canvas) {
  const url = canvas.dataset.src;
  try {
    const pdf = await pdfjsLib.getDocument(url).promise;
    const page = await pdf.getPage(1);
    const containerWidth = Math.min(canvas.parentElement.clientWidth || 700, 900);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.max(0.2, containerWidth / base.width);
    const dpr = window.devicePixelRatio || 1;
    const viewport = page.getViewport({ scale: scale * dpr });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = (viewport.width / dpr) + "px";
    canvas.style.height = (viewport.height / dpr) + "px";
    const ctx = canvas.getContext("2d");
    await page.render({ canvasContext: ctx, viewport }).promise;
  } catch (err) {
    const note = document.createElement("p");
    note.className = "pdf-error";
    note.innerHTML = `Could not render PDF figure. <a href="${url}" target="_blank" rel="noopener">Open PDF</a>.`;
    canvas.replaceWith(note);
  }
}

// Rewrite figure <img> tags inside a DETACHED document (parsed via DOMParser,
// which does not load subresources). PDF figures become a clickable <canvas>;
// other images get their src corrected. Doing this before the nodes enter the
// live DOM means only correct requests ever fire (no spurious root-relative
// 404s). Resolves relative paths against the digest's month directory.
function rewriteFigures(doc, baseDir) {
  for (const img of [...doc.querySelectorAll("img")]) {
    const raw = img.getAttribute("src") || "";
    const url = /^https?:|^\//.test(raw) ? raw : baseDir + raw;
    if (/\.pdf(\?|$)/i.test(raw)) {
      const link = doc.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener";
      link.className = "pdf-figure";
      const canvas = doc.createElement("canvas");
      canvas.className = "pdf-canvas";
      canvas.dataset.src = url;
      link.appendChild(canvas);
      img.replaceWith(link);
    } else {
      img.setAttribute("src", url);
      img.setAttribute("loading", "lazy");
    }
  }
}

// ---------------------------------------------------------------------------
// Rendering a digest
// ---------------------------------------------------------------------------
async function renderDigest(day) {
  articleEl.innerHTML = "Loading…";
  const baseDir = day.month + "/";
  let raw;
  try {
    const resp = await fetch(day.path, { cache: "no-cache" });
    if (!resp.ok) throw new Error(resp.status);
    raw = await resp.text();
  } catch (err) {
    articleEl.innerHTML = `<p class="pdf-error">Failed to load ${day.path}.</p>`;
    return;
  }

  const { text, store } = protectMath(raw);
  let html = marked.parse(text, { gfm: true, breaks: false });
  html = restoreMath(html, store);

  // Parse into a detached document, fix figure paths there, then adopt the
  // ready nodes — so no image ever requests a wrong (root-relative) path.
  const doc = new DOMParser().parseFromString(html, "text/html");
  rewriteFigures(doc, baseDir);
  for (const a of doc.querySelectorAll('a[href^="http"]')) {
    a.target = "_blank";
    a.rel = "noopener";
  }
  articleEl.replaceChildren(...document.adoptNode(doc.body).childNodes);

  if (window.renderMathInElement) {
    window.renderMathInElement(articleEl, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false },
      ],
      throwOnError: false,
    });
  }

  // Now that canvases are live, lazily render their PDFs on scroll.
  for (const canvas of articleEl.querySelectorAll("canvas.pdf-canvas")) {
    pdfObserver.observe(canvas);
  }
  highlightActive(day.date);
  window.scrollTo(0, 0);
  document.title = "arXiv Digest — " + day.date;
}

// ---------------------------------------------------------------------------
// Menu (month-grouped)
// ---------------------------------------------------------------------------
function buildMenu() {
  menuEl.innerHTML = "";
  manifest.months.forEach((month, idx) => {
    const group = document.createElement("details");
    group.className = "month-group";
    if (idx === 0) group.open = true; // newest month expanded
    const summary = document.createElement("summary");
    summary.textContent = `${monthLabel(month.month)} (${month.days.length})`;
    group.appendChild(summary);

    const list = document.createElement("ul");
    for (const day of month.days) {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = "#/" + day.date;
      a.className = "day-link";
      a.dataset.date = day.date;
      a.innerHTML = `<span class="day-date">${day.date}</span>`;
      li.appendChild(a);
      list.appendChild(li);
    }
    group.appendChild(list);
    menuEl.appendChild(group);
  });
}

function monthLabel(ym) {
  const [y, m] = ym.split("-");
  const names = ["January","February","March","April","May","June","July",
                 "August","September","October","November","December"];
  return `${names[Number(m) - 1]} ${y}`;
}

function highlightActive(date) {
  for (const a of menuEl.querySelectorAll(".day-link")) {
    a.classList.toggle("active", a.dataset.date === date);
  }
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------
function snippet(text, query) {
  const i = text.indexOf(query.toLowerCase());
  if (i < 0) return "";
  const start = Math.max(0, i - 40);
  const end = Math.min(text.length, i + query.length + 60);
  return (start > 0 ? "…" : "") + text.slice(start, end).trim() + (end < text.length ? "…" : "");
}

function runSearch(query) {
  const q = query.trim().toLowerCase();
  if (!q) {
    buildMenu();
    const cur = currentDate();
    if (cur) highlightActive(cur);
    return;
  }
  const hits = searchIndex.filter(
    (d) => d.title.toLowerCase().includes(q) || d.text.includes(q)
  );
  menuEl.innerHTML = "";
  const header = document.createElement("p");
  header.className = "search-count";
  header.textContent = `${hits.length} match${hits.length === 1 ? "" : "es"}`;
  menuEl.appendChild(header);

  const list = document.createElement("ul");
  list.className = "search-results";
  for (const d of hits) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = "#/" + d.date;
    a.className = "day-link";
    a.dataset.date = d.date;
    a.innerHTML =
      `<span class="day-date">${d.date}</span>` +
      `<span class="day-snippet">${escapeHtml(snippet(d.text, q))}</span>`;
    li.appendChild(a);
    list.appendChild(li);
  }
  menuEl.appendChild(list);
}

function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------
function currentDate() {
  const m = location.hash.match(/^#\/(\d{4}-\d{2}-\d{2})$/);
  return m ? m[1] : null;
}

function route() {
  const date = currentDate();
  const day = date ? flatDays.find((d) => d.date === date) : flatDays[0];
  if (!day) {
    articleEl.innerHTML = "<p>No digests available yet.</p>";
    return;
  }
  renderDigest(day);
  sidebarEl.classList.remove("open");
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
async function init() {
  try {
    [manifest, searchIndex] = await Promise.all([
      fetch("manifest.json", { cache: "no-cache" }).then((r) => r.json()),
      fetch("search-index.json", { cache: "no-cache" }).then((r) => r.json()),
    ]);
  } catch (err) {
    articleEl.innerHTML = '<p class="pdf-error">Failed to load digest index.</p>';
    return;
  }

  flatDays = [];
  for (const month of manifest.months) {
    for (const day of month.days) {
      flatDays.push({ ...day, month: month.month });
    }
  }

  buildMenu();
  searchEl.addEventListener("input", (e) => runSearch(e.target.value));
  window.addEventListener("hashchange", route);
  toggleEl.addEventListener("click", () => sidebarEl.classList.toggle("open"));
  route();
}

init();
