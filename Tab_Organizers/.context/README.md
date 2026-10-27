# Tab Organizer + Personal Knowledge Brain

A Chrome/Edge browser extension paired with a local Python backend that transforms your chaotic browser tabs into a searchable, organized personal knowledge library.

## What It Does

- **📄 Export tabs to HTML** — Select tab groups and export them as beautiful, self-contained offline HTML files (YouTube-homepage-style card grid with search).
- **⏱️ Track your time** — Passively logs time per domain/topic with usage charts and weekly digests.
- **📚 Build a library** — One-click save to named folders with auto-categorization, deduplication, and full-text search.
- **🧠 Ask your brain** — Natural-language Q&A over your saved library using free-tier AI (Gemini/Groq) with local Ollama fallback.
- **🔔 Never lose a tab** — Flag tabs as important, get reminded on next browser launch, snooze tabs for later.

## Architecture

```
┌─────────────────────────┐     HTTP (localhost:8742)     ┌──────────────────────┐
│   Chrome Extension      │ ◄──────────────────────────► │   Python Backend     │
│   (Manifest V3)         │                               │   (FastAPI)          │
│                         │                               │                      │
│   • Popup (vanilla TS)  │                               │   • SQLite database  │
│   • Dashboard (React)   │                               │   • AI classification│
│   • Service worker      │                               │   • RAG / Brain      │
│   • Content scripts     │                               │   • HTML export      │
└─────────────────────────┘                               └──────────────────────┘
```

## Prerequisites

- **Python 3.11+**
- **Node.js 18+** and npm
- **Chrome or Edge** browser
- (Optional) [Ollama](https://ollama.com) for local AI fallback

## Quick Start

### 1. Clone and configure

```bash
cp .env.example .env
# Edit .env — add your free Gemini or Groq API key
```

### 2. Start the backend

```bash
cd backend
pip install -e .
# Or: pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start the server
python -m app.main
# Or: uvicorn app.main:app --host 127.0.0.1 --port 8742
```

### 3. Build the extension

```bash
cd extension
npm install
npm run build
```

### 4. Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `extension/dist` folder

### 5. Verify

- Click the Tab Organizer icon in your toolbar
- The popup should show a **green dot** (backend connected) and list your open tabs

## Development

```bash
# Backend (auto-reload)
cd backend
uvicorn app.main:app --reload --host 127.0.0.1 --port 8742

# Extension (HMR via CRXJS)
cd extension
npm run dev
```

## Project Structure

```
Tab_Organizers/
├── extension/          # Chrome MV3 extension (TypeScript, Vite, React)
├── backend/            # Python FastAPI local server
├── .env.example        # Environment template
├── SKILL.md            # Project conventions & constraints
├── idea.md             # Vision document
└── README.md
```

## Key Design Decisions

- **Local-first**: All data stays on your machine (SQLite). No cloud, no telemetry.
- **Free AI**: Uses Gemini/Groq free tier (no credit card) with Ollama as offline fallback.
- **AI is surgical**: Only topic classification and the brain/chat use AI. Everything else is deterministic code.
- **Embeddings are always local**: `sentence-transformers` on CPU — never eats API quota.
- **Dedup at the database layer**: Unique constraint on normalized URLs. Bulletproof.

## License

Personal project — not yet licensed for distribution.
