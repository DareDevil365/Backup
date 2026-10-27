# LeadScope India

LeadScope India is an MVP for a client lead generator. A user writes one sentence about the type of companies they want, and the app converts that brief into filters, scores lead candidates, identifies likely public points of contact, and exports a CSV.

This first version is a dependency-free static app with demo data. It is deliberately not a LinkedIn private-profile scraper. LinkedIn should be treated as a public reference signal or used through approved products/APIs. Personal contact data should come from public company websites or compliant enrichment providers with clear legal basis.

## Run

Open `index.html` in a browser.

## What the MVP Does

- Accepts a natural-language lead brief.
- Extracts intent such as India relevance, startups, funding signal, hiring signal, foreign companies entering India, and student/youth market.
- Scores demo companies based on the extracted intent.
- Filters by market, team size, funding stage, search text, and result limit.
- Shows point-of-contact paths such as founder, country manager, growth lead, partnerships inbox, or department email.
- Exports the current lead view to CSV.

## Project Files

- `index.html` - app shell and dashboard markup.
- `styles.css` - responsive SaaS-style interface.
- `app.js` - prompt parsing, scoring, filtering, drawer details, and CSV export.

## Compliant Data Roadmap

1. Company discovery
   - Startup directories, incubator and VC portfolio pages, company registries, product directories, search APIs, and business databases.
   - Useful India-focused sources: Startup India listings, DPIIT-recognized startup data where available, incubator portfolios, university incubator pages, VC portfolio pages, job boards, and company websites.

2. Signal collection
   - Recent funding announcements, hiring pages, press releases, expansion pages, public blog posts, and public social/company-page activity.
   - Store signal URL, signal date, and reason, not raw scraped private profile content.

3. Contact discovery
   - Prefer role-based public emails first: `partnerships@`, `growth@`, `founders@`, `sales@`, `hello@`.
   - Use enrichment providers for work emails and business phones only when their terms and local law permit it.
   - Keep a field for consent/source and never guess or expose personal phone numbers without a valid source.

4. Backend connectors
   - Add a backend worker that runs source-specific connectors.
   - Normalize all records into one lead schema.
   - Deduplicate by domain and company name.
   - Score leads using the same criteria currently implemented in `app.js`.

5. Outreach workflow
   - Export CSV for review.
   - Add CRM sync later.
   - Track contacted, replied, rejected, and follow-up due statuses.

## Lead Schema

```json
{
  "company": "Company name",
  "domain": "company.example",
  "location": "City, country",
  "market": "india-startup",
  "industry": "B2B SaaS",
  "employees": 42,
  "funding": "seed",
  "signal": "Why this company may need help",
  "linkedinSignal": "Public LinkedIn/company-page signal summary",
  "poc": {
    "name": "Contact name or role owner",
    "title": "Founder / CEO / Growth / Partnerships",
    "email": "public or enriched work email",
    "phone": "provider-sourced business phone only"
  },
  "contactability": "How reliable the contact route is",
  "tags": ["India", "Seed", "Growth hiring"],
  "services": ["market research", "go-to-market"]
}
```

## Next Build Step

Replace `demoLeads` in `app.js` with a backend API response. The first practical backend should support:

- `POST /api/leads/search` with the user brief and filters.
- `GET /api/leads/:id` for evidence and contact details.
- `POST /api/leads/export` for CSV export from stored results.

