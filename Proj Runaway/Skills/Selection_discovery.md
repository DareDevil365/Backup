# Selection_discovery.md — Stage 2: Source Discovery, Ranking & Quality

> **What this file is.** The Stage-2 contract: turning the Stage-1 brief into
> **scoped queries**, harvesting candidate sources, **scoring and ranking** them,
> applying the **entity/scope gate** before they reach extraction, and emitting the
> **saturation signal** that ends a run. It interlocks with `API_Limit_Tuning.md`
> at the **tier (§2.3), budget (§3), validation (§4.3/§5), and persistence (§7)**
> contracts, and feeds `Parsing_and_delivery.md` Stage 3 the ranked `scrape_queue.json`.
>
> **Domain-agnostic.** All examples are labeled `e.g.` and drawn from mixed domains;
> entity and scope are resolved per run, never hardcoded.

---

## 0. Prime Directive — best-first, scoped, saturating

Discovery exists to feed Stage 3 a **ranked, best-first queue of in-scope sources**,
and to **stop itself** the moment new sources stop adding information. It must never:
- emit unscoped queries that return homepages/generic pages,
- let off-entity/off-scope pages reach extraction,
- keep discovering past the point of corroboration saturation (§4).

The queue is written **before** scraping (`scrape_queue.json`, `API_Limit_Tuning.md` §7)
so that if Stage 3 is cut short, the highest-value sources were already done.

---

## 1. From brief to scoped queries (T1, §2.3 of core)

1. **Resolve canonical entity + scope** from the Stage-1 brief (the same entity used
   by the §5 drift guard). This is per-run data.
2. **Decompose into research vectors** — distinct sub-topics/questions, each with an
   `id` (the `vector_id` used for idempotent synthesis, `API_Limit_Tuning.md` §4.4).
3. **Generate scoped queries per vector.** Every query must carry the entity and/or
   scope terms so search returns specific pages, not top-level homepages
   (*e.g.* include the specific product/event/organization + the facet sought,
   not just the bare topic word).
4. Scale fan-out by `depth`: surface ≈ 3–5 queries/vector; deep ≈ 20+ (mirrors core §3.2).

---

## 2. Harvesting candidates (code / T3)

- Run queries; collect `{url, title, snippet, source_type, vector_id}` per result.
- **Deduplicate** by normalized URL and by near-duplicate title/snippet (code, no LLM).
- Capture cheap authority signals at harvest time (§3.1) — no model call needed yet.
- Mechanical work only; no judgment spent here.

---

## 3. Scoring & ranking

### 3.1 Authority tiers (cheap signal, assigned at harvest)
Assign each source a tier + numeric `authority_score`. Suggested ladder
(adapt per domain — the *bands* are universal, the *examples* are illustrative):

| Tier | Typical sources (e.g.) | Posture |
|---|---|---|
| **TIER_1** | Primary/official records, regulator/standards bodies | Highest trust |
| **TIER_2** | Government, sector bodies, entity-owned sources | High |
| **TIER_3** | Peer-reviewed / specialist institutions | High |
| **TIER_4** | Established data aggregators / reference DBs | Medium-high |
| **TIER_5** | Quality journalism & expert content | Medium |
| **TIER_6** | General web & forums | Low (corroboration only) |

> A high authority tier does **not** override the §4.3/§5 scope gate: an official
> homepage that isn't the resolved entity is still `NOT_APPLICABLE`.

### 3.2 Intent weighting (T2, batched — borderline only)
- Clearly-relevant and clearly-irrelevant sources are decided by **code/cheap signals**.
- Only the **ambiguous middle band** goes to a batched **T2** judgment call
  (`API_Limit_Tuning.md` §2.3) — keep premium quota for synthesis.

### 3.3 Final rank
`rank = f(authority_score, intent_weight, vector_coverage_need)`. Sources covering
under-served vectors get a coverage boost so no vector is starved.

---

## 4. Saturation signal (the real reason a run ends)

This is the **primary stop condition** referenced by `API_Limit_Tuning.md` §3.4.
- Track, per vector, the **new-information rate**: how much each newly scraped source
  adds versus what's already extracted (new entities/fields/claims, not new prose).
- When the trailing new-information rate for a vector drops below a `depth`-scaled
  threshold (corroboration without novelty), **mark the vector saturated** and stop
  queuing more sources for it.
- When all vectors are saturated (or the soft ceiling in core §3.4 is hit with a
  justified note), discovery ends. Duration is a *consequence*, never a target.

---

## 5. Output contract (to Stage 3)

Write `scrape_queue.json` **best-first** before scraping begins:
```json
[
  { "url": "...", "title": "...", "snippet": "...",
    "source_type": "web", "vector_id": "v1",
    "score": 84, "tier": "TIER_2", "label": "..." }
]
```
- Ordered by §3.3 rank so a cut-short run still did the best sources.
- Every entry carries its `vector_id` so extraction and synthesis stay aligned.
- The gate (`API_Limit_Tuning.md` §4.3/§5) runs **per page at fetch time**, not here —
  discovery ranks; the gate rejects. Both record decisions to `sources.json` (§8 core).

---

## 6. Per-Change Checklist
- [ ] Entity + scope resolved per run; queries are **scoped** (no bare-topic queries).
- [ ] Every source carries a `vector_id`; vectors map 1:1 to synthesis sections.
- [ ] Authority tiering is cheap/code; only middle-band scoring uses T2 (batched).
- [ ] Ranked `scrape_queue.json` written **before** scraping (best-first).
- [ ] Saturation signal implemented and feeds core §3.4 (primary stop condition).
- [ ] High authority never bypasses the §4.3/§5 scope gate.