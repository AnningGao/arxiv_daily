#!/usr/bin/env python3
"""Build the static GitHub Pages site for the arXiv daily digests.

Stdlib only (matches the rest of the repo). Run from the repo root:

    python3 web/build.py [--out _site]

It scans the repo for daily digest files named YYYY-MM/YYYY-MM-DD.md, writes a
manifest and a search index, and assembles a self-contained `_site/` directory
that can be uploaded as a GitHub Pages artifact. Figures (.pdf/.png/...) are
copied as-is; nothing is converted.
"""

import argparse
import json
import re
import shutil
from pathlib import Path

# Repo root = parent of this script's directory (web/).
REPO_ROOT = Path(__file__).resolve().parent.parent
WEB_DIR = Path(__file__).resolve().parent

MONTH_DIR_RE = re.compile(r"^\d{4}-\d{2}$")
DIGEST_FILE_RE = re.compile(r"^(\d{4}-\d{2}-\d{2})\.md$")

# Static assets copied verbatim into the site root.
STATIC_FILES = ["index.html", "app.js", "style.css"]


def find_digests():
    """Return {month: [(date, Path), ...]} for every YYYY-MM/YYYY-MM-DD.md."""
    months = {}
    for month_dir in sorted(REPO_ROOT.iterdir()):
        if not month_dir.is_dir() or not MONTH_DIR_RE.match(month_dir.name):
            continue
        for md in sorted(month_dir.glob("*.md")):
            m = DIGEST_FILE_RE.match(md.name)
            if not m:
                continue
            months.setdefault(month_dir.name, []).append((m.group(1), md))
    return months


def first_heading(md_path):
    """Return the text of the first `# ` heading, or the date as a fallback."""
    for line in md_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line.startswith("# "):
            return line[2:].strip()
    return md_path.stem


def plain_text(markdown):
    """Reduce markdown to lowercased plain words for substring search."""
    text = markdown
    text = re.sub(r"!\[[^\]]*\]\([^)]*\)", " ", text)      # images
    text = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", text)   # links -> link text
    text = re.sub(r"[#*`>_~|]", " ", text)                 # markdown punctuation
    text = re.sub(r"\s+", " ", text)
    return text.strip().lower()


def build(out_dir):
    out = Path(out_dir)
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)

    months = find_digests()

    # manifest: months newest-first, days newest-first within each month.
    manifest_months = []
    search_index = []
    for month in sorted(months, reverse=True):
        days = sorted(months[month], key=lambda d: d[0], reverse=True)
        day_entries = []
        for date, md_path in days:
            rel = f"{month}/{date}.md"
            raw = md_path.read_text(encoding="utf-8")
            title = first_heading(md_path)
            day_entries.append({"date": date, "title": title, "path": rel})
            search_index.append({
                "date": date,
                "month": month,
                "title": title,
                "text": plain_text(raw),
            })
        manifest_months.append({"month": month, "days": day_entries})

    (out / "manifest.json").write_text(
        json.dumps({"months": manifest_months}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (out / "search-index.json").write_text(
        json.dumps(search_index, ensure_ascii=False),
        encoding="utf-8",
    )

    # Copy static front-end assets.
    for name in STATIC_FILES:
        shutil.copy2(WEB_DIR / name, out / name)

    # Copy each month directory (digests + figures) verbatim so relative
    # figure paths in the markdown resolve unchanged.
    total_days = 0
    for month in months:
        shutil.copytree(REPO_ROOT / month, out / month)
        total_days += len(months[month])

    print(f"Built {out}/ : {len(months)} months, {total_days} digests")
    for m in manifest_months:
        print(f"  {m['month']}: {len(m['days'])} day(s)")


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--out", default="_site", help="output directory (default: _site)")
    args = ap.parse_args()
    build(args.out)


if __name__ == "__main__":
    main()
