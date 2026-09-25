# ICT461 Lab — Course Registration Portal

Mulungushi University · School of Engineering and Technology · Department of Computer Science and IT
ICT461 — Web Standards and HTTP Fundamentals · Due 22-09-2026

A small course registration portal used to investigate HTTP methods, status
codes, caching, CORS, cookies and browser DevTools.

## Requirements

- Node.js (v18 or later recommended)
- VS Code
- A browser with DevTools (Chrome or Edge recommended for the Network panel)
- Git
- curl (for Task 2 command-line testing)

## Project structure

```
ict461-lab/
├── server.js          # API — http://localhost:3000
├── package.json
├── public/
│   ├── index.html      # Interface — http://localhost:5500
│   ├── styles.css
│   ├── app.js           # module script, imports api.js
│   └── api.js            # fetch helpers, imported by app.js
├── AI-use.md
└── README.md            # this file
```

## Setup

```bash
npm install
```

This installs `express` (API) plus `live-server` and `concurrently` (used
only to serve the static frontend — nothing in the graded code depends on
them).

## Running it

**Option A — one command, both servers:**

```bash
npm run dev
```

**Option B — two terminals (closer to how the lab describes it):**

```bash
# terminal 1
npm run start:api

# terminal 2
npm run start:web
```

Then open **http://localhost:5500** in the browser. The API runs
separately on **http://localhost:3000** — you will not open that URL
directly in the browser for normal use, only for cURL/DevTools testing.

## Data

Everything is in-memory (arrays inside `server.js`). Restarting the API
resets all registrations back to empty. Courses are seeded and fixed:

| Code | Name |
|---|---|
| ICT461 | Web Standards and HTTP Fundamentals |
| ICT481 | ICT Project Management |
| ICT411 | Cloud Computing |
| CSC301 | Data Structures and Algorithms |
| CSC205 | Database Systems |

Allowed programmes (fixed list, validated server-side):
BSc Computer Science, BSc Information Technology, BEng Electrical
Engineering, BSc Mathematics.

## API contract (Task 2)

Base URL: `http://localhost:3000`

| Method | Route | Body | Success | Failure 1 | Failure 2 |
|---|---|---|---|---|---|
| GET | `/api/courses` | — | 200 (200/304 with `If-None-Match`) | 500 (server error, not implemented) | — |
| GET | `/api/registrations/:id` | — | 200 | 404 unknown id | — |
| POST | `/api/registrations` | `{name, studentId, programme, course}` | 201 + `Location` header | 400 invalid data | 409 duplicate studentId+course |
| PUT | `/api/registrations/:id` | full record, all fields required | 200 | 400 invalid data | 404 unknown id (also 409 if the edit creates a duplicate) |
| PATCH | `/api/registrations/:id` | `{programme}` only | 200 | 400 invalid programme | 404 unknown id |
| DELETE | `/api/registrations/:id` | — | 204, no body | 404 unknown id | — |

Design-only failure codes not implemented in this prototype (no auth or
database in scope): 401/403 (no authentication layer), 500 (no simulated
server fault), 413 (no payload-size limit configured beyond Express's
default).

### Diagnostic route

`ALL /inspect` — echoes back method, path, query, selected headers
(`accept`, `content-type`, `cookie`, `origin`) and the parsed body. Accepts
both `application/json` and `application/x-www-form-urlencoded` bodies.

### Demo cookie routes (Task 4 — not a login system)

- `GET /api/demo-cookie` — sets a non-sensitive cookie (`HttpOnly`,
  `SameSite=Lax`, `Path=/`).
- `GET /api/whoami` — reports whether that cookie came back on the
  request.

## cURL examples (Task 2.1)

```bash
# GET courses
curl -i http://localhost:3000/api/courses

# POST a valid registration
curl -i -X POST http://localhost:3000/api/registrations \
  -H "Content-Type: application/json" \
  -d '{"name":"Chanda Mwansa","studentId":"2025001","programme":"BSc Computer Science","course":"ICT461"}'

# repeat the same POST — expect 409
curl -i -X POST http://localhost:3000/api/registrations \
  -H "Content-Type: application/json" \
  -d '{"name":"Chanda Mwansa","studentId":"2025001","programme":"BSc Computer Science","course":"ICT461"}'

# PATCH programme only
curl -i -X PATCH http://localhost:3000/api/registrations/1 \
  -H "Content-Type: application/json" \
  -d '{"programme":"BSc Mathematics"}'

# DELETE — 204, no body
curl -i -X DELETE http://localhost:3000/api/registrations/1
```

Remember: `response.ok` should be checked before treating a `fetch`
response as successful, and a 204 response must never be parsed as JSON
(there is no body to parse).

## Reproducing the CORS failure (Task 3.2)

The server ships with CORS already configured and working. To reproduce
the *failure* the lab asks you to capture first:

1. Open `server.js` and comment out the whole CORS `app.use(...)` block
   (it is clearly marked).
2. Restart the API (`npm run start:api`).
3. Submit the registration form in the browser. DevTools will show the
   blocked request and the OPTIONS preflight with no
   `Access-Control-Allow-*` response headers.
4. Uncomment the block, restart the API, and confirm the form works
   again.

## Caching (Task 3.1)

`GET /api/courses` returns `ETag` and `Cache-Control: public, max-age=60`.
Reload the page twice in DevTools with Network open — the second request
should come back `304 Not Modified` with no body, as long as the course
data has not changed on the server. All registration endpoints send
`Cache-Control: no-store` since that data must never be served stale.

## Accessibility / responsive notes (Task 1)

- Layout uses Flexbox by default, switching to a two-column CSS Grid at
  700px+ (covers both the 360px and 1366px test widths).
- The whole form can be completed with Tab / Shift+Tab / Enter only —
  every input has a linked `<label for>`, and focus is never hidden
  (`outline` is preserved, not removed).
- `localStorage` stores **only** the chosen programme, under the key
  `ict461:preferredProgramme`. `sessionStorage` is not used, but the page
  explains the difference: `sessionStorage` clears when the tab closes
  and is never shared across tabs; `localStorage` persists until
  explicitly cleared (there's a "Clear saved preference" button in the
  UI for this).

## Standards bodies (Checkpoint A)

- **HTML** — WHATWG (Web Hypertext Application Technology Working Group),
  in collaboration with the W3C.
- **ECMAScript** (the JavaScript language spec) — TC39 (Ecma
  International's Technical Committee 39).
- **HTTP** — IETF (Internet Engineering Task Force), via RFCs (e.g. RFC
  9110/9111/9112 for HTTP semantics, caching, and message syntax).

## What this repo does not include

- A real database (in-memory arrays only, as instructed)
- Real authentication (the demo cookie is explicitly not a login system)
- Automated browser tests (DevTools/Network evidence is meant to be
  captured by hand, per the lab brief)

## Submission checklist (from the brief)

- [ ] Source files, `package.json`, lockfile
- [ ] README with run instructions and API contract (this file)
- [ ] Evidence captured from DevTools (Network tab, both layouts, CORS
      failure/success, ETag 304, cookie flow, waterfall before/after)
- [ ] `AI-use.md` completed
- [ ] Short decision note
- [ ] Git: an issue, a feature branch, peer review, ≥4 meaningful commits
- [ ] Each student's 100-word reflection (contribution, one mistake, how
      it was verified)