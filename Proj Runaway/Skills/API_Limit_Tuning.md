# API_Limit_Tuning.md — Orchestration Core (Universal AI Scraper-cum-Researcher)

> **What this file is.** The master orchestration contract for a domain-agnostic
> 3-stage research tool: **Stage 1 parse** → **Stage 2 discover** (`Selection_discovery.md`)
> → **Stage 3 scrape → analyze → deliver** (`Parsing_and_delivery.md`). This file
> owns: key/model management, task→tier routing, quota behavior, effort-driven
> completion, timeouts, incremental persistence, and final synthesis. The three
> files interlock at the **budget, tier, and persistence contracts** defined here.
>
> **Domain-agnostic by design.** Nothing here is tuned to any subject. The tool
> resolves the **canonical entity and scope per run from the brief**; all examples
> below are clearly-labeled `e.g.` illustrations drawn from mixed domains and are
> never read by code.

---

## 0. Prime Directives

### 0.1 Complete the work, not a clock
**Run until the work is done, saturated, or clearly not worth continuing — not
until a clock runs out.** Time is a *consequence* of the work, never a constraint.
There is no `T_total`, no wall-clock pacing. The system runs as fast as quota
allows, sleeps exactly as long as a real `429` cooldown demands, and stops on
**completion**, **saturation**, or a **justified effort ceiling** (§3.4). The only
fixed times anywhere are the **per-call/per-job timeouts** in §4.1.

### 0.2 Nothing behind cover (incremental persistence)
The deliverable folder is built **incrementally, as a side effect of work** —
never assembled in memory and written as a final step. If the program dies at
*any* instant, the folder already contains everything completed to that instant.
- Every scraped page → appended to `raw_research.jsonl` **immediately**, `flush()` per write.
- Synthesized report → written **section by section** as each completes (§4.4).
- Sources ledger → updated on every accept/reject decision.
- This kills the worst observed bug: *"it ran, took all the time, but the returned
  file was empty."* There is **no all-or-nothing final write** anywhere.

---

## 1. Inputs (Stage 1)

Captured once into `run_config.json`:

| Field | Meaning |
|---|---|
| `query` | The research brief (free text). |
| `depth` | `surface` \| `standard` \| `deep` — scales fan-out & saturation thresholds. |
| `output_spec` | Desired final artifact (report / table / sheet schema). |
| `api_keys[]` | Available Gemini keys (e.g. **3 keys**). |
| `buffer_pct` | Padding over the effort estimate for local slowness. Default **+40%**. |

> **No duration field.** Duration is *estimated* (§3) and *capped* (§3.4), never input.

---

## 2. Keys & Models

### 2.1 Cell rotation — register all keys up-front, LRU selection
- Treat every `(key × model)` as a **quota cell**. **Register all keys at startup**
  so none sit idle (fixes "3 keys but 2 never used").
- Select the **least-recently-used available cell within the needed tier** — this
  spreads load evenly instead of hammering one key.
- Track per-cell state: `available | cooling_down(until=ts) | exhausted_today`.
- On `429`/quota error: mark **that cell** cooling-down for *exactly* the API-reported
  cooldown, rotate to the next available cell, **do not** sleep the whole pipeline.
- A single task **may split across multiple keys** when that improves throughput.

### 2.2 Model tiers
| Tier | Use for | Cost posture |
|---|---|---|
| **Strong (T1)** | Query generation, source-intent classification, entity validation, final synthesis | Spend freely but bounded |
| **Mid (T2)** | Structured extraction from a confirmed-good page; borderline source scoring | Moderate |
| **Cheap (T3)** | Bulk scraping/cleanup, soft-404 detection, dedupe, summarization | Capped — never escalate to Strong |

**Downgrade ladder:** Strong → Mid → Cheap for *non-judgment* tasks under quota
pressure. **Judgment tasks never downgrade below Mid** — if Mid is exhausted across
all keys, checkpoint and wait for reset (§9) rather than produce low-quality
routing/synthesis on Cheap.

### 2.3 Task → tier routing (by complexity, not convenience)
| Task | Tier | Why |
|------|------|-----|
| Assumption generation, cross-questioning | **T1** | Judgment-heavy |
| Search-prompt + query fan-out | **T1** | Judgment-heavy; must emit *scoped* queries (§4.3) |
| Effort estimate | **T1** | Reasoning over the brief |
| Entity validation / drift guard | **T1** | Judgment (§5) |
| Final synthesis | **T1** | Irreplaceable step (§3.1, §4.4) |
| Structured extraction from good page | **T2** | Moderate |
| Ambiguous-source scoring (middle band) | **T2**, batched | Borderline calls only |
| Page summarization | **T3** | Volume work |
| Boilerplate stripping / text extraction | **code, no LLM** | Deterministic |
| Result harvesting / dedupe | **code/T3** | Mechanical |

---

## 3. Effort Estimation & Budgeting (replaces all time-pacing)

### 3.1 Quota budget (ratios, not times)
- Reserve **~40% of T1 (Strong) daily capacity for final synthesis** before
  spending the rest on discovery/extraction. Never arrive at synthesis quota-starved.
- Discovery + scraping draw from the remaining ~60%; scraping is tier-capped (§2.3)
  so it mostly spends cheap quota anyway.

### 3.2 Effort estimate (Stage 1, T1)
Emit workload in **units of work**, not minutes:
```
estimated_work = { sources_to_discover: N, pages_to_scrape: M, synthesis_passes: K }
```
Scaled by `depth`: surface ≈ 3–5 queries / ~10 pages; deep ≈ 20+ queries / 60+ pages.

### 3.3 Buffer — adaptive, with fixed fallback
- **First run / no history:** fixed **+40%** over the estimate.
- **Thereafter:** read `run_log.jsonl` (estimate-vs-actual of past runs); set the
  buffer to the trailing ratio, clamped to `[+20%, +80%]`. Each finished run appends
  `{estimated_work, actual_work}` so the buffer self-corrects.

### 3.4 Soft effort ceiling + diminishing returns (the "not 10 hrs" guard)
- **Soft ceiling:** when `actual_work > estimated_work × (1 + buffer)`, do **not**
  charge on blindly: checkpoint, write the partial result, emit a *"still going,
  here's why"* note (e.g. "found 3× more relevant sources than estimated"), and
  continue only if the reason is legitimate. A long run is always a *justified* run.
- **Diminishing-returns cutoff:** stop discovering/scraping once new pages stop
  adding new information (corroboration saturates). This is the *primary* stop
  condition — it caps duration more meaningfully than any clock. See
  `Selection_discovery.md` §4 for the saturation signal.

### 3.5 Phases keyed to work completion
```
parse → discover (Stage 2) → scrape + extract → synthesis
```
Each phase starts when the **prior phase completes**, not at a % of a timer.

---

## 4. Reliability

### 4.1 Timeouts (the ONLY fixed times)
Tied to **tier + task**, never to run length:

| Job type | Hard timeout | On expiry |
|---|---|---|
| Static page fetch | 20s | mark thin, escalate to rendered fetch |
| Rendered/headless fetch | 45s | abandon page, log fail, move on |
| Cheap extraction/summarization call | 30–60s | retry once, then reroute tier |
| Mid extraction call | 60s | retry once on another cell, then degrade |
| Strong synthesis call | 120s | retry once on another cell, then degrade |

A hung call is the real enemy. **Kill it, register the failure, reroute** — the run
never stalls waiting on one stuck request.

### 4.2 Streaming
Stream T1 synthesis so partial output is captured even if the call dies mid-stream.

### 4.3 Soft-404 + scope gate (cheap, BEFORE extraction)
Catch junk **before** it consumes extraction budget — *e.g.* a run that scraped 64
pages but only ~22 actually carried the target field type. The **root cause is
usually unscoped query generation** (§2.3): queries must include the resolved entity
and scope, or search returns homepages/generic pages. Reject before extraction:
- HTTP 404 / "Page not found" / placeholder shells (`SOFT_404`).
- Title/entity mismatch (see §5).
- Generic/off-entity pages (*e.g.* a top-level homepage, a dictionary definition
  page, an unrelated portal) — these are not the resolved entity.

```python
def validate_before_extract(page, run_entity, run_scope):
    if is_soft_404(page):                 return reject("SOFT_404")
    if not entity_matches(page, run_entity): return reject("NOT_APPLICABLE")
    if out_of_scope(page, run_scope):     return reject("NOT_APPLICABLE")
    return accept()
```

### 4.3.1 All-null guard
If extraction returns an object whose values are **all null/empty**, treat it as a
failed extraction (`PARTIAL` or `NO_PUBLIC_DATA` per §8), **never** as success.
This prevents `{ "field_a": null, "field_b": null, ... }` from being logged as data.

### 4.4 Sectioned, idempotent synthesis
- Synthesize and write **one section per `vector_id`/topic**, streamed and
  **`flush()`ed to disk per section** — so a 504 at the end never loses completed
  sections and never restarts from zero.
- **Idempotent by `vector_id`:** a section already written is skipped on resume.
  This also prevents the "13 sections emitted for 8 vectors" duplication.
- **Provenance rule:** when extracted material asserts a contestable real-world
  claim, synthesis must **attribute and flag** it (e.g. "per scraped sources …,
  unverified") rather than state it as established fact.

### 4.5 Failure registration
Every failure is recorded to `failures.jsonl` (`url/task, tier, error, action_taken`)
so partial fails never silently hinder the run, and a retry pass can target exactly
what failed.

---

## 5. Entity Validation (drift guard)

Before any page enters extraction (T1, §2.3). **The rule is abstract; resolve the
entity/scope from *this* brief — never hardcoded:**
1. **Resolve the canonical entity/scope for the run** from the brief
   (*e.g.* a specific company and its official domain; a specific event vs. a broad
   place; a specific product line).
2. **Reject pages belonging to a different entity** (*e.g.* a same-name but different
   organization, a translation/dictionary page, a generic country/topic page).
3. **Reject wrong-geography / wrong-scope / wrong-business-model** matches when the
   brief is specific (*e.g.* a tourism page when the brief seeks logistics; a
   geography-limited provider when the brief is global; B2B-only when seeking retail)
   — record as `NOT_APPLICABLE` with the reason.

The gate logic is constant across domains; only the entity it checks against is
per-run data.

---

## 6. Quota Behavior (no wall-clock pacing)
- **Throttle only on real cooldowns.** No `target_pace = calls / T_total`.
- On `429`: sleep *only* the affected cell for *exactly* its reported cooldown,
  rotate to the next available cell, keep working.
- **Daily reset awareness:** if a worthwhile run exhausts daily quota across all keys
  for a needed tier, **checkpoint and resume at the next reset** (§9) — the natural
  multi-day path, triggered by work, not by a setting.

---

## 7. Persistence (write-as-you-go; survive any crash)

One run folder, written incrementally:
```
run_<id>/
  run_config.json          # Stage 1 inputs + effort estimate
  scrape_queue.json        # ranked best-first BEFORE scraping (from Stage 2)
  sources.json             # one entry per URL touched (schema §8)
  raw_research.jsonl       # every scraped page, appended + flushed on arrival
  extracted/<entity>.json  # per-entity structured data, written as completed
  partial_report.md        # rewritten/extended at every checkpoint
  final_output.md          # built section-by-section (§4.4)
  failures.jsonl           # every failure (§4.5)
  run_log.jsonl            # estimate-vs-actual per run (feeds §3.3)
  /assets                  # generated/extracted graphs & images
  state.json               # resumability cursor (§9)
```
**Persist partial files even on failure.** A crash at any point leaves a valid,
inspectable folder with everything done so far.

---

## 8. Source Log Schema (per URL)

Every URL touched gets an entry (preserve timestamps; add decision fields):
```
entity, url, title, priority, authority_score, domain, tier,
scrape_success, had_data, status, error_type, decision, timestamp
```

`status` taxonomy:

| status | meaning |
|---|---|
| `SUCCESS` | usable data extracted |
| `PARTIAL` | some fields found, others missing |
| `NO_PUBLIC_DATA` | real entity, but data is login/quote-gated publicly |
| `LOGIN_GATED` | requires login to view |
| `NOT_APPLICABLE` | wrong entity/geo/scope/business-model |
| `SOFT_404` | page resolved but is a 404/placeholder |
| `FAILED_RETRYABLE` | timeout/transient — eligible for one retry |
| `FAILED` | exhausted retries |

---

## 8.5 Presentation Boundary: Useful Output Only

The run folder may contain raw scrape logs, source dumps, intermediate extracted JSON, coverage metadata, debug figures, and fallback states. These are internal artifacts. They must not be rendered directly to the user.

Before any DOCX/PDF/HTML/XLSX is created, the system must build a presentable payload that contains only:

• Executive summary, if real and non-placeholder.
• Useful findings extracted from successful vectors.
• Human-readable tables derived from structured extracted data.
• Coverage/gap notes, only when needed.
• One deduplicated source list at the end.

The presenter must never render:

• Raw sources_log.csv dumps.
• Per-vector Sources (v1), Sources (v2) debug tables.
• Figures (vN) metadata tables such as pages scraped, success, timestamp.
• Raw grounding redirect URLs unless no canonical URL/domain is available.
• Placeholder synthesis failures such as All Gemini API keys are exhausted.
• Empty vectors as full sections.
• Jinja template text such as {{ title }} or {% for row in coverage %}.

If a section contains no useful extracted data, it must be collapsed into a short coverage gap note, not rendered as a full report section.

Rendering order:

1. Title / metadata
2. Completion state / warning banner
3. Executive summary
4. Useful tables / findings
5. Coverage gaps, if any
6. Clean source list

The presenter is an allowlist renderer. Anything not explicitly allowed is omitted.

---

## 9. Resumability

`state.json` holds a cursor: which entities are done, which URLs remain, which cells
are cooling. On restart (manual or post-reset):
1. Reload the folder, skip anything already `SUCCESS`/`NO_PUBLIC_DATA`/`NOT_APPLICABLE`.
2. **Never re-scrape** a settled URL.
3. Skip any `final_output.md` section already written for a `vector_id` (§4.4).
4. Continue from the queue head.

---

## 10. Per-Change Checklist

- [ ] No new wall-clock pacing / T_total snuck in.
- [ ] All keys registered up-front; LRU cell selection (§2.1).
- [ ] Every task assigned a tier (§2.3); judgment tasks Strong/Mid only; scraping capped to Cheap.
- [ ] Query generation emits **scoped** queries (§4.3).
- [ ] Soft-404 + entity validation run **before** extraction (§4.3, §5); all-null guard (§4.3.1).
- [ ] Synthesis sectioned, streamed, idempotent per `vector_id`, with provenance rule (§4.4).
- [ ] No all-or-nothing write; partial files flushed at every checkpoint (§0.2).
- [ ] Synthesis quota reserve preserved (§3.1); effort ceiling + saturation cutoff present (§3.4).
- [ ] Every URL produces a log entry with `status` + `decision` (§8); failures registered (§4.5).