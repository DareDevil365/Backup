# DESIGN.md — Tab Export Visual Design Spec (v2)

This replaces the loose guidance in the implementation plan's Appendix A. It exists because the first real export came out looking broken, not stylish: generic globe-icon placeholders where thumbnails failed, a meaningless "General" tag on every card, a useless single-domain filter chip, and no real visual polish. Every rule below exists to prevent one of those specific problems. Build to this exactly — don't improvise on top of it.

---

## 0. What Went Wrong (reference — fix these specifically)

| Problem seen | Root cause | Fix (see sections below) |
|---|---|---|
| Blue globe icon on ~40% of cards | No real fallback chain — generic browser-icon-style placeholder used instead of something branded/intentional | §3.3 Fallback chain — generate a branded placeholder, never a generic icon |
| Every card says "General" | A default category value is being rendered even when it carries no information | §3.4 Only render a tag if it's meaningful |
| "www.youtube.com (16)" as a filter chip next to "All (16)" | Domain chips generated unconditionally, even when there's only one domain in the export | §2.2 Only show domain filters when there are 2+ distinct domains |
| Description text looks like it's about to overflow the card in the bottom row | No enforced line-clamp / overflow rule, or it's not applied consistently | §3.2 Clamp is mandatory, not optional |
| Overall flat, low-contrast, uneven card heights | No consistent spacing scale or card structure | §1 Design tokens, §3 Card anatomy |

---

## 1. Design Tokens (define these once, use everywhere — no ad-hoc values in component CSS)

### Color — dark theme (primary, since this is where most usage happens)
```css
:root[data-theme="dark"] {
  --bg: #0b0b0d;
  --surface: #16161a;        /* card background */
  --surface-hover: #1e1e24;
  --border: #2a2a30;
  --text-primary: #f2f2f3;
  --text-secondary: #9a9aa3; /* descriptions, meta text */
  --text-tertiary: #6b6b74;  /* least important labels */
  --accent: #6366f1;         /* buttons, active chip, links */
  --accent-hover: #7678f2;
  --success: #22c55e;
  --danger: #ef4444;
}
```

### Color — light theme
```css
:root[data-theme="light"] {
  --bg: #fafafa;
  --surface: #ffffff;
  --surface-hover: #f3f3f5;
  --border: #e5e5ea;
  --text-primary: #18181b;
  --text-secondary: #6b6b74;
  --text-tertiary: #9a9aa3;
  --accent: #4f46e5;
  --accent-hover: #4338ca;
  --success: #16a34a;
  --danger: #dc2626;
}
```
Both themes share the same variable names — toggling is just swapping the `data-theme` attribute, never a separate stylesheet.

### Typography scale
```css
--font-family: -apple-system, "Segoe UI", Roboto, sans-serif;
--text-xs:   12px;  /* meta row: domain, topic pill */
--text-sm:   13px;  /* descriptions */
--text-base: 15px;  /* card titles */
--text-lg:   18px;  /* section headers */
--text-xl:   22px;  /* page title in header */
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-bold: 600;
```

### Spacing scale (use only these values — no arbitrary 7px/13px paddings)
```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
```

### Radii & shadows
```css
--radius-md: 10px;   /* cards, buttons */
--radius-full: 999px; /* chips, pills */
--shadow-hover: 0 8px 24px rgba(0,0,0,0.25);
```

---

## 2. Layout

### 2.1 Structure (top to bottom)
```
┌──────────────────────────────────────────────────────────────┐
│ Header: title + count · search bar · Open All · Theme toggle   │
├──────────────────────────────────────────────────────────────┤
│ Filter row (conditional — see 2.2)                              │
├──────────────────────────────────────────────────────────────┤
│ Grid of cards                                                    │
├──────────────────────────────────────────────────────────────┤
│ Footer: generated date · offline notice                         │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 Filter row — render conditionally, not unconditionally
This is the exact bug from the screenshot. Rules, checked in this order:
- **If the export spans 2+ tab groups:** show one chip per group + "All". This is the primary, most useful grouping.
- **Domain chips are opt-in, not default.** Only generate a domain filter dropdown (not chips) if there are **3 or more distinct domains** in the export. If everything is one or two domains, skip domain filtering entirely — it adds visual noise for zero benefit, exactly as seen with the lone "www.youtube.com (16)" chip.
- **Topic chips**, once classification has run, follow the same rule: only show if 2+ distinct topics exist among the exported pages.
- If none of the above conditions are met (single group, single/near-single domain, no topics yet), **render no filter row at all** — just the header and grid. An empty or redundant filter row is worse than no filter row.

### 2.3 Grid
```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-5);
  padding: var(--space-6);
}
@media (max-width: 480px) {
  .grid { grid-template-columns: 1fr; padding: var(--space-4); gap: var(--space-4); }
}
```

---

## 3. Card Anatomy (the component that most needs fixing)

```
┌─────────────────────────────────┐
│                                    │
│         thumbnail (16:9)            │  ← always this exact ratio, never variable height
│                                    │
├───┬───────────────────────────────┤
│ 🔘│ Title — bold, max 2 lines        │
│   │ Description — 2 lines, muted     │
│   │ domain.com  ·  [topic pill]?      │  ← topic pill only if classified AND meaningful
└───┴───────────────────────────────┘
```

### 3.1 Fixed structure — no variable-height cards
```css
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: var(--text-primary);
  transition: transform .15s ease, box-shadow .15s ease, background .15s ease;
}
.card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-hover);
  background: var(--surface-hover);
}
.card:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.thumb-wrap {
  aspect-ratio: 16 / 9;
  width: 100%;
  background: var(--border);   /* visible while loading, and as the base for the fallback tile */
  overflow: hidden;
}
.thumb-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; }
```

### 3.2 Text clamping is mandatory, not optional — this was silently missing/inconsistent before
```css
.card-body { padding: var(--space-3) var(--space-4); display: flex; flex-direction: column; gap: var(--space-1); flex: 1; }
.card-title {
  font-size: var(--text-base); font-weight: var(--font-weight-bold);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden; line-height: 1.35;
}
.card-desc {
  font-size: var(--text-sm); color: var(--text-secondary);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden; line-height: 1.4;
}
.card-meta {
  margin-top: auto; padding-top: var(--space-2);
  font-size: var(--text-xs); color: var(--text-tertiary);
  display: flex; align-items: center; gap: var(--space-2);
}
```
`margin-top: auto` on `.card-meta` pins it to the bottom regardless of how much title/description text renders above it — this is what keeps card heights visually even in a row even when one title wraps to 2 lines and another to 1.

### 3.3 Thumbnail fallback chain — replaces the generic globe icon entirely
Never show a generic browser-style icon. Try, in order, and **precompute all of this at export time** (no network calls when the file is reopened):
1. `og:image` fetched from the live tab at save time.
2. First reasonably-sized `<img>` on the page (`naturalWidth > 200`).
3. **Generated branded placeholder** (this replaces the globe icon): a solid-color tile where the color is deterministically derived from the domain name (hash the domain string to a hue, fixed saturation/lightness so it stays readable in both themes), with the site's favicon centered on it at ~40% of the tile's height, and the domain name as tiny text beneath the favicon. This looks intentional rather than broken, and two cards from the same domain get the same placeholder color, which reads as consistent rather than random.
```
Example generated placeholder for a YouTube link with no image:
┌─────────────────────┐
│                       │
│        ▶ (favicon)     │   ← on a solid warm-red tile (hashed from "youtube.com")
│      youtube.com       │
│                       │
└─────────────────────┘
```
4. Absolute last resort (favicon itself failed to fetch too): a flat tile in `var(--border)` with just the domain name centered in `var(--text-tertiary)` — still branded-feeling via typography, never an unrelated icon like a globe.

### 3.4 Meta row — only show what's actually informative
- **Domain:** always show — it's always meaningful.
- **Topic pill:** only render if `topic` is set **and** is not a placeholder/default value. If classification hasn't run yet, show nothing in that slot — don't show "General," "Uncategorized," "Other," or any default. An absent tag reads as "not yet classified"; a present-but-meaningless tag reads as broken.
```css
.topic-pill {
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--accent) 18%, transparent);
  color: var(--accent);
  font-size: 11px; font-weight: var(--font-weight-medium);
}
```
- If you want a category shown too (user folder, not AI topic), separate it visually from the topic pill (different color/style) so folder and AI-topic are never visually conflated.

---

## 4. Header & Controls

```css
header {
  position: sticky; top: 0; z-index: 10;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  padding: var(--space-4) var(--space-6);
  display: flex; align-items: center; gap: var(--space-4);
}
.header-title { font-size: var(--text-xl); font-weight: var(--font-weight-bold); display:flex; align-items:center; gap: var(--space-2); }
.header-title .count-badge {
  font-size: var(--text-xs); background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-full); padding: 2px var(--space-2); color: var(--text-secondary);
}
.search-bar {
  flex: 1; max-width: 480px; padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md); border: 1px solid var(--border);
  background: var(--surface); color: var(--text-primary); font-size: var(--text-sm);
}
.btn-primary {
  background: var(--accent); color: white; border: none;
  padding: var(--space-3) var(--space-5); border-radius: var(--radius-full);
  font-weight: var(--font-weight-medium); cursor: pointer;
}
.btn-primary:hover { background: var(--accent-hover); }
.btn-secondary {
  background: transparent; border: 1px solid var(--border); color: var(--text-primary);
  padding: var(--space-3) var(--space-4); border-radius: var(--radius-full); cursor: pointer;
}
```
"Open All" always reflects the **currently filtered/visible** count in its label (e.g. "Open All (5)" after filtering down from 16) — never a stale total.

## 5. Filter Chips (when actually shown — see §2.2)
```css
.filter-row { display: flex; gap: var(--space-2); padding: 0 var(--space-6) var(--space-4); flex-wrap: wrap; }
.chip {
  padding: var(--space-2) var(--space-4); border-radius: var(--radius-full);
  border: 1px solid var(--border); background: var(--surface); color: var(--text-secondary);
  font-size: var(--text-sm); cursor: pointer;
}
.chip.active { background: var(--accent); border-color: var(--accent); color: white; }
```

## 6. Footer
```css
footer {
  text-align: center; padding: var(--space-6);
  color: var(--text-tertiary); font-size: var(--text-xs);
  border-top: 1px solid var(--border);
}
```
Content: `Generated {date} · {count} links · Works fully offline, no tracking` — this was entirely missing before; it's a small trust signal that the file is self-contained.

## 7. Empty States
- Zero search results: centered message, not a blank grid — `"No links match '{query}'"` in `--text-secondary`, with a "Clear search" text-button beneath it.
- Never leave a genuinely empty grid with no explanation.

---

## 8. Checklist Before Calling an Export "Done"
- [ ] No card ever shows a generic/unbranded fallback icon — every missing-image case hits the generated placeholder tile.
- [ ] No card shows a meaningless default tag ("General," "Uncategorized," "Other") — absence of data means absence of the tag.
- [ ] Filter row only appears when it would actually filter something (2+ groups, or 3+ domains, or 2+ topics) — never a single redundant chip next to "All."
- [ ] Every title and every description is clamped to 2 lines with `-webkit-line-clamp`, no exceptions, no overflow bleeding past the card edge.
- [ ] Card heights look even across a row regardless of text length, via `margin-top: auto` on the meta row.
- [ ] "Open All" label always matches the currently visible/filtered count.
- [ ] Footer present with generation date and an offline/no-tracking note.
- [ ] Tested with zero images available for any card (fallback chain only) and confirmed it still looks intentional, not broken.
