# AI-Powered IT Solution Builder

A MERN web application for **Cyber Communications** ([cybercommunications.in](https://cybercommunications.in)). Business customers describe their IT needs, review a preliminary AI-generated solution brief, and submit an enquiry. Administrators review enquiries, prepare quotations with approved prices, generate PDF quotations and email them to customers.

> **Pilot project.** Built for Cyber Communications ([cybercommunications.in](https://cybercommunications.in)) and approved by the company for a pilot. The service catalogue is illustrative and marked "pending company confirmation" until the company verifies it (see [Catalogue](#service-catalogue)).

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Environment variables](#environment-variables)
- [AI integration](#ai-integration)
- [Email setup](#email-setup)
- [Tests](#tests)
- [Deployment](#deployment)
- [Security notes](#security-notes)
- [Known limitations](#known-limitations)

API reference: [docs/API.md](docs/API.md)

---

## Features

**Customers**
- Home page and service catalogue
- Three-step request form (details → requirements → review) with field-level validation, and progress saved if the page is refreshed
- Preliminary analysis: summary, identified requirements, relevant services, possible components, missing information, follow-up questions, clearly labelled as preliminary and "not a quotation"
- Works without AI: if no provider is configured or the provider fails, a basic keyword summary is shown and the customer can still submit
- Confirmation page with a reference number (e.g. `CC-20261126-7KQ4M`)

**Administrators**
- JWT sign-in with bcrypt-hashed passwords
- Dashboard: total, pending and per-status counts, latest enquiries
- Enquiry list with search, status filter and pagination (filters kept in the URL)
- Enquiry detail: customer details, original requirements, stored analysis, status updates with notes and history
- Quotation editor: line items, quantities, unit prices and tax rates entered by the admin, live totals, validity date, terms
- Draft → approve → send workflow; drafts are watermarked in the PDF and can't be emailed
- PDF quotation download; email to customer with the PDF attached; failures reported and recorded

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, React Router, Tailwind CSS 4, Axios |
| Backend | Node.js (20+), Express 5 |
| Database | MongoDB, Mongoose 9 |
| Validation | Zod |
| Auth | JSON Web Tokens, bcryptjs |
| AI | OpenAI-compatible APIs or Anthropic, behind a provider interface |
| PDF | PDFKit |
| Email | Nodemailer (any SMTP provider) |
| Security | Helmet, CORS allow-list, express-rate-limit, Mongoose `sanitizeFilter` |
| Tests | Jest, Supertest, mongodb-memory-server |

## Project structure

```
ai-it-solution-builder/
├── backend/
│   ├── src/
│   │   ├── app.js                 Express app (routes, security middleware); imported by tests
│   │   ├── server.js              Connects to MongoDB and starts listening
│   │   ├── config/
│   │   │   ├── env.js             All environment variables, read in one place
│   │   │   ├── db.js              Mongoose connection
│   │   │   ├── catalogue.js       Service categories (single source for UI and AI)
│   │   │   └── constants.js       Statuses, industries, employee and budget ranges
│   │   ├── models/                Enquiry, Admin, Quotation
│   │   ├── validators/schemas.js  Zod schemas for every request body/query/param
│   │   ├── middleware/            auth (JWT + role), validate, rate limiters, error handler
│   │   ├── controllers/           public, auth, admin (enquiries), quotation
│   │   ├── routes/index.js        All routes
│   │   ├── services/
│   │   │   ├── ai/                AI module (see below)
│   │   │   ├── pdf.service.js     Quotation PDF
│   │   │   ├── email.service.js   Nodemailer wrapper and templates
│   │   │   └── quotation.service.js  Totals and rounding
│   │   └── utils/                 errors, logger (redacts secrets), sanitising, reference numbers
│   ├── scripts/createAdmin.js     Create or reset an admin account
│   ├── tests/
│   │   ├── unit/                  No database needed
│   │   └── integration/           Full API against MongoDB
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/                 Home, Services, Request, Confirmation, 404, admin/*
│   │   ├── components/            AnalysisPanel, QuotationEditor, ServiceSelector, layouts, ui/*
│   │   ├── services/              Axios client and API calls
│   │   ├── context/AuthContext.jsx
│   │   ├── hooks/                 useCatalogue, useDocumentTitle
│   │   └── utils/                 formatting, client-side validation
│   └── .env.example
└── docs/API.md
```

### AI module (`backend/src/services/ai/`)

| File | Purpose |
|---|---|
| `index.js` | `analyzeRequirements()` picks the provider, calls it, validates output and falls back. It never throws. Also signs and verifies the analysis token. |
| `prompt.js` | System prompt (catalogue and rules) and user prompt (requirement fields only, with emails and phone numbers removed) |
| `analysisSchema.js` | JSON schema sent to the provider, Zod re-validation, and removal of prices, stock, warranty or delivery claims and unknown categories |
| `basicAnalyzer.js` | Keyword-based fallback (no network) |
| `providers/openai.js` | OpenAI Chat Completions with strict JSON-schema output; works with any OpenAI-compatible API via `AI_BASE_URL` |
| `providers/anthropic.js` | Anthropic Messages API with a forced tool call for structured output |

---

## Prerequisites

- **Node.js 20 or newer** (`node -v`)
- **MongoDB 6+**: local install, Docker (`docker run -d -p 27017:27017 --name mongo mongo:7`) or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster
- Optional: an API key for OpenAI, an OpenAI-compatible provider, or Anthropic
- Optional: SMTP credentials for real email delivery

## Setup

```bash
# 1. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 2. Configure the backend
cd ../backend
cp .env.example .env
#   - set MONGODB_URI
#   - set JWT_SECRET:  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
#   - optionally set AI_* and SMTP_* (see below)

# 3. Create an administrator
npm run create-admin -- --email admin@yourcompany.com --name "Your Name" --password "choose-a-long-password"
#   Running it again with the same email resets that admin's password.

# 4. Start the API (http://localhost:5000)
npm run dev

# 5. In a second terminal, start the frontend (http://localhost:5173)
cd ../frontend
npm run dev
```

Open http://localhost:5173 for the customer site, and http://localhost:5173/admin to sign in.

Vite proxies `/api` to `http://localhost:5000`, so no CORS setup is needed in development. The frontend `.env` is optional; see `frontend/.env.example`.

### Database setup

No migrations are needed. Mongoose creates the `enquiries`, `admins` and `quotations` collections and their indexes on first use:

- `enquiries`: unique `reference`; `status + createdAt`; `createdAt`; `customer.email`
- `admins`: unique `email`
- `quotations`: unique `enquiry` (one quotation per enquiry); unique `quoteNumber`

### Commands

| Where | Command | What it does |
|---|---|---|
| backend | `npm run dev` | API with auto-reload (nodemon) |
| backend | `npm start` | API without auto-reload |
| backend | `npm run create-admin -- --email … --password …` | Create or reset an admin |
| backend | `npm test` | All tests (unit + integration) |
| backend | `npm run test:unit` | Unit tests only (no database needed) |
| frontend | `npm run dev` | Dev server with hot reload |
| frontend | `npm run build` | Production build into `frontend/dist` |
| frontend | `npm run preview` | Serve the production build locally |

---

## Environment variables

Backend (`backend/.env`; every variable is documented in `.env.example`):

| Variable | Required | Default | Notes |
|---|---|---|---|
| `MONGODB_URI` | yes | `mongodb://127.0.0.1:27017/it_solution_builder` | |
| `JWT_SECRET` | yes | none | ≥32 characters; server refuses to start without it |
| `JWT_EXPIRES_IN` | | `8h` | Admin session length |
| `PORT` | | `5000` | |
| `CORS_ORIGIN` | | `http://localhost:5173` | Comma-separated allow-list |
| `TRUST_PROXY` | | `false` | `true` behind Render/Railway/Nginx so rate limits see real client IPs |
| `AI_PROVIDER` | | `none` | `openai`, `anthropic` or `none` |
| `AI_API_KEY` | with a provider | none | Never sent to the browser |
| `AI_MODEL` | | provider default | Set explicitly; check your provider's current models |
| `AI_BASE_URL` | | provider default | For OpenAI-compatible APIs |
| `AI_TIMEOUT_MS` | | `30000` | Falls back to basic analysis after this |
| `EMAIL_TRANSPORT` | | `json` | `smtp`, `json` (dev: build but don't send) or `disabled` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | for `smtp` | | |
| `EMAIL_FROM`, `EMAIL_REPLY_TO` | | | Sender address must be verified with your provider |
| `ADMIN_NOTIFY_EMAIL` | | none | Gets an email for each new enquiry |
| `COMPANY_*` | | name and website only | Email, phone, address and GSTIN print on quotations. Leave blank until confirmed by the company. |
| `QUOTE_CURRENCY`, `QUOTE_DEFAULT_TAX_RATE`, `QUOTE_VALIDITY_DAYS`, `QUOTE_DEFAULT_TERMS` | | `INR`, `18`, `15`, built-in terms | Defaults pre-filled in the editor; admin can change per quotation |

Frontend (`frontend/.env`, optional): `VITE_API_URL` (default `/api`).

---

## AI integration

Set in `backend/.env`:

```bash
# OpenAI
AI_PROVIDER=openai
AI_API_KEY=sk-...
AI_MODEL=gpt-4o-mini

# Any OpenAI-compatible API (example: Groq)
AI_PROVIDER=openai
AI_BASE_URL=https://api.groq.com/openai/v1
AI_API_KEY=...
AI_MODEL=<a model that supports JSON-schema structured output>

# Anthropic
AI_PROVIDER=anthropic
AI_API_KEY=sk-ant-...
AI_MODEL=claude-haiku-5-5
```

Restart the API. The startup log shows which provider is active.

**How the AI is controlled**
1. **Data minimisation:** only industry, size band, selected services, requirement text, budget band, location and notes are sent. Name, company, email and phone are never sent, and email addresses and phone numbers inside the free text are replaced with `[email removed]` / `[phone removed]`. A unit test enforces this.
2. **Restricted scope:** the system prompt lists the catalogue and forbids prices, stock, warranty, delivery, specific models and commitments. It also tells the model to treat customer text as data, not instructions.
3. **Structured output:** the provider is given a strict JSON schema (category ids are an enum).
4. **Validation after the fact:** output is re-validated with Zod; unknown categories are dropped; any sentence or item containing a price, stock, warranty, guarantee or delivery-time claim is removed; lists are capped at 8 items.
5. **Fallback:** missing key, timeout, HTTP error or invalid output all produce a basic keyword summary (`source: "basic"`), labelled as such to the customer and the admin.
6. **Tamper-proofing:** the analysis the customer reviews is returned with an HMAC-signed token bound to a hash of the requirement fields. On submit, the server stores the analysis only if the signature is valid and the requirements haven't changed. A customer can't inject edited "AI" text, and a stale analysis is never stored.
7. **Cost control:** `/enquiries/analyze` is limited to 10 requests per 15 minutes per IP.

To add a provider, create `services/ai/providers/<name>.js` exporting `{ name, generate({ system, user, jsonSchema, settings }) }` that returns `{ output, model }`, and register it in `services/ai/index.js`.

## Email setup

Development default is `EMAIL_TRANSPORT=json`: emails are fully built (including the PDF attachment) but not delivered, and the log shows recipient and subject. Quotations then show as "sent" in the admin. This is for testing the workflow only.

For real delivery set `EMAIL_TRANSPORT=smtp` and the SMTP settings. Examples:

| Provider | SMTP_HOST | SMTP_PORT | SMTP_USER / SMTP_PASS |
|---|---|---|---|
| SendGrid | `smtp.sendgrid.net` | 587 | `apikey` / your API key |
| Brevo | `smtp-relay.brevo.com` | 587 | your login / SMTP key |
| Amazon SES | `email-smtp.<region>.amazonaws.com` | 587 | SES SMTP credentials |
| Zoho Mail | `smtp.zoho.in` | 465 (`SMTP_SECURE=true`) | mailbox / app password |
| Gmail (testing only) | `smtp.gmail.com` | 465 (`SMTP_SECURE=true`) | address / [app password](https://support.google.com/accounts/answer/185833) |

Verify the `EMAIL_FROM` address or domain with the provider, or messages will be rejected or land in spam.

Failures don't break anything. If sending fails, the admin sees a clear error, the attempt is recorded on the quotation, and the quotation stays approved so it can be re-sent. New-enquiry notifications (`ADMIN_NOTIFY_EMAIL`) are sent in the background and never block a customer's submission.

---

## Tests

```bash
cd backend
npm run test:unit   # 35 tests, no database needed
npm test            # unit + integration
```

| Suite | Covers |
|---|---|
| `unit/ai.service.test.js` | Fallback when no provider, missing key, provider error, timeout and invalid output; successful AI path; personal data never sent; removal of prices/stock/warranty/delivery claims; unknown categories dropped; token tamper and stale detection |
| `unit/routes-no-db.test.js` | Catalogue, analysis without AI, validation errors per field, NoSQL operator injection rejected, malformed JSON, 404s, admin routes reject missing, forged and expired tokens |
| `unit/quotation-pdf-email.test.js` | Totals and rounding, Indian number format, PDF output (single and multi-page), email attachment and HTML escaping, email failure handling |
| `unit/models.test.js` | Schema validation and defaults, password hashing and hiding |
| `integration/api.test.js` | Enquiry submission with, without and with stale analysis; login (incl. same error for unknown email); deleted admin loses access; stats, search (regex-safe), filter, pagination; status updates and history; quotation save with server-side totals, validation, approve, draft PDF, send, edit-after-send returns to draft; email failure → 502 without status change |

Integration tests start an in-memory MongoDB with `mongodb-memory-server` (downloads a MongoDB binary of about 100 MB on first run). To use your own MongoDB instead, point it at a **throwaway** database because it is wiped:

```bash
MONGODB_URI_TEST=mongodb://127.0.0.1:27017/itsb_test npm test
```

---

## Deployment

### Option A: single server (simplest)
The backend serves the built frontend when `NODE_ENV=production` and `frontend/dist` exists.

```bash
cd frontend && npm ci && npm run build
cd ../backend && npm ci --omit=dev
NODE_ENV=production npm start
```

Works on Render, Railway, a VPS with PM2, or similar. Set all backend environment variables in the host's dashboard, set `TRUST_PROXY=true`, and set `CORS_ORIGIN` to your public URL.

### Option B: separate frontend and API
- Frontend on Vercel/Netlify: build command `npm run build`, output `dist`, set `VITE_API_URL=https://your-api.example.com/api`. Add an SPA rewrite so all paths serve `index.html` (Netlify: `/* /index.html 200`; Vercel: rewrite `/(.*)` → `/index.html`).
- API on Render/Railway/VPS, with `CORS_ORIGIN=https://your-frontend.example.com`.

### Production checklist
- [ ] Strong `JWT_SECRET`, unique per environment
- [ ] MongoDB Atlas (or self-hosted with auth enabled), IP access list configured
- [ ] `EMAIL_TRANSPORT=smtp` with a verified sender domain
- [ ] `COMPANY_*` details confirmed by Cyber Communications
- [ ] Service catalogue confirmed and `verified: true` set
- [ ] HTTPS everywhere; `TRUST_PROXY=true` behind a proxy
- [ ] AI provider spending limit set in the provider's dashboard

---

## Security notes

- Secrets only in `.env` (git-ignored); `.env.example` files contain no real values
- Helmet security headers; CORS allow-list; JSON body limit 100 KB
- Rate limits on all routes, tighter on analysis, submission and login
- Every input validated and cleaned with Zod (types, lengths, enums, control characters stripped); Mongoose `sanitizeFilter` blocks query-operator injection; search input is regex-escaped
- Passwords hashed with bcrypt (12 rounds); hash excluded from queries and JSON by default; constant-time-ish login for unknown emails
- JWT verified with a fixed algorithm (HS256); admin re-loaded on every request so deleted admins lose access immediately; role check on all admin routes
- Logger redacts keys named like passwords, tokens, secrets and keys; request bodies are never logged; provider error bodies (which can echo prompts) are not logged
- Email HTML escapes all customer-supplied values

**Trade-off to know about:** the admin token is stored in `localStorage` for simplicity. That's acceptable for an internal tool with an 8-hour expiry and React's default output escaping. For a hardened deployment, move it to an `httpOnly`, `Secure`, `SameSite=Strict` cookie and add CSRF protection.

## Known limitations

- **Catalogue not verified.** The company website could not be reached when this was built, so categories follow the project brief and are flagged in the UI. Edit `backend/src/config/catalogue.js`.
- **Logo is a placeholder mark**, not the company's brand asset.
- One quotation per enquiry (edits create a new draft of the same quotation; there is no revision history).
- Single admin role; no password-reset-by-email flow (use `npm run create-admin` to reset).
- The basic fallback analyser is keyword-based and deliberately simple.
- No accept/reject link for customers; admins record the outcome manually.
