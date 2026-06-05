# arXiv Digest — {YYYY-MM-DD}

<!--
TEMPLATE NOTES (delete this comment block in the real digest):
- Structural reference for the daily digest. Follow it literally for
  ordering, headings, and per-paper fields. Fill every {placeholder}.
- Skip any tier section that has no papers — omit the heading entirely.
- Per-paper figures are OPTIONAL: 0-1 is normal, 2 is the hard cap.
  Only reference figures actually extracted to disk for this paper, and
  never extract a figure you won't reference (see Step 5/7).
  If a paper warrants no figure, add a closing italic note explaining
  why (see the Tier 4 example below).
- Authors: list the first 3, then "et al." if there are more. Add a
  parenthetical to flag interest-file high-value co-authors when useful.
- Link the title to abs_url from metadata.json — do not fabricate IDs.
- The relevance line is a plain paragraph (no bold "Why Tier N" label).
-->

**Interest file used:** interests/{YYYY.MM}.md {(current month) | (fallback — no {YYYY.MM}.md exists yet)}
**Categories pulled:** {comma-separated list, e.g. astro-ph.CO, astro-ph.EP, astro-ph.GA, astro-ph.HE, astro-ph.IM, astro-ph.SR, cs.LG, stat.ML, hep-ph}
**Papers scanned:** {N} ({breakdown, e.g. 88 astro-ph new/cross + 305 cs.LG/stat.ML/hep-ph})
**After first filter:** {M} candidates reviewed with full text
**Final selected:** {P} papers across {K} tiers

<!-- Optional italic caveat line; include only when relevant, else delete.
     Use for: minimum-of-5 relaxed and why, an empty tier and why, API
     fallbacks, papers dropped for unreadable source, rate-limit notes. -->
*Note: {caveat about this run, if any}.*

---

## Tier 1 — Highly relevant

### [{Paper Title}]({abs_url})

{Author 1}, {Author 2}, {Author 3} et al. {(optional: high-value co-author note)}
**Primary category:** {primary_category} {| also: secondary_category}

{3-4 sentence summary of the actual contribution: what they did, how, and
the headline result. Draw on the full-text reading from the second pass.}

{1-2 sentence relevance line. For Tier 1, make the direct hit on the main
research focus per the interest file explicit.}

![](figures/{arxiv_id}/{filename})

---

## Tier 2 — Adjacent / useful context

### [{Paper Title}]({abs_url})

{Author 1}, {Author 2}, {Author 3} et al.
**Primary category:** {primary_category} {| also: secondary_category}

{3-4 sentence summary of the actual contribution.}

{1-2 sentence relevance line making the non-obvious connection explicit —
which method might be borrowed, which adjacent sub-field, which foundational
result affects how the user interprets their own work.}

![](figures/{arxiv_id}/{filename})

---

## Tier 3 — Outside my area but notable

### [{Paper Title}]({abs_url})

{Author 1}, {Author 2}, {Author 3} et al.
**Primary category:** {primary_category} {| also: secondary_category}

{3-4 sentence summary of the actual contribution.}

{1-2 sentence relevance line. Hold a high bar — explain why this off-topic
result is genuinely groundbreaking or surprising enough to be worth knowing.}

![](figures/{arxiv_id}/{filename})

---

## Tier 4 — Meta-research about the field

### [{Paper Title}]({abs_url})

{Author 1}, {Author 2}, {Author 3} et al.
**Primary category:** {primary_category}

{3-4 sentence summary of the actual contribution.}

{1-2 sentence relevance line on why this meta-research about the practice
of the field is worth knowing — AI's effect on astronomy, training/hiring,
methodology critiques, sociology of science, publication/funding shifts.}

*No figures extracted for {arxiv_id} ({reason, e.g. conceptual perspective paper; only figure is a schematic}).*
