# SKILL: Tab Organizer Extension — Project Conventions

Use this file as persistent context at the start of every coding session (alongside `idea.md` and `tab-organizer-implementation-plan.md`). It captures the decisions already made so an agentic session doesn't re-litigate them or drift from the architecture.

## What this project is
A Chrome/Edge Manifest V3 extension + local Python backend that: exports tabs/groups to self-contained HTML files, tracks time by domain/topic, builds a personal saved-page library, and answers questions about that library using local AI. Full context: `idea.md` (vision) and `tab-organizer-implementation-plan.md` (architecture + phases).

## Hard constraints — do not violate these without being asked
1. **No paid APIs.** AI runs through **free-tier hosted APIs (Gemini or Groq, no credit card required)**, with **Ollama as a local offline fallback**. Never add billing/a credit card to the Gemini or Groq account, and never introduce a metered-billing provider (Anthropic, OpenAI paid tier, etc.) unless explicitly asked. All three providers (Gemini/Groq/Ollama) sit behind one internal interface selected via `AI_PROVIDER` in `.env`.
2. **AI touches only two things:** topic classification and the "brain" (chat/RAG/planning). Everything else — thumbnail/title/description extraction, HTML generation, grouping, deduplication — must be plain deterministic code. If you find yourself reaching for an LLM call to solve a parsing/formatting problem, stop and write a regular function instead.
3. **Embeddings always run locally** (`sentence-transformers`, CPU), regardless of which AI provider is configured for classification/chat — they run too frequently (every save) to spend free-tier request quota on.
4. **Local-first data.** No cloud sync, no external database, no telemetry beyond the AI provider calls themselves. SQLite file on disk is the source of truth.
5. **Dedup is enforced at the database layer** (unique constraint on `url_normalized`), never only in application code.
6. **Backend binds to `127.0.0.1` only**, never `0.0.0.0`.
7. **Never commit secrets.** `.env` (with the Gemini/Groq free API key) is gitignored.
8. **Handle rate limits, not bills.** Free-tier providers reject requests over quota (HTTP 429) rather than charging — build retry/backoff and resumable batch jobs around this, and fall back to Ollama automatically if a free tier is exhausted or unreachable.

## Build order (don't skip ahead)
Follow `tab-organizer-implementation-plan.md`'s phase order: HTML export → dedup/DB → Library → time tracking → classification → brain → graph/reminders → polish. Each phase should be independently testable before starting the next. Don't build Phase 5 UI on top of a Phase 3 data model that hasn't landed yet.

## Code conventions
- **Extension:** TypeScript, Vite bundler. React only in the dashboard SPA — keep the popup lightweight/vanilla since it unloads on close and shouldn't hold state.
- **Backend:** Python 3.11+, FastAPI, SQLAlchemy models + Alembic migrations (every schema change gets a migration, no manual `ALTER TABLE`). Pydantic schemas for all request/response bodies — no raw dicts across the API boundary.
- **Naming:** `url_normalized` is the dedup key everywhere — never compare on `url_original`.
- **Testing:** every phase adds tests for its core logic before being considered done:
  - URL normalization → dedicated test suite (YouTube, Amazon, generic tracking params).
  - HTML export template → renders valid output for 0/1/many pages.
  - Classification JSON parsing → handles malformed/truncated model output without crashing.
  - Dedup → duplicate save attempts never create two rows, including the "user dismisses duplicate warning and saves anyway" path.
- **Commits:** one phase (or a clearly-scoped sub-task within a phase) per commit. Don't bundle unrelated phases into one diff — each commit should leave the extension in a loadable, testable state.

## Things that commonly go wrong — check for these
- Background service workers (MV3) unload on idle — never rely on in-memory state surviving between events. Persist to `chrome.storage` or the backend immediately.
- OpenGraph scraping fails on a meaningful fraction of sites — always have the fallback chain (`og:image` → first content `<img>` → favicon → generic placeholder), and never let a missing thumbnail break the card layout.
- Local LLM output (if the Ollama fallback is active) is less reliably well-formatted JSON than hosted Gemini/Groq — always validate + retry-once + fall back to a safe default (e.g. `topic = "other"`) rather than crashing a batch job on one bad response, regardless of which provider is active.
- Scraped titles/descriptions are untrusted input — sanitize (`bleach`/DOMPurify) before rendering in the exported HTML or dashboard. This is a real stored-XSS risk if skipped.
- Cache `og:image` locally rather than hot-linking — exported HTML files should keep working even if the source page changes or disappears later.

## When context is ambiguous
If a request conflicts with a constraint above (e.g. "just use the Claude/OpenAI paid API for this" when a free-tier Gemini/Groq or local Ollama call would do), flag the tension and default to the constraint rather than silently overriding it — this project's whole point is local-first and free-to-run.
