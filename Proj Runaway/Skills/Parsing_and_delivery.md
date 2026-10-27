# Parsing_and_delivery.md — Stage 1 Parsing & the Delivery-Folder Contract

> **What this file is.** Two ends of the run: the **Stage-1 parsing flow** (turning a
> raw brief into a structured, scoped research plan) and the **delivery-folder
> contract** (the exact files written incrementally, and how they're assembled into
> the final artifact). It interlocks with `API_Limit_Tuning.md` at the **input table
> (§1), tier routing (§2.3), persistence (§7), and synthesis (§4.4)** contracts, and
> hands `Selection_discovery.md` the resolved entity + vectors.
>
> **Domain-agnostic.** Entity, scope, and output shape are resolved per run; examples
> are labeled `e.g.`.

---

## 0. Prime Directive — capture intent once, persist everything

Stage 1 has one job: convert a free-text brief into a **complete, scoped plan**
(`run_config.json`) so every later stage operates on resolved data, not guesses.
Delivery has one job: ensure the **folder is always a valid, inspectable snapshot**
of work-so-far (the §0.2 "nothing behind cover" guarantee from the core file).

---

## 1. Stage-1 parsing flow

### 1.1 Capture + clarify (T1, §2.3 of core)
- Read the brief; produce **assumptions** and **cross-questions** for anything
  ambiguous (scope, geography, output shape, depth).
- Record clarification answers (and any user note) so the plan is reproducible.
- Fast, deterministic entity/scope extraction can run in **code/T3** first; only the
  judgment (assumptions, disambiguation) needs **T1**.

### 1.2 Resolve entity + scope
Resolve the **canonical entity and scope** that the §5 drift guard and Stage-2
queries will use. This is the single source of truth for "what counts as on-topic."

### 1.3 Decompose into research vectors
Emit vectors, each with a stable `id` (`vector_id`), `topic`, `description`,
`search_hints`, and `priority`. These `vector_id`s flow through discovery, extraction,
and **idempotent sectioned synthesis** (`API_Limit_Tuning.md` §4.4) — 1 vector ⇒ 1
synthesis section (prevents duplicate/extra sections).

### 1.4 Effort estimate (T1)
Emit `estimated_work = {sources_to_discover, pages_to_scrape, synthesis_passes}`
(core §3.2), scaled by `depth`.

### 1.5 Write `run_config.json`
Persist inputs (core §1) + resolved entity/scope + vectors + effort estimate. This
file is written **before any discovery** so a crash leaves a usable plan.

```json
{
  "session_id": "...",
  "query": "...",
  "depth": "standard",
  "output_spec": "docx",
  "entity": { "canonical": "...", "scope": "..." },
  "vectors": [ { "id": "v1", "topic": "...", "priority": "high", "search_hints": ["..."] } ],
  "effort_estimate": { "sources_to_discover": 12, "pages_to_scrape": 25, "synthesis_passes": 2 },
  "created_at": "..."
}
```

---

## 2. Stage-3 delivery flow (analyze → assemble)

- Extraction writes `extracted/<entity>.json` per entity **as completed** (core §7),
  guarded by the all-null check (core §4.3.1).
- Synthesis reads the extracted JSON and writes `final_output.md` **section by
  section per `vector_id`**, streamed and flushed (core §4.4), applying the
  **provenance rule** to contestable claims.
- Analytical outputs (graphs/tables) are either **extracted from sources** or
  **generated from the data**, saved under `/assets`, and referenced inline.
- Final artifact is readable and well-structured with **inline links** and a
  **Sources section** carrying each source's tier + rationale.

---

## 3. Regenerating outputs from saved research (recovery path)

Because everything is persisted incrementally, a finished or failed run can be
**re-synthesized from disk without re-scraping** (the saved-files → confirm-goal path):
1. Load `run_config.json` (goal, entity, vectors) and `extracted/<entity>.json`.
2. For each `vector_id` **not already present** in `final_output.md`, synthesize its
   section (core §4.4 idempotency) — settled vectors are skipped, never redone.
3. Re-run analytical/asset generation only for missing assets.
4. Update `run_log.jsonl` with estimate-vs-actual (feeds adaptive buffer, core §3.3).

---

## 4. Delivery-folder contract (full schema)

One folder per run. **Identical to `API_Limit_Tuning.md` §7** — repeated here as the
authoritative schema:
```
run_<id>/
  run_config.json          # Stage 1 plan: inputs + entity/scope + vectors + effort estimate
  scrape_queue.json        # ranked best-first BEFORE scraping (from Selection_discovery.md §5)
  sources.json             # one entry per URL touched (schema = core §8)
  raw_research.jsonl       # every scraped page, appended + flushed on arrival
  extracted/<entity>.json  # per-entity structured data, written as completed
  partial_report.md        # rewritten/extended at every checkpoint
  final_output.md          # built section-by-section, idempotent per vector_id (core §4.4)
  failures.jsonl           # every failure (url/task, tier, error, action) (core §4.5)
  run_log.jsonl            # {estimated_work, actual_work} per run (feeds core §3.3)
  /assets                  # generated/extracted graphs & images
  state.json               # resumability cursor (core §9)
```

**Field alignment (must match across all three files):**
- `vector_id` — created in Stage 1 (§1.3), carried through `scrape_queue.json`,
  `extracted/`, and `final_output.md` sections.
- `entity` — resolved in Stage 1 (§1.2); used by the §5 gate, the `extracted/<entity>.json`
  filename, and the `entity` column in the core §8 schema.
- `status` taxonomy — defined once in `API_Limit_Tuning.md` §8; used by both other files.

---

## 5. Per-Change Checklist
- [ ] `run_config.json` written **before** discovery; holds entity/scope + vectors + estimate.
- [ ] Each vector has a stable `vector_id`; 1 vector ⇒ 1 synthesis section.
- [ ] Delivery schema here matches `API_Limit_Tuning.md` §7 exactly.
- [ ] Recovery path re-synthesizes from disk with no re-scraping (idempotent).
- [ ] `/assets`, `failures.jsonl`, `run_log.jsonl` present; final artifact has inline links + Sources section.
- [ ] No all-or-nothing write anywhere (core §0.2 intact).