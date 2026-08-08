# Agentic Orchestration — Mark & Usage

The mark is a letter **A** crossing in front of a circular **arrow**. The arrow is the orchestration loop — it has direction and an opening, so it reads as motion around the agent rather than a container holding it. The A's legs pass over the sweep at the bottom, with the arc cut away at each crossing so the letter is unambiguously in front.

Weights: arc 14, letter 16 (relative), rendered at arc 21 / letter 24 on a 256 grid.

---

## Before you deploy this — one flag

**The mark resembles the anarchy symbol (Ⓐ).** A capital A inside a circle is that symbol's exact construction. This mark differs in three ways — the circle is an open arrow with a head, the A's legs break the circle at the bottom rather than the crossbar breaking it at the sides, and the sweep has a wide gap — but the family resemblance is strong at small sizes and in single-colour use, and it is strongest in the circular avatar, where the disc closes the silhouette back up.

This matters more than usual for this product. Government, defence, and financial-services procurement are the stated target verticals, and they are the least tolerant buyers of an accidental political signal.

Three options were rendered alongside the chosen geometry and are reproducible from `build_logo.py` by changing the arc angles and apex height:

| Option | Change | Effect |
|---|---|---|
| **Open sweep** | Arc shortened to ~220°, larger head | The ring stops reading as a ring |
| **Apex breaks out** | A's apex extends above the arc | The A is no longer contained — kills the circle-A gestalt |
| **Both** | Combined | Furthest from Ⓐ, least like the original sketch |

The files in this directory are the geometry as chosen. Changing course is a parameter edit, not a redraw.

---

## Files

| File | Use |
|---|---|
| `ao-mark.svg` | Primary mark. `currentColor` — inherits text colour |
| `ao-mark-small.svg` | Below ~32px. Lower crossbar (wider counter), wider crossing gaps, stubbier head |
| `ao-logo-horizontal.svg` | Mark + two-line wordmark. Default for site headers and README |
| `ao-logo-stacked.svg` | Centred, for square-ish spaces |
| `ao-avatar.svg` | Solid disc, mark reversed out. For GitHub org, social profiles, anywhere with a round crop |
| `favicon.svg` | Small-size drawing, explicit colour, switches tint under `prefers-color-scheme: dark` |
| `favicon.ico` | 16/32/48 multi-size |
| `favicon-16/32/48.png`, `icon-512.png`, `apple-touch-icon-180.png`, `avatar-512.png` | Raster set |

### Derived tints (for `<img>` embeds)

Standalone `currentColor` marks render black as images. These copies set a root `color` for fixed tints:

| File | Tint |
|---|---|
| `*-steel.svg` | `#3B6EA5` — READMEs, light surfaces |
| `*-on-dark.svg` | `#E6EAF0` — dark headers / chat / docs |

Prefer CSS `mask` + `background-color` (Admin sidebar) when the UI can inherit theme colour.

The wordmark is **Geist outlines, converted to paths** — instantiated from the variable font at weight 600 (AGENTIC) and 500 (ORCHESTRATION). No font dependency at render time. Matches the admin UI's typeface.

`build_logo.py` regenerates everything. Geometry constants are at the top.

---

## Colour

| Role | Value |
|---|---|
| Primary (steel) | `#3B6EA5` |
| Reversed / on dark | `#E6EAF0` |
| Paper (avatar knockout, icon backgrounds) | `#0F1319` |
| Dark-scheme favicon tint | `#7FA8D4` |

The mark is monochrome by design. It must survive in one colour — never apply gradients, and never colour the arrow differently from the letter. Doing so breaks the front/back reading that the crossing gaps establish.

---

## Clear space and minimum size

**Clear space:** the height of the A's crossbar on all sides. Nothing intrudes — no text, no rules, no container edges.

**Minimum sizes:**
- Mark alone: **20px**. Below 32px switch to `ao-mark-small.svg`.
- Horizontal lockup: **120px** wide. Below that use the mark alone.
- Stacked lockup: **80px** wide.

At arc 14 / letter 16 the two strokes are close in weight, so the front/back reading rests entirely on the two crossing gaps. Those gaps are the first thing to close up when the mark is scaled down or reversed out of a dark background — which is why the small-size file is a different drawing, not a scaled one. Check any new application at actual size before shipping it.

---

## Don't

- Don't recolour the arrow and letter separately.
- Don't close the arc into a full circle.
- Don't remove the crossing gaps — without them the mark reads as a tangle.
- Don't scale the primary mark below 32px; use the small file.
- Don't set the wordmark in a substitute typeface. Use the supplied outlines.
- Don't place the primary mark in a round crop. Use `ao-avatar.svg`.
- Don't reintroduce the previous raster brain logo anywhere.

---

## Known rough edges

Two things a designer should tighten before this is treated as final:

1. **Wordmark spacing** is set from font advance widths with uniform tracking. Real optical kerning has not been done — `AG`, `TI`, and `RA` will want individual attention, and the two lines' tracking should be balanced by eye rather than by number.
2. **Horizontal lockup alignment** places the wordmark against the mark's bounding box. The optical relationship — where the cap height sits against the arc — deserves a manual pass.

Both are refinements to the lockups, not to the mark.
