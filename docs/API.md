# API reference

Base URL: `/api` (e.g. `http://localhost:5000/api`).

All responses are JSON in one of two shapes:

```json
{ "success": true, "data": { } }
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "…", "details": [{ "field": "email", "message": "…" }] } }
```

`details` is only present for validation errors. Error codes: `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409), `PAYLOAD_TOO_LARGE` (413), `RATE_LIMITED` (429), `EMAIL_FAILED` (502), `INTERNAL_ERROR` (500).

Admin endpoints need `Authorization: Bearer <token>` from `/auth/login`.

## Rate limits (per IP)

| Scope | Limit |
|---|---|
| All `/api` routes | 300 per 15 min |
| `POST /enquiries/analyze` | 10 per 15 min |
| `POST /enquiries` | 10 per hour |
| `POST /auth/login` | 10 per 15 min |

---

## Public

### `GET /health`
Liveness check. `{ "status": "ok" }`

### `GET /catalogue`
Service categories, form options and whether AI is active.

```json
{
  "company": { "name": "Cyber Communications", "website": "https://cybercommunications.in" },
  "categories": [{ "id": "networking", "name": "Networking", "summary": "…", "examples": ["…"], "verified": false }],
  "options": { "industries": ["Education", "…"], "employeeRanges": ["1-10", "…"], "budgetRanges": [{ "value": "5l-20l", "label": "₹5 – 20 lakh" }] },
  "ai": { "enabled": false }
}
```

### `POST /enquiries/analyze`
Produces a preliminary analysis. Accepts only requirement fields; contact details are not needed and must not be sent.

Body:

| Field | Type | Rules |
|---|---|---|
| `industry` | string | one of `options.industries` |
| `employeeCount` | string | one of `options.employeeRanges` |
| `services` | string[] | ≥1 category id |
| `requirements` | string | 30–5000 chars |
| `budget` | string | one of `options.budgetRanges[].value` |
| `location` | string | 2–120 chars |
| `notes` | string | optional, ≤2000 chars |

Response:

```json
{
  "analysis": {
    "source": "ai | basic",
    "provider": "openai", "model": "…", "generatedAt": "…",
    "projectSummary": "…",
    "identifiedRequirements": ["…"],
    "relevantServiceCategories": ["networking"],
    "suggestedComponents": [{ "name": "…", "category": "networking", "purpose": "…" }],
    "missingInformation": ["…"],
    "followUpQuestions": ["…"]
  },
  "analysisToken": "<signed token, pass to POST /enquiries>",
  "fallback": false,
  "fallbackReason": null
}
```

`fallbackReason` is `not_configured`, `missing_api_key`, `unknown_provider`, `timeout` or `provider_error` when the basic analyser was used. This endpoint never fails because of the AI provider.

### `POST /enquiries`
Submits an enquiry. Body = all fields above plus:

| Field | Type | Rules |
|---|---|---|
| `name` | string | 2–100 chars |
| `company` | string | 2–150 chars |
| `email` | string | valid email |
| `phone` | string | 7–20 chars: digits, spaces, `+ - ( )` |
| `analysisToken` | string | optional; from `/enquiries/analyze` |

The analysis is stored only if the token is valid **and** the requirement fields are unchanged since it was generated.

`201` response: `{ "reference": "CC-20261126-7KQ4M", "submittedAt": "…", "analysisAttached": true }`

---

## Authentication

### `POST /auth/login`
Body `{ "email", "password" }` → `{ "token", "admin": { "_id", "name", "email", "role" } }`. Wrong email and wrong password return the same 401 message.

### `GET /auth/me` (admin)
`{ "admin": { … } }`

---

## Admin enquiries

### `GET /admin/stats`
`{ "total", "pending", "byStatus": { "pending": 3, … }, "recent": [ …5 latest ] }`

### `GET /admin/enquiries`
Query: `search` (reference, name, company or email; literal text, not a regex), `status`, `page` (default 1), `limit` (default 10, max 100).

`{ "items": [ … ], "pagination": { "page", "limit", "total", "pages" } }`

### `GET /admin/enquiries/:id`
`{ "enquiry": { …full record incl. aiAnalysis and statusHistory }, "quotation": { … } | null }`

### `PATCH /admin/enquiries/:id/status`
Body `{ "status": "pending | under_review | quotation_prepared | sent | accepted | rejected", "note": "optional" }`.
`sent` is rejected unless the quotation has actually been emailed; use the send endpoint instead.

---

## Quotations (admin)

Workflow: **save (draft) → approve → download PDF / send**. Saving again after approval or sending returns the quotation to draft.

### `GET /admin/quotation-defaults`
`{ "currency": "INR", "taxRate": 18, "validUntil": "YYYY-MM-DD", "terms": "…" }`

### `PUT /admin/enquiries/:id/quotation`
Create or update the enquiry's quotation.

```json
{
  "items": [{ "description": "Managed Wi-Fi access point", "quantity": 12, "unit": "Nos", "unitPrice": 18500, "taxRate": 18 }],
  "validUntil": "2026-12-11",
  "terms": "…",
  "notes": "…"
}
```

Line totals, subtotal, tax and total are computed on the server; any totals sent by the client are ignored. Moves the enquiry from Pending/Under review to Quotation prepared.

### `POST /admin/enquiries/:id/quotation/approve`
Draft → approved. Records who approved it and when.

### `GET /admin/enquiries/:id/quotation/pdf`
Returns `application/pdf`. Drafts are watermarked `DRAFT` and named `…-DRAFT.pdf`.

### `POST /admin/enquiries/:id/quotation/send`
Requires an approved (or previously sent) quotation. Emails the PDF to the customer. On success, quotation → `sent` and enquiry → Sent. On failure returns `502 EMAIL_FAILED`; the attempt is recorded in `quotation.lastEmail` and nothing else changes.
