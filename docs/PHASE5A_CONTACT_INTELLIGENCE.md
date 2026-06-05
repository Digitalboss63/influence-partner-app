# Phase 5A — Contact Intelligence

## Purpose

Contact Intelligence is a permanent platform capability that sits between the Qualification Engine and Partner Targets in the workflow. Its goal is to extract and surface the best contact information for each qualified creator, so users can reach out through the right channel at the right time.

It operates entirely on data already in the system — prospect metadata, qualification notes, YouTube channel data — with no third-party enrichment APIs or scraping.

---

## Workflow Position

```
Product → Partner Strategy → YouTube Discovery → Discovery Workspace
  → Qualification → Contact Intelligence → Targets → Outreach → Pipeline
```

---

## Data Model

### Table: `contact_intelligence`

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | Auto-generated |
| `prospect_id` | UUID (FK → partner_prospects) | Source prospect |
| `creator_id` | UUID (FK → creators) | Optional legacy creator link |
| `qualification_id` | UUID (FK → partner_qualifications) | Associated qualification |
| `product_id` | UUID (FK → products) | Product context |
| `business_email` | TEXT | Best business email extracted |
| `website_url` | TEXT | Website URL |
| `instagram_url` | TEXT | Instagram profile URL |
| `tiktok_url` | TEXT | TikTok profile URL |
| `linkedin_url` | TEXT | LinkedIn profile URL |
| `contact_page_url` | TEXT | Contact page URL (may be inferred) |
| `youtube_url` | TEXT | YouTube channel URL |
| `confidence_score` | INTEGER (0–100) | Source diversity score |
| `contact_readiness_score` | INTEGER (0–100) | Reachability score |
| `verification_status` | ENUM | verified / likely / unverified / missing |
| `source_data` | JSONB | Map of source → values found |
| `audit_notes` | JSONB | Score breakdown, missing fields, timestamp |
| `created_at` | TIMESTAMP | Creation time |
| `updated_at` | TIMESTAMP | Last extraction/update time |

### Enum: `verification_status`

- `verified` — manually confirmed by user
- `likely` — contact readiness ≥ 60, multiple sources
- `unverified` — some data found, low confidence
- `missing` — almost no contact signals

---

## Scoring Formula

### Contact Readiness Score (0–100)

| Signal | Points |
|---|---|
| Business email found | +35 |
| Website URL found | +15 |
| Contact page URL found | +15 |
| Instagram profile | +10 |
| TikTok profile | +10 |
| LinkedIn profile | +10 |
| YouTube channel / recent activity | +5 |
| **Maximum** | **100** |

Business-domain emails (non-gmail/yahoo/hotmail/etc.) are prioritised over personal emails.

### Confidence Score (0–100)

Based on the number of distinct data sources that matched:
```
confidenceScore = min(round((sourceCount / 4) * 100), 100)
```

### Verification Status Assignment

| Readiness | Status |
|---|---|
| ≥ 60 | `likely` |
| 35–59 | `unverified` |
| < 35 | `missing` |
| Manually marked | `verified` |

---

## Contact Extraction

### Sources (in order of trust)

1. **Qualification contact email field** — manually entered during qualification
2. **Prospect email/website/socialUrl fields** — direct fields from Discovery Workspace
3. **Prospect notes** — scanned for email patterns and URLs
4. **YouTube channel description** — full text parsed for emails and links
5. **YouTube channel URL / custom URL** — classified and stored
6. **Contact page inference** — `/contact` appended to found website
7. **Creator handle** — used to construct YouTube URL if none found

### URL Classification

URLs found in any source are classified as:
- `instagramUrl` — contains instagram.com
- `tiktokUrl` — contains tiktok.com
- `linkedinUrl` — contains linkedin.com
- `youtubeUrl` — contains youtube.com or youtu.be
- `contactPageUrl` — path matches `/contact`, `/hire`, `/collaborate`, `/work-with`, `/partner`, `/business`
- `websiteUrl` — all other URLs (first found wins)

### Email Deprioritisation

Personal email domains (gmail, yahoo, hotmail, outlook, icloud, me, live, aol, protonmail, pm.me) are deprioritised in favour of business-domain emails.

---

## API Routes

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/contact-intelligence` | List records (filter: productId, tab, verificationStatus) |
| `GET` | `/api/contact-intelligence/metrics` | Aggregated funnel metrics |
| `POST` | `/api/contact-intelligence/discover` | Extract contacts for one prospect |
| `POST` | `/api/contact-intelligence/discover-batch` | Extract contacts for all qualified prospects in a product |
| `PATCH` | `/api/contact-intelligence/:id/verify` | Update verification status |
| `GET` | `/api/contact-intelligence/export` | Download CSV (14 columns) |

### Query Parameters

**GET /api/contact-intelligence**
- `productId` — filter by product
- `tab` — `email` | `website` | `social` | `missing` | `verified`
- `verificationStatus` — `verified` | `likely` | `unverified` | `missing`

---

## UI Routes

| Route | Component | Description |
|---|---|---|
| `/contact-intelligence` | `ContactIntelligence.tsx` | Main page |
| `/help/contact-intelligence` | `HelpContactIntelligence.tsx` | Full help documentation |

### Main Page Features

- **Product selector** — filter all data by product
- **Metrics row** — Qualified Creators, Contacts Found, Emails Found, High Readiness, Missing Info
- **Filter tabs** — All / Email Found / Website Found / Social Found / Missing / Verified
- **Sort options** — Highest Contact Readiness / Business Email First / Recently Updated / Highest Partner Fit Score
- **Contact cards** — per-creator cards showing all contact fields with copy buttons, social links, verification status, recommended next action, and collapsible Audit Panel
- **Discover All** — batch extraction for all qualified creators in the selected product
- **Refresh** — re-run extraction for a single card
- **Mark Verified** — manually confirm contact accuracy
- **Export CSV** — 14-column download of current filtered view

### Contact Card Fields

- Creator/channel name
- Contact Readiness Score (colour-coded)
- Verification status badge
- Business email with copy button
- Website link
- Social links (Instagram, TikTok, LinkedIn, YouTube, Contact Page)
- Recommended next action
- Audit Panel: source map, score breakdown table, missing fields, timestamp

### Audit Panel

Collapsible section per card showing:
- Which source each field was found in
- Score breakdown table (field → points)
- Total score
- Missing fields list
- Extraction timestamp

---

## Help System

`/help/contact-intelligence` covers:
1. What is Contact Intelligence?
2. Where contact data comes from
3. What Contact Readiness Score means
4. What verification status means
5. How to use missing contact warnings
6. How to copy and verify contact info
7. How this connects to Targets and Outreach
8. What the system does not do yet

---

## Verification Checklist

- [x] TypeScript 0 errors (all 4 packages)
- [x] DB schema pushed (`contact_intelligence` table, `verification_status` enum)
- [x] API server builds and starts
- [x] 6 API routes registered and responding
- [x] `/contact-intelligence` page loads
- [x] `/help/contact-intelligence` page loads
- [x] Metrics API returns correct shape
- [x] Contact Intelligence nav item added between Qualification and Targets
- [x] Dashboard Funnel Health card updated with Contact Found step
- [x] Batch discovery endpoint wired up
- [x] Single discover endpoint wired up
- [x] Verify endpoint wired up
- [x] CSV export endpoint wired up
- [x] No regressions on existing routes

---

## Known Limitations

- Email addresses are not validated for deliverability (no MX record checks)
- No live scraping of YouTube About tab — only stored description text is parsed
- Contact page URL is inferred (`/contact`) and may not exist for all domains
- No automatic re-extraction when prospect data is updated — user must click Refresh
- No integration with third-party creator databases (Grin, Creator.co, etc.)
- Personal emails (gmail/yahoo/etc.) are deprioritised but not excluded

---

## Future Phase 5B Recommendations

1. **Live YouTube About tab parsing** — fetch `https://www.youtube.com/channel/{id}/about` on demand
2. **Email deliverability validation** — MX record check before marking as verified
3. **Bulk enrichment from public APIs** — YouTube Data API v3 channel details endpoint
4. **Auto-refresh on prospect update** — hook into prospect PUT route to re-run extraction
5. **Confidence decay** — lower confidence score for records older than 30 days
6. **Domain intelligence** — identify brand website vs. personal blog vs. portfolio
7. **LinkedIn URL confidence boost** — if LinkedIn shows "Open to collaboration" signals
