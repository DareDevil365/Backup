# Idea: Tab Organizer + Personal Knowledge Brain (Browser Extension)

## The Problem
Browser tabs are where information goes to die. Dozens of tabs stay open "for later," tab groups pile up, duplicates accumulate, and there's no record of what you actually spent your time on or learned. Bookmarks are flat and unsearchable. Nothing connects "the 20 tabs I have open about AI" into something usable later.

## The Core Idea
A browser extension that treats your open tabs as **raw material for a personal, searchable knowledge library** — not just a list to close and forget. It should let you:

1. **Snapshot tabs/groups into a real artifact** — a polished, offline, self-contained HTML file (styled like a YouTube homepage: thumbnail, title, description, click-to-open) instead of just leaving tabs open or dumping URLs in a bookmarks folder.
2. **Track where your time actually goes** — passively log time per site/topic, with minimal setup, and turn it into readable charts.
3. **Build a permanent library** — one click saves a page/video/screenshot into a named folder ("AI 101," "video editing notes," "academics"), deduplicated automatically.
4. **Think with your saved knowledge** — ask it things like "what have I saved about AI?" and get an answer that combines your own library with live web knowledge, plus generated plans ("give me a learning path through these 15 things I saved").
5. **Never lose an important thing** — flag a tab as important/urgent before closing it, and get reminded the next time the browser opens.
6. **Stay clean automatically** — duplicate tab detection, deduplicated storage, and auto-categorization so the library organizes itself instead of becoming its own mess.

## Guiding Principles
- **Local-first.** Your data (tabs, library, activity logs, embeddings) lives on your machine in a local database, not someone else's cloud. Privacy and full ownership of your own browsing history/knowledge base is a feature, not an afterthought.
- **AI is a scalpel, not a hammer.** Only the two things that genuinely need judgment — topic classification and the conversational "brain" — call an AI API. Everything else (thumbnails, titles, descriptions, HTML generation, grouping, dedup) is plain deterministic code running on your own machine. This keeps it fast, cheap, and mostly usable even offline.
- **The exported HTML should have zero dependencies.** No CDN calls, no login, no expiry — a file you can open five years from now and it still works, still searches, still opens links.
- **It should be useful on day one**, before any AI or database work exists. The tab-to-HTML exporter alone is a complete, standalone feature.
- **Growth path, not a monolith.** Each capability (export, library, tracking, brain, graph, reminders) should work independently and layer on top of the others, so the project is never "half-broken" while incomplete.

## Feature Wishlist (living list)

### Tab & Group Management
- View all open tabs/groups in one panel, grouped exactly as Chrome shows them.
- Select a group, multiple groups, or "all tabs" and export to HTML.
- Detect and warn about duplicate open tabs before saving.
- "Open all" from a group or a saved HTML file with one click.
- Snooze a tab (close it now, get pinged to reopen it later — daily, next launch, or a specific date/time).

### HTML Export
- Self-contained single-file export: search bar, thumbnail cards (image + title + description), one-click open, works fully offline.
- Card layout inspired by YouTube's homepage grid.
- Group-by options inside the export itself (by domain, by topic, by original tab group).
- Light/dark theme toggle baked into the exported file.
- Versioned exports — re-exporting a previously-saved group updates rather than duplicates.

### Library
- One-click save to a named folder/category (page, video, screenshot, or link).
- Auto-suggested folder based on topic classification, with manual override.
- Full-text search across saved pages (not just titles — extracted article text where possible).
- Screenshot capture attached to any saved item.
- Tagging in addition to folders, for cross-cutting organization.

### Activity & Time Tracking
- Passive time tracking per domain and per AI-classified topic.
- Idle-time exclusion (don't count time you're away from the keyboard).
- Dashboard with usage graphs: daily/weekly trends, top domains, top topics.
- Weekly digest notification/summary ("You spent 6h on YouTube this week, mostly 'video editing'").

### Database & Organization
- Automatic dedup keyed on normalized URL — never store the same link twice, even if you save it from different tabs/sessions.
- Auto-categorization into folders/topics using the same classification pipeline as tracking.
- Update-in-place: re-saving an already-known link refreshes its metadata instead of creating a duplicate.
- Full local export/import of the entire database (backup, portability).

### The Brain (AI-powered)
- Ask natural-language questions about your saved library ("what do I have on AI?").
- Answers blend your saved content with live web search for context.
- Generate structured learning plans/paths across a set of saved links/videos.
- GraphRAG-style knowledge graph connecting pages by topic, domain, and co-occurrence, enabling better multi-hop answers ("what connects my design saves and my AI saves?").

### Reminders & Flags
- Mark any tab/page as important or urgent.
- On next browser launch, get pinged about anything flagged.
- "Remind me about this when I close it" — flag right before closing a tab you don't want to lose.

### Ideas for Later (parking lot — not committed yet)
- Cross-device sync (would require moving off pure local-first storage — needs a deliberate decision, not a default).
- Mobile companion view (read-only library browser).
- Auto-generated "weekly recap" video/story of what you learned.
- Shareable (sanitized) HTML exports for sending a curated link-set to someone else.
- Browser action badge showing tab count / duplicate count at a glance.
- Voice input for talking to the brain.

## What Success Looks Like
A week from now: instead of 40 tabs open "for later," you have a handful of clean, categorized HTML libraries you actually revisit, a dashboard that tells you honestly where your screen time went, and an assistant that can answer "what was that AI article I saved two weeks ago?" instantly — without you ever having manually organized anything.
