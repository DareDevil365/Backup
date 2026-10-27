# Tab Organizer Extension — Implementation Plan

This is a genuinely large product (tab manager + HTML exporter + time tracker + personal knowledge base + RAG assistant). The plan below breaks it into buildable phases so you have something working early and add intelligence on top, rather than trying to build everything at once.

---

## 1. Reality Check on Architecture First

A few constraints shape everything else:

- **Manifest V3 service workers are ephemeral.** They unload after ~30s idle and can't run heavy compute (embeddings, GraphRAG, LLM calls) reliably in-browser. You need a **local companion app** (a small Python backend running on `localhost`) that the extension talks to over HTTP/WebSocket. This is the single most important architectural decision — it turns your "extension" into an **extension + local server + database** system.
- **Chrome-only first.** `chrome.tabGroups` API (tab groups) is Chrome/Edge-only — Firefox has no equivalent yet. Build for Chrome/Edge (Manifest V3) and treat Firefox as a possible future port.
- **Free & Local AI first.** All AI operations use free-tier hosted APIs (**Google Gemini or Groq, no credit card required**) with local **Ollama** as an offline fallback. AI is treated as a surgical tool: used only for topic classification and conversational brain/synthesis, while all data parsing, dedup, and metadata extraction remains deterministic.
- **Embeddings run locally on CPU.** Embeddings use local `sentence-transformers` (`all-MiniLM-L6-v2`) via CPU, eliminating API quota usage on every tab save.

### Recommended stack

| Layer | Choice | Why |
|---|---|---|
| Extension | Manifest V3, vanilla TS (popup) + React (Vite dashboard) | Lightweight popup, rich SPA dashboard |
| Local backend | Python 3.11+ + FastAPI | Async, SQLite integration, unified AI provider interface |
| Database | SQLite (with aiosqlite + SQLAlchemy) | Zero-config, 100% local-first data ownership |
| Vector store / Search | Local SQLite vector embeddings (`sentence-transformers` CPU cosine similarity) | Fast, runs locally, zero API dependency |
| Classification (bulk) | Rule-based heuristics + Batch Gemini / Groq / Ollama | Fast, reliable JSON parsing with auto-retry and fallback |
| Brain (chat/planning) | Gemini / Groq free tier or Ollama + RAG context | Conversational synthesis, structured learning path generator |
| Screenshots | `chrome.tabs.captureVisibleTab` | Built-in, no extra permission drama |
| Metadata/thumbnails | OpenGraph scraping (`og:image`, `og:title`) via content script or backend fetch | Same trick YouTube-style previews use |
| Charts | Chart.js or Recharts, rendered in the extension's dashboard page | Lightweight, responsive visualizations |

---

## 2. Data Model

```
pages
  id (pk)
  url_original
  url_normalized       -- unique constraint, strip tracking params
  title
  description
  favicon_url
  og_image_url
  domain              -- e.g. youtube.com
  category            -- e.g. "AI 101", "academics" (user-defined folder)
  topic               -- e.g. "design", "math", "programming" (AI-classified)
  content_summary     -- short AI-generated summary, used for RAG
  screenshot_path     -- optional local capture
  is_important        -- bool, for reminders
  is_urgent           -- bool
  created_at, updated_at
  last_seen_open_at   -- for dedup / "still open" tracking

tab_groups
  id (pk)
  chrome_group_id     -- ephemeral, only valid per-session
  name
  color
  saved_html_export_path

page_group_links (many-to-many: a page can belong to multiple saved groups)

activity_log
  id, page_id, domain, topic, started_at, ended_at, duration_seconds

embeddings
  page_id (fk), vector_bytes / vector_json, model_name, created_at

reminders
  id, page_id, note, remind_on_next_open (bool), snooze_until (datetime), is_fired (bool), created_at, fired_at
```

Dedup key: normalized URL (strip `utm_*`, `?si=`, trailing slashes, tracking parameters).

---

## 3. Phased Build Plan

### Phase 0 — Scaffolding
- Manifest V3 skeleton: `manifest.json`, background service worker, popup, options/dashboard page.
- Permissions: `tabs`, `tabGroups`, `storage`, `notifications`, `alarms`, `scripting`, `activeTab`, host permissions for `<all_urls>` (needed for content-script metadata scraping).
- FastAPI backend skeleton + SQLite running on `127.0.0.1:8742`, with `/health` endpoint.
- Extension ↔ backend communication via `fetch()` to localhost.

### Phase 1 — Core Tab Capture + HTML Export (MVP)
1. Read all tabs via `chrome.tabs.query({})` and all groups via `chrome.tabGroups.query({})`.
2. Popup UI: list groups + "All Tabs", checkboxes to select which to export.
3. For each selected tab: capture `title`, `url`, `favIconUrl`, `og:image`/`og:title`/`og:description`.
4. Generate a **single self-contained HTML file**: YouTube-style card grid + search/filter bar + embedded JSON blob of all page data + dark/light mode toggle. Zero CDN dependencies.
5. "Open all" button: opens each link in sequence or inside extension library view.
6. Trigger download via `chrome.downloads.download()`.

### Phase 2 — Database, Save/Update Logic, Dedup
1. Upsert into `pages` table with `url_normalized` unique constraint.
2. Update-in-place for existing URLs.
3. Duplicate tab detection in open windows with notification warnings.

### Phase 3 — Classification: Topic + Website
1. **Website categorization**: normalized domain mapping (e.g. `m.youtube.com` → `YouTube`).
2. **Topic classification**: Batch classifier job using Gemini / Groq / Ollama with taxonomy validation and fallback.

### Phase 4 — Time Tracking & Weekly Digest
1. Background worker listens to `chrome.tabs.onActivated` and `chrome.windows.onFocusChanged`.
2. Compute elapsed active time, exclude idle periods (`chrome.idle`).
3. Store in `activity_log`.
4. Dashboard charts & `/api/activity/digest` for weekly summaries by domain and topic.

### Phase 5 — Library / Save-to-Folder
1. One-click save to folder from popup or context menu.
2. Extension Dashboard Library view with folder tree and search.
3. Screenshot capture attached to saved items.

### Phase 6 — The "Brain" (RAG Assistant & Learning Path Generator)
1. Generate local `sentence-transformers` embeddings on CPU.
2. Semantic similarity search over saved library.
3. Chat synthesis via free-tier LLMs (Gemini / Groq / Ollama) with blended library + optional web context.
4. **Learning Path Generator** (`/api/brain/learning-plan`): Sequenced curriculum creation from saved pages.

### Phase 7 — Knowledge Graph, Reminders & Tab Snoozing
1. **Knowledge Graph**: Map relationships across pages, topics, domains, and categories.
2. **Reminders & Flags**: Mark important/urgent tabs, notify on next browser startup.
3. **Tab Snoozing**: Snooze tabs until a specific date/time, automatically reopen or alert via `chrome.alarms`.

### Phase 8 — Polish & Data Portability
1. **Backup & Restore**: Full JSON / database export and import endpoints (`/api/backup/export`, `/api/backup/import`).
2. Settings configuration for AI providers, rate limits, and taxonomy.
3. Graceful offline degradation when backend is unreachable.

---

## 4. Suggested Build Order

1. Phase 1 (HTML export) — immediate daily value.
2. Phase 2 (DB + dedup) — cumulative persistence.
3. Phase 5 (Library) — core knowledge repository.
4. Phase 4 (Time tracking & weekly digest) — passive activity logging.
5. Phase 3 (Topic classification) — automated organization.
6. Phase 6 (Brain + Learning paths) — conversational intelligence.
7. Phase 7 (Graph + Snooze/Reminders) — discovery and tab lifecycle.
8. Phase 8 (Backup/Restore & Polish) — privacy and data ownership.
