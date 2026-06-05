# arxiv_daily

Daily arXiv paper recommendations based on my research interests, curated by
Claude and published as a browsable website.

Each day a Claude Code routine pulls the latest arXiv listings across the
astro-ph family (plus a few flagged cross-categories), filters them against my
current interest file, reads the full text of the survivors, and writes a tiered
digest with short summaries and key figures. The digests are published to a
GitHub Pages site for easy reading.

## 📖 Read the digests

**Website:** https://anninggao.github.io/arxiv_daily/

- Browse by day from a menu **grouped by month**.
- **Search** across every digest (e.g. `DESI`, `Lyman-alpha`).
- Figures render in-browser — including **PDF figures**, via
  [pdf.js](https://mozilla.github.io/pdf.js/), with no conversion.
- LaTeX math renders via [KaTeX](https://katex.org/).

## How it works

A scheduled Claude Code routine runs the daily workflow defined in
[`instruction.md`](instruction.md):

1. Read the current month's interest file in [`interests/`](interests/).
2. First pass — pull metadata for all astro-ph (+ flagged extras) and filter on
   title/abstract.
3. Second pass — fetch full LaTeX source for the candidates and re-filter.
4. Select papers into four tiers (highly relevant → adjacent → notable →
   meta-research) and extract a figure or two where it helps.
5. Write the digest and commit to the `claude/digests` branch.

The fetcher [`arxiv_pull.py`](arxiv_pull.py) is standard-library-only, so the
routine needs no dependencies.

## Repository layout

| Path | What it is |
|------|-----------|
| `YYYY-MM/YYYY-MM-DD.md` | Daily digest files |
| `YYYY-MM/figures/{arxiv_id}/` | Figures referenced by the digests (`.pdf`, `.png`, …; never converted) |
| `interests/YYYY.MM.md` | My monthly interest files (maintained by hand) |
| `arxiv_pull.py` | arXiv metadata + full-text fetcher |
| `digest_template.md` | Canonical format for a daily digest |
| `instruction.md` | The routine Claude follows each day |
| `web/` | The static website (`build.py` + `index.html`/`app.js`/`style.css`) |
| `.github/workflows/pages.yml` | Builds and deploys the site to GitHub Pages |

## The website build

The site is a small client-side app. `web/build.py` (stdlib only) scans the
digest files, emits a `manifest.json` (menu, grouped by month) and a
`search-index.json`, and assembles a self-contained `_site/` directory with the
digests and figures copied verbatim. `marked`, `KaTeX`, and `pdf.js` are loaded
from a CDN at runtime.

Build and preview locally:

```bash
python3 web/build.py            # writes ./_site
python3 -m http.server -d _site 8000
# open http://localhost:8000
```

Deployment is automatic: every push to `claude/digests` runs
`.github/workflows/pages.yml`, which builds `_site/` and publishes it to GitHub
Pages.

### One-time GitHub setup

To enable auto-deploy from the `claude/digests` branch:

1. **Settings → Pages → Source** → **GitHub Actions**.
2. **Settings → Environments → `github-pages` → Deployment branches** → add
   `claude/digests` (Pages restricts deploys to the default branch otherwise).
