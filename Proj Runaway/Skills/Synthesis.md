# Synthesis.md — Authoritative Synthesis Stage (Stage 3)

> **Scope.** This file owns the *entire* synthesis stage: reading settled
> per-vector data from disk, deduping, grading thin sections, the versioned
> emit-now/improve-later hybrid, provenance, and the **no-API fallback
> assembler**. It reads only from the run folder defined by the persistence
> contract in `API_Limit_Tuning.md §7`. It never re-scrapes and never re-runs
> discovery itself — it hands thin vectors back to `Selection_discovery.md`
> (Stage 2) for that.

---

## 0. Prime Directive

**Always leave the user with a deliverable.** A run that completed even one
vector must be able to produce *some* report file. There are three output
tiers (best → floor); the floor (`§7`) requires **zero** API calls so a fully
exhausted run is never empty-handed.

| Tier | Produced by | When |
|---|---|---|
| `final_report_v2.md` | AI synthesis, re-queue improved thin vectors | spare budget |
| `final_report_v1.md` | AI synthesis, first pass | Strong/Mid reachable |
| `final_report_fallback.md` | **deterministic script, no API** (`§7`) | all cells exhausted |

---

## 1. Input Contract

- Read **only** from `run_<id>/extracted/<vector_id>.json` (per-vector payloads
  written by Stage 2) plus `state.json` and `sources.json`.
- **Never re-scrape and never call discovery from here.** A crashed run resumes
  synthesis straight from disk.
- If `extracted/` is missing a vector that `state.json` lists as settled, treat
  it as `EMPTY` (`§3`), do not error out.

---

## 2. Section Model + Dedupe

- **One vector = one section.** Group all payloads by `vector_id`.
- When a `vector_id` appears more than once (e.g. the same topic ran several
  times, some `FAILED` and some `SUCCESS`), **keep the single richest
  successful payload** and discard the rest. "Richest" = most non-null leaf
  fields, tie-broken by most recent timestamp.
- Flush each section to `partial_report.md` **as it completes**, so a dying call
  loses at most one in-flight section, never the whole run.

---

## 3. Thin-Section Policy (grading)

Grade every section before emitting:

| Grade | Test | Render |
|---|---|---|
| `RICH` | multiple populated fields / corroborated | full prose section |
| `LOW_COVERAGE` | only 1–2 thin fields, lone factoid | render + visible `⚠️ï¸ low coverage` flag |
| `EMPTY` | payload `null` / all leaves null | one-line honest placeholder, **no fabrication** |
| `NOT_APPLICABLE` | wrong entity/geo/model (Stage 2 verdict) | one-line note, excluded from re-queue |

Never fabricate a stub to fill an `EMPTY` section.

---

## 4. The Versioned Hybrid (emit-now / improve-later)

### 4.1 First pass (always completes)
Synthesize every section from the best on-disk payload, flushing each to
`partial_report.md` as it finishes, then assemble and **close
`final_report_v1.md`**. Thin sections ship flagged (`§3`). If quota dies here,
a complete, honest report still exists.

### 4.2 Ordering rule (the survival guarantee)
**`final_report_v1.md` is fully written and closed before any re-queue starts.**
This makes "the initial one also stays" structural, not hopeful.

### 4.3 Re-queue (budget-gated)
- Only `LOW_COVERAGE` vectors are eligible (never `EMPTY`/`NOT_APPLICABLE`).
- Hand each back to `Selection_discovery.md`'s saturation check.
- Capped at **one** extra pass per vector so it cannot loop.
- Runs only if spare quota exists after the Strong-synthesis reservation
  (`API_Limit_Tuning.md §3.2`).

### 4.4 Second pass
Emit **exactly one** `final_report_v2.md` after the re-queue settles — and
**none** if nothing improved. Reuse unchanged sections from disk so v2 is cheap.
Never overwrite v1.

---

## 5. Provenance

Grounding-sourced near-future / recent claims (e.g. the 2026 events in run
data) are attributed as *"per sources"* rather than asserted as fact. Keep
source attribution per section from `sources.json`.

---

## 6. Budget & Reliability

Reuse — do not redefine — the contracts in `API_Limit_Tuning.md`:
Reuse — do not redefine — the contracts in `API_Limit_Tuning.md`:
- ~40% Strong-tier reservation for synthesis (§3.2).
- 120s Strong synthesis timeout (§4.1).
- Streaming so partial output survives a mid-stream death (§4.2).

---

## No Placeholder Shipping

A synthesis failure is not report content.

The following strings must never appear in final output as section body text:

• "Failed to synthesize section"
• "All Gemini API keys are completely exhausted"
• "Insufficient data captured for this vector"
• "No data found for vector"
• "504 DEADLINE_EXCEEDED"
• "null"
• raw JSON-only dumps

If the AI synthesis fails but extracted JSON exists, run deterministic fallback
assembly from extracted data.

If extracted JSON is also empty, emit a short gap note:

Insufficient usable data was captured for this section.

Do not mark a vector as RICH, complete, or usable if its only body text is
a placeholder/error/fallback notice.

A vector is renderable only if it has at least one of:

• non-empty structured data with useful fields;
• a non-placeholder synthesized paragraph;
• a useful table row/list derived from extracted JSON.

If a vector has sources but no useful extracted data, it is not renderable.
Sources alone are not findings.

---

## 7. No-API Fallback Assembler  ← NEW

### 7.1 Purpose
When **every** `(key × model)` cell needed for synthesis is `cooling_down` or
`exhausted_today`, run a **deterministic, zero-inference** script that
structures the on-disk JSON into a deliverable, clearly stamped as
judgment tasks never degrade to a weak model — by doing **no inference at all**.

### 7.2 Trigger condition
Fire **only** when synthesis confirms all required-tier cells are unavailable
(the genuine dead-end that `API_Limit_Tuning.md §6` routes to
checkpoint-and-wait). The assembler runs *at* that checkpoint so the user has
something during the wait for daily reset. It can also be run manually against
any run folder.

### 7.3 Deterministic render rules
Same input contract as `§1` (reads `extracted/<vector_id>.json`, never
re-scrapes):
1. **Dedupe by `vector_id`**, keep richest successful payload (same rule as `§2`).
2. **Render each section** as headings + bullet lists straight from JSON keys —
   no prose generation, just faithful structuring.
3. **Apply the status taxonomy** (`§3`): `SUCCESS`/`PARTIAL` render data;
   `LOW_COVERAGE` gets ⚠️ï¸; `EMPTY`/`NOT_APPLICABLE`/`FAILED` get a one-line
   placeholder.
4. **Stamp an unmissable header banner** (see `§7.5`).

### 7.4 Ordering / non-destruction
- Writes its own filename `final_report_fallback.md` — **never** overwrites
  `v1`/`v2`.
- When quota resets and AI synthesis later runs, `v1`/`v2` are produced
  alongside; the fallback **stays on disk permanently** as an audit record
  (consistent with the "nothing gets overwritten or lost" versioning rule).

### 7.5 Header banner (verbatim shape)
```
⚠️ï¸ MECHANICALLY ASSEMBLED — NO AI SYNTHESIS.
Generated because all API quota cells were exhausted.
Completed N/M vectors. Re-run after quota reset for the AI report.
```

### 7.6 Marking the run incomplete (`state.json`)
The assembler writes machine-readable incompleteness so resume logic can act on
it (schema/template in **`fallback_state.template.json`**):
```json
{
  "synthesis_mode": "fallback_no_api",
  "completed_vectors": 8,
  "total_vectors": 13,
  "upgradeable": ["v6", "v7", "v8"],
  "status": "incomplete_fallback"
}
```
On next reset, resume logic sees `incomplete_fallback`, skips settled vectors,
runs real AI synthesis only over what's left, and reuses on-disk fallback
sections for free where nothing changed.

### 7.7 Referenced files (this folder relies on them)
| File | Role |
|---|---|
| **`fallback_synth.py`** | the deterministic assembler `§7` invokes (or run manually) |
| **`fallback_state.template.json`** | canonical shape of the `state.json` fields `§7.6` writes |

Both live in the run-tooling directory and are called by this stage; they are
kept separate so the script can be unit-tested and run by hand against any
`run_<id>/` folder without loading the orchestrator.

---

## 8. Cross-File Contracts

- `vector_id` — shared key across all four files.
- `status` taxonomy — defined in `API_Limit_Tuning.md §8`, consumed here in
  `§3` and `§7.3`.
- Delivery schema / output format — `Parsing_and_delivery.md`.
- Persistence / run folder — `API_Limit_Tuning.md §7`.

## 8. Presentation Layer (deterministic, multi-format)

> **Scope.** This stage owns *presentation quality only* — formatting, visuals,
> source tables, coverage dashboards, and the final `output_format` artifact. It
> is the third deterministic tier, a **post-processor** that runs *after* §1–6
> (AI synthesis) or §7 (no-API fallback). It does **no** model inference and
> **never** re-scrapes — same two contracts as §7. Implemented by the standalone
> script **`present.py`**, which §8.7 names explicitly.

### 8.1 When it runs
Always runs as the **last step**, regardless of which body was produced:
- after `final_report_v2.md` (best case),
- after `final_report_v1.md`,
- after `final_report_fallback.md` (§7 path),
- or even after only `partial_report.md` exists (crash recovery).

It is the only stage that turns the run into the artifact named in
`run_config.output_format` (your `b5f7fcfe` run asked for `docx` and never
reached it — that gap is what §8 closes).

### 8.2 Inputs (read-only, from the run folder)
```
run_<id>/
  run_config.json          # output_format, query (title)
  state.json               # synthesis_mode, vector_status (coverage source of truth)
  extracted/<vector_id>.json  # promoted to visuals
  sources.json             # deduped + junk-flagged for the sources table
  final_report_v2.md | v1 | fallback | partial   # body precedence (§8.3)
```

### 8.3 Body precedence
Pick the richest existing markdown as the prose body, in order:
`v2 → v1 → fallback → partial`. Never regenerate prose; never overwrite any of
these. Output files are **new** (`report.*`) so the audit trail stays intact.

### 8.4 Promote structured JSON to visuals
Walk each `extracted/<vector_id>.json` and auto-detect (thresholds in
`present_config.json`, §8.7):
- **Timeline** — a list of ≥2 objects carrying a date/year + event/description
  (e.g. `US_Iran_Regional_Rivalry`: 1953 → 1979 → 2026).
- **Table** — a list of ≥2 flat dicts sharing 2–8 keys (e.g. proxy-group rows).
- **Bar chart** — a dict of ≥3 numeric values (e.g. India trade volumes by year).
Anything that doesn't match a shape stays as faithful bullets. With `--no-charts`,
bar charts degrade to tables (zero image dependencies).

### 8.5 Coverage dashboard + sources
- **Dashboard:** header table of N/M vectors with `RICH` / `PARTIAL` /
  `LOW_COVERAGE` / `EMPTY` badges. Defers to `state.json.vector_status` when
  present; else grades by leaf-count. Keeps incompleteness **honest and visible**.
- **Sources:** dedupe `sources.json` by URL, group by `vector_id`, show
  `tier`/`status`, and push **off-topic junk** (dictionary pages, building-permit
  portal) to the bottom with a ⚠️ marker — the same drift the §5 entity guard
  targets.

### 8.6 Banner preservation
If the body was `final_report_fallback.md` *or* `state.json.synthesis_mode ==
"fallback_no_api"`, re-stamp the **"⚠️ï¸ MECHANICALLY ASSEMBLED"** banner across
every output format. Presentation polish must never disguise a degraded run.

### 8.7 Files this stage refers to
| File | Role |
|---|---|
| `present.py` | The renderer. Multi-format: HTML (charts inlined base64), DOCX (python-docx), PDF (reportlab primary, pandoc fallback). |
| `present_config.json` | Tunables: visual-detection thresholds, format defaults, junk-domain list, badge labels. Edited without touching code. |
| `report_template.html` | Jinja2 skeleton for the HTML render (dashboard + body + visuals + sources). DOCX/PDF derive from the same model. |

### 8.8 Invocation
```
python present.py /path/to/run_<id>                  # formats from run_config, else all
python present.py /path/to/run_<id> --formats docx,html,pdf
python present.py /path/to/run_<id> --no-charts      # tables instead of PNGs
```

### 8.9 Per-change checklist
- [ ] No model calls in the presentation path.
- [ ] Reads only from disk; writes only `report.*` (never overwrites v1/v2/fallback).
- [ ] PDF degrades reportlab→pandoc; charts degrade →tables; never hard-fails.
- [ ] Fallback banner survives into every format.
- [ ] Coverage dashboard defers to `state.json` when present.

---

## No Placeholder Shipping

Placeholders such as "Failed to synthesize section" or "All Gemini API keys are completely exhausted" must never appear in the final output as section body text.

A vector is considered **RICH** when it has a threshold of useful, verified facts/extracted data and successfully synthesized prose. It is considered **low coverage** or **unrenderable** if it contains error text, all-null records, placeholder strings, or fallback/empty messages. Unrenderable/low coverage vectors must be collapsed into coverage gaps rather than presented as empty sections or placeholder text.

### Renderability Gate

A vector is not renderable just because it has sources.

A vector is renderable only if it has at least one of:
* a non-placeholder synthesized paragraph;
* structured extracted data with real non-null values;
* a usable table/list of real entities/tools/items;
* source-backed facts that are directly relevant to the vector topic.

The following must force status = EMPTY or INSUFFICIENT, never RICH:
* all values are null;
* body contains "Failed to synthesize section";
* body contains "All Gemini API keys are completely exhausted";
* body contains "Insufficient data captured";
* only source URLs exist;
* sources are unrelated to the vector topic;
* sources are dictionaries, privacy pages, login pages, or unrelated company pages.

A section with failed AI synthesis may still be recovered from extracted/*.json. If extracted JSON has useful rows, present those rows. If not, collapse the section into a one-line coverage gap.

This directly prevents "7/7 RICH" when the body is actually failed text.

## Final Renderer Authority

The final user artifact must always be produced by `present.py`.

`doc_generator.py` must not render raw synthesis/fallback payloads directly for research sessions.
If `doc_generator.py` remains in the codebase, it may only accept a filtered presentable payload.

Order:
1. AI synthesis or `fallback_synth.py`
2. `presentation_filter.build_presentable()`
3. `present.py`
4. `report.xlsx` / `docx` / `html` / `pdf`
