# Decision note

A short note (the brief asks for this alongside the README) explaining
the handful of choices that weren't dictated directly by the spec.

## Layout breakpoint

Grid two-column layout switches on at 700px rather than exactly between
360px and 1366px, so both required test widths clearly fall on either
side of it (stacked on a phone, side-by-side on a laptop).

## Validation duplicate rule

A "duplicate" is defined as the same `studentId` **and** the same
`course` already existing. The same student may register for a different
course; the same course may have many different students.

## Error response shape

Every 400/404/409 response uses the same JSON shape —
`{ "error": "...", "details": [...] }` — so the frontend (and anyone
testing with cURL) can rely on one consistent structure regardless of
which route failed.

## ETag strategy

The ETag for `GET /api/courses` is a SHA-1 hash of the course array's
JSON representation, recomputed on every request. Since the seeded course
list doesn't change at runtime in this prototype, the ETag stays stable
between requests — which is exactly what makes the `304 Not Modified`
behaviour observable. (The server code shows where you'd invalidate it if
courses became editable.)

## Cookie route separation

`/api/demo-cookie` (sets) and `/api/whoami` (reads back) are two separate
routes rather than one, so the Set-Cookie → stored → sent-back sequence
in DevTools is easy to follow as three distinct, separately-inspectable
steps.

