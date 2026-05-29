
You are running a daily arXiv recommendation routine in Anthropic's
cloud, against a clone of my arxiv-daily repo. Work in the cloned
repo's root; all paths below are relative to it unless absolute.

## CRITICAL: branch policy — read first

This routine uses ONE branch for everything: claude/digests

Do NOT create a new branch per run. Do NOT auto-generate a branch name.
Do NOT use a dated or random branch name. Every run commits to the
single persistent branch named exactly:

    claude/digests

The exact git commands to use are specified in Step 7. Follow them
literally. If you find yourself about to run `git checkout -b` with
any name other than `claude/digests`, stop — that is wrong.

## Environment

arxiv_pull.py uses only the Python standard library, so no installation
is needed. Invoke it as:

    python3 arxiv_pull.py [args]

## Files and directory layout

- arxiv_pull.py : my arXiv fetcher script (do not modify)
- interests/ : directory of interest files, named YYYY.MM.md
  (e.g., 2026.05.md). I maintain these manually — do not create,
  modify, or delete files in this directory.
- YYYY-MM/ : monthly output directory at the repo root (e.g., 2026-05/).
  Contains the daily digest .md files and a figures/ subdirectory.
- YYYY-MM/figures/{arxiv_id}/ : extracted figures for each recommended
  paper, organized by arXiv ID
- scratch/ : temporary working area for daily pulls. Everything in here
  is deleted at the end of each run.

The only persistent outputs of this routine are:
- the daily digest markdown files at YYYY-MM/YYYY-MM-DD.md
- the figures at YYYY-MM/figures/{arxiv_id}/...

Everything else gets cleaned up.

## How the fetcher works (read before running)

arxiv_pull.py is metadata-first. Useful flags:

- `--categories <cat1> <cat2> ...` : arXiv categories to search
- `--fields title authors abstract` : metadata fields in output JSON
- `--fields all` : every available metadata field
- `--fulltext tex` : also download .tar.gz LaTeX source for each paper
- `--fulltext none` : metadata only (default)
- `--ids <id1> <id2> ...` : fetch specific papers by arXiv ID; this mode
  ignores --days, --categories, --max-results
- `--out <dir>` : output directory (default ./arxiv_pull_<YYYY-MM-DD>)
- `--max-results N` : hard cap on number of papers
- `--page-size N` : results per API call

Output structure for any run:
  <out>/metadata.json           -- query info + paper list (selected fields)
  <out>/source/<id>.tar.gz      -- only when --fulltext tex was used

## Daily workflow

### Step 1: Read the current interest file

Determine the current month as YYYY.MM. Read interests/YYYY.MM.md.

If this month's file does not exist, fall back to the most recent
prior YYYY.MM.md in the interests/ directory and note the substitution
in the output summary. I maintain interest files manually, so a missing
file just means I haven't written one for this month yet — proceed
with the most recent prior file without complaint.

Parse the interest file to extract the arXiv categories I follow. The
interest file's categories section contains TWO groups:

  1. The full astro-ph family — I work in astronomy and want broad
     coverage across all astro-ph sub-categories, not just my
     specialty. These are:
       astro-ph.CO  (Cosmology and Nongalactic Astrophysics)
       astro-ph.EP  (Earth and Planetary Astrophysics)
       astro-ph.GA  (Astrophysics of Galaxies)
       astro-ph.HE  (High Energy Astrophysical Phenomena)
       astro-ph.IM  (Instrumentation and Methods for Astrophysics)
       astro-ph.SR  (Solar and Stellar Astrophysics)

  2. Additional non-astro-ph categories I've flagged in the interest
     file (e.g., cs.LG for ML-in-astronomy crossovers, gr-qc for
     gravitational waves, hep-ph for particle astrophysics, etc.).
     The set varies depending on what I'm working on.

The first-pass pull (Step 2) uses the UNION of these two groups. The
tiered filtering in Step 4 — not the category list — is what narrows
the digest down to my actual specialty plus useful adjacent and
groundbreaking work.

### Step 2: First-pass pull (metadata only)

Create scratch/pass1/. Build the categories list by combining:
- all six astro-ph sub-categories (always), AND
- any additional categories listed in interests/YYYY.MM.md.

Run:

    python3 arxiv_pull.py \
        --categories astro-ph.CO astro-ph.EP astro-ph.GA astro-ph.HE \
                     astro-ph.IM astro-ph.SR <any extras from interest file> \
        --fields title authors abstract primary_category categories \
        --fulltext none \
        --out scratch/pass1 \
        --max-results 500

Note the higher --max-results: a one-day pull across all of astro-ph
plus extras typically returns several hundred papers, well above the
default cap. 500 is a reasonable ceiling; raise it if you ever see the
pull hit the cap.

If --days 1 returns zero papers, it is likely a weekend or holiday
(arXiv does not post on weekends). In that case, retry with --days 2,
then --days 3, then --days 4, stopping as soon as you get a reasonable
batch of papers. Note in the summary which --days value you used and
why.

Read scratch/pass1/metadata.json. Filter against the interest file
using only title + abstract + authors + categories.

The candidate count target is bigger because the input pool is larger:
aim for ~25-40 candidates for deeper review. Be generous — exclude
only papers clearly off-topic. The tiers below welcome breadth, and
an all-astro-ph pull is the right level of breadth for catching
cross-subfield surprises.

When filtering, remember that a paper's primary_category tells you
the author's framing, but the full categories list tells you where
it might also matter. A galaxies paper cross-listed to astro-ph.IM
is often interesting for methods reasons even if galaxies isn't my
focus.

If the pull genuinely returns zero papers even after extending --days,
write a recommendation file noting "no new papers in target categories",
clean up scratch/, commit and push per Step 7, and exit cleanly.

### Step 3: Second-pass pull (full text for survivors)

Create scratch/pass2/. Run:

    python3 arxiv_pull.py \
        --ids <id1> <id2> ... \
        --fields all \
        --fulltext tex \
        --out scratch/pass2

For each candidate:
- Extract the tarball into a temp directory (use `tar -xzf`).
- Find the main .tex file (the one with \documentclass and
  \begin{document}; prefer main.tex / ms.tex / paper.tex if multiple).
- Read the abstract, intro, method, results, and conclusion. Skim
  the rest.

If a paper's source isn't a tarball (some authors upload PDF only;
arxiv_pull.py saves these as .pdf or .bin), fall back to the PDF URL
in metadata.json. If unreadable entirely, drop it and note this.

### Step 4: Final filter with tiered selection

Re-filter using full-text understanding. The output should fall into
these tiers; papers within a tier are not ordered relative to each
other:

  Tier 1 — Highly relevant
    Direct hits on my main research focus per the interest file.

  Tier 2 — Adjacent / useful context
    Astronomy work outside my main focus that's still useful — methods
    I might borrow, related sub-fields, foundational results that
    affect how I interpret my own. Because the first-pass pulls all
    of astro-ph, expect this tier to surface inter-subfield work
    routinely; that's the point.

  Tier 3 — Outside my area but notable
    Off-topic (often non-astronomy or far astronomy sub-fields), but
    a genuinely groundbreaking or surprising result worth knowing
    about as a scientist. Hold a high bar here.

  Tier 4 — Meta-research about the field
    Papers about the practice of research itself in or near my field:
    how AI is changing astronomy, hiring/training of PhDs, replication
    or methodology critiques, sociology of science, publication
    patterns, funding shifts, etc.

Selection rules:
- Total papers per day: minimum 5, maximum 20.
- DO NOT pad to hit 5 with weak papers. If genuine quality only yields
  3, return 3 and say so in the summary — explicitly note that the
  minimum was relaxed because nothing else met the bar.
- DO NOT force coverage of every tier. If nothing in Tier 3 or Tier 4
  is interesting, omit those sections entirely. A digest of all Tier 1
  is fine. A digest that's only Tier 2 + Tier 4 is fine.
- Quality over quantity always wins. Be honest and direct — your job
  is to save me time, not to fill a quota.

### Step 5: Extract figures

For each selected paper, work from its extracted LaTeX source directory:

- Identify up to 2 important figures. Look for \includegraphics
  references in Methods, Results, or central concept sections. Avoid
  title-page logos, decorative figures, or appendix-only figures.
- Copy them to YYYY-MM/figures/{arxiv_id}/
- Figures may be .pdf, .png, .jpg, or .eps. Copy as-is; do not convert.
- 0 figures is acceptable. Do not invent or substitute.

### Step 6: Write the recommendation file

Create YYYY-MM/YYYY-MM-DD.md (e.g., 2026-05/2026-05-25.md).

Header section:
- Date
- Interest file used (note if it was a fallback from a prior month)
- Counts: papers scanned, after first filter, final selected
- --days value used for the pull, if not 1
- Brief note if minimum of 5 was relaxed and why

Body: one section per tier that has any papers, in this order:
- ## Tier 1 — Highly relevant
- ## Tier 2 — Adjacent / useful context
- ## Tier 3 — Outside my area but notable
- ## Tier 4 — Meta-research

Skip a tier's section entirely if it has no papers.

For each paper:
- ### Title (with arXiv link via abs_url from metadata.json)
- Authors (first 3, then "et al." if more)
- Primary arXiv category (helps me see at a glance which sub-field
  this comes from, since the all-astro-ph pull spans many)
- 3-4 sentence summary of the actual contribution
- 1-2 sentences on why it's in this tier (especially important for
  Tiers 2-4, where the connection isn't obvious)
- Inline references to extracted figures using relative paths:
  ![](figures/{arxiv_id}/<filename>)

### Step 7: Clean up, then commit and push to claude/digests

First, delete the entire scratch/ directory and any temporary
extraction directories you created during Step 3. The only files that
should remain are the digest markdown and figures under YYYY-MM/.

Do NOT touch the interests/ directory under any circumstances. I
maintain those files manually.

Verify the cleanup with `ls scratch/` returning nothing.

Now commit and push. Use the SINGLE persistent branch claude/digests.
Run these commands EXACTLY, substituting the real date only in the
commit message:

    # Fetch the persistent branch if it already exists on the remote
    git fetch origin claude/digests 2>/dev/null || true

    # Check out claude/digests: track the remote version if it exists,
    # otherwise create it fresh from the current HEAD
    if git rev-parse --verify origin/claude/digests >/dev/null 2>&1; then
        git checkout -B claude/digests origin/claude/digests
    else
        git checkout -B claude/digests
    fi

    # Stage only the digest outputs (never scratch, never interests)
    git add YYYY-MM/*.md
    git add YYYY-MM/figures/

    # Commit and push to the same branch every time
    git commit -m "Daily digest <YYYY-MM-DD>"
    git push origin claude/digests

Rules for this step:
- The branch is ALWAYS claude/digests. Never any other name.
- Do NOT open a pull request. Commits accumulate on claude/digests and
  I review them there directly.
- If the push fails with a 403, the GitHub App lacks Contents: write
  permission — report this clearly in the summary and stop. Do not
  attempt to work around it by creating a differently-named branch.
- If the push fails because the remote branch advanced (non-fast-
  forward), run `git fetch origin claude/digests` then
  `git rebase origin/claude/digests` and push again. Do not force-push.

### Step 8: Print a summary to stdout

- Branch pushed to (should always be claude/digests)
- Counts at each filter stage and tier breakdown
- Path to the recommendation file
- Interest file used, and whether it was a fallback from a prior month
- Any errors, skipped papers, or quota deviations

## General guidelines

- The commit branch is ALWAYS claude/digests. This is not negotiable
  and overrides any instinct to create per-run branches.
- Quality over quantity, always. 10 honest picks beats 20 padded ones. But always recommend me with no less than 10 papers.
- Be direct in summaries. No hedging, no marketing language.
- Do not hallucinate paper IDs, authors, or summaries. metadata.json
  is the source of truth for what was actually fetched.
- Treat the interest file as authoritative for what I want; treat
  fetched papers as the input you're filtering with it.
- For tarball extraction use `tar -xzf`. If a "tarball" is actually a
  single gzipped file, use `gunzip` instead.
- The interests/ directory is read-only for this routine. Never create,
  edit, or delete files there.

