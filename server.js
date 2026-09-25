/**
 * ICT461 Lab — API server
 * Serves the course registration API at http://localhost:3000
 *
 * Run:  npm run start:api
 *
 * This file is deliberately written so every requirement in the lab brief
 * maps to a clearly labelled block of code:
 *   - Task 2: the six /api/registrations + /api/courses routes, /inspect
 *   - Task 3: ETag / Cache-Control on GET /api/courses, CORS handling
 *   - Task 4: demo cookie route, security header notes
 */

const express = require("express");
const crypto = require("crypto");

const app = express();
const PORT = 3000;

// Express auto-generates an ETag for every response by default. The lab
// only asks for ETag/If-None-Match behaviour on GET /api/courses (Task
// 3.1), so the automatic one is switched off here and set explicitly,
// only on that route, further down.
app.disable("etag");

// ---------------------------------------------------------------------------
// Body parsers — Task 2.3 needs BOTH form-encoded and JSON bodies handled,
// so both parsers are registered. Express picks the right one based on the
// incoming Content-Type header.
// ---------------------------------------------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------------------
// CORS — Task 3.2
//
// TO REPRODUCE THE "BLOCKED BY CORS" EXPERIMENT THE LAB ASKS FOR:
// comment out this whole app.use(...) block, restart the server, and make
// the POST from the browser interface again. DevTools will show the
// failed fetch plus the OPTIONS preflight with no Access-Control-Allow-*
// response headers. Uncomment it again afterwards — everything below
// depends on it.
// ---------------------------------------------------------------------------
const ALLOWED_ORIGIN = "http://localhost:5500";

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    // Preflight response: no body, 204 is conventional here.
    return res.sendStatus(204);
  }
  next();
});

// ---------------------------------------------------------------------------
// Minimal res.cookie() shim (kept dependencies to just "express" — the lab
// only needs to SET and observe a cookie, not fully parse one server-side,
// so cookie-parser was left out on purpose). Must be registered before any
// route that calls res.cookie().
// ---------------------------------------------------------------------------
app.use((req, res, next) => {
  res.cookie = function (name, value, options = {}) {
    let cookieStr = `${name}=${value}`;
    if (options.httpOnly) cookieStr += "; HttpOnly";
    if (options.sameSite) cookieStr += `; SameSite=${options.sameSite}`;
    if (options.path) cookieStr += `; Path=${options.path}`;
    res.setHeader("Set-Cookie", cookieStr);
  };
  next();
});

// ---------------------------------------------------------------------------
// In-memory "database" — explicitly out of scope to use a real DB (brief).
// ---------------------------------------------------------------------------
const courses = [
  { code: "ICT461", name: "Web Standards and HTTP Fundamentals" },
  { code: "ICT481", name: "ICT Project Management" },
  { code: "ICT411", name: "Cloud Computing" },
  { code: "CSC301", name: "Data Structures and Algorithms" },
  { code: "CSC205", name: "Database Systems" },
];

const PROGRAMMES = [
  "BSc Computer Science",
  "BSc Information Technology",
  "BEng Electrical Engineering",
  "BSc Mathematics",
];

let registrations = [];
let nextId = 1;

// ---------------------------------------------------------------------------
// Validation helpers — kept separate from route handlers on purpose so the
// server enforces its own rules regardless of what the browser form does.
// This is what "bypass the form to prove server validation still works"
// (Task 2.2) is checking for.
// ---------------------------------------------------------------------------
function validateFullRecord(body) {
  const errors = [];
  if (!body || typeof body !== "object") {
    return ["Request body must be a JSON object."];
  }
  if (!body.name || typeof body.name !== "string" || body.name.trim().length < 2) {
    errors.push("name is required and must be at least 2 characters.");
  }
  if (!body.studentId || typeof body.studentId !== "string" || body.studentId.trim().length < 4) {
    errors.push("studentId is required and must be at least 4 characters.");
  }
  if (!body.programme || !PROGRAMMES.includes(body.programme)) {
    errors.push(`programme is required and must be one of: ${PROGRAMMES.join(", ")}`);
  }
  const courseCodes = courses.map((c) => c.code);
  if (!body.course || !courseCodes.includes(body.course)) {
    errors.push(`course is required and must be one of: ${courseCodes.join(", ")}`);
  }
  return errors;
}

function validateProgrammeOnly(body) {
  if (!body || !body.programme || !PROGRAMMES.includes(body.programme)) {
    return [`programme is required and must be one of: ${PROGRAMMES.join(", ")}`];
  }
  return [];
}

function findDuplicate(studentId, course, excludeId = null) {
  return registrations.find(
    (r) => r.studentId === studentId && r.course === course && r.id !== excludeId
  );
}

function computeCoursesETag() {
  const hash = crypto.createHash("sha1").update(JSON.stringify(courses)).digest("hex");
  return `"${hash}"`;
}

// =============================================================================
// TASK 2 — the six required routes
// =============================================================================

// GET /api/courses — 200. Also carries the ETag/Cache-Control from Task 3.1.
app.get("/api/courses", (req, res) => {
  const etag = computeCoursesETag();
  res.setHeader("Cache-Control", "public, max-age=60");
  res.setHeader("ETag", etag);

  const clientETag = req.headers["if-none-match"];
  if (clientETag && clientETag === etag) {
    // Freshness/revalidation: unchanged data, no body, 304.
    return res.status(304).end();
  }

  res.status(200).json(courses);
});

// GET /api/registrations/:id — 200, or 404 if the id is unknown.
app.get("/api/registrations/:id", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const record = registrations.find((r) => String(r.id) === req.params.id);
  if (!record) {
    return res.status(404).json({ error: "No registration found with that id." });
  }
  res.status(200).json(record);
});

// POST /api/registrations — 201 + Location, 400 invalid, 409 duplicate.
app.post("/api/registrations", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const errors = validateFullRecord(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: "Validation failed.", details: errors });
  }

  const { name, studentId, programme, course } = req.body;
  if (findDuplicate(studentId, course)) {
    return res.status(409).json({
      error: "Duplicate registration.",
      details: [`studentId ${studentId} is already registered for ${course}.`],
    });
  }

  const record = {
    id: nextId++,
    name: name.trim(),
    studentId: studentId.trim(),
    programme,
    course,
    createdAt: new Date().toISOString(),
  };
  registrations.push(record);

  res.setHeader("Location", `/api/registrations/${record.id}`);
  res.status(201).json(record);
});

// PUT /api/registrations/:id — 200 replace, 400 invalid, 404 unknown.
app.put("/api/registrations/:id", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const record = registrations.find((r) => String(r.id) === req.params.id);
  if (!record) {
    return res.status(404).json({ error: "No registration found with that id." });
  }

  const errors = validateFullRecord(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: "Validation failed.", details: errors });
  }

  const { name, studentId, programme, course } = req.body;
  const conflict = findDuplicate(studentId, course, record.id);
  if (conflict) {
    return res.status(409).json({
      error: "Duplicate registration.",
      details: [`studentId ${studentId} is already registered for ${course}.`],
    });
  }

  record.name = name.trim();
  record.studentId = studentId.trim();
  record.programme = programme;
  record.course = course;
  record.updatedAt = new Date().toISOString();

  res.status(200).json(record);
});

// PATCH /api/registrations/:id — 200 programme-only change, 400 invalid, 404 unknown.
app.patch("/api/registrations/:id", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const record = registrations.find((r) => String(r.id) === req.params.id);
  if (!record) {
    return res.status(404).json({ error: "No registration found with that id." });
  }

  const errors = validateProgrammeOnly(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: "Validation failed.", details: errors });
  }

  record.programme = req.body.programme;
  record.updatedAt = new Date().toISOString();

  res.status(200).json(record);
});

// DELETE /api/registrations/:id — 204 no body, 404 unknown.
app.delete("/api/registrations/:id", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const index = registrations.findIndex((r) => String(r.id) === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "No registration found with that id." });
  }
  registrations.splice(index, 1);
  res.status(204).end();
});

// =============================================================================
// TASK 2.3 — /inspect diagnostic route
// Echoes back exactly what the server received, regardless of whether the
// body arrived as JSON or as application/x-www-form-urlencoded.
// =============================================================================
app.all("/inspect", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
    query: req.query,
    headers: {
      accept: req.headers["accept"] || null,
      "content-type": req.headers["content-type"] || null,
      cookie: req.headers["cookie"] || null,
      origin: req.headers["origin"] || null,
    },
    body: req.body,
  });
});

// =============================================================================
// TASK 4 — cookie demonstration (NOT a login system)
// =============================================================================
app.get("/api/demo-cookie", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  // HttpOnly -> not readable from JavaScript (document.cookie).
  // SameSite=Lax -> sent on top-level navigation + same-site requests, a
  //                 sensible default that still allows normal use here.
  // Path=/ -> sent on every route under this origin.
  res.cookie("demo_session", crypto.randomUUID(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  res.status(200).json({ message: "Demo cookie set. This is a demonstration, not a login." });
});

app.get("/api/whoami", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const rawCookieHeader = req.headers["cookie"] || null;
  res.status(200).json({
    cookiePresent: Boolean(rawCookieHeader && rawCookieHeader.includes("demo_session")),
    rawCookieHeader,
  });
});

// -----------------------------------------------------------------------
// Fallback 404 for anything else under /api
// -----------------------------------------------------------------------
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Unknown API route." });
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
  console.log(`Allowed browser origin: ${ALLOWED_ORIGIN}`);
});