/**
 * api.js — Fetch helpers for the course registration API.
 *
 * This file is imported into app.js as an ES module:
 *   <script type="module" src="app.js"></script>
 *   import { fetchCourses, createRegistration, ... } from "./api.js";
 *
 * It deliberately does no DOM work — its only job is talking to the API
 * at http://localhost:3000 and handing back a Response (or throwing).
 */

export const API_BASE = "http://localhost:3000";

/**
 * GET /api/courses
 * The browser handles ETag / If-None-Match revalidation automatically
 * once the server sends Cache-Control + ETag (see server.js). Nothing
 * special has to be done here for that to work — open DevTools > Network
 * and reload twice to see the second request come back 304.
 */
export function fetchCourses() {
  return fetch(`${API_BASE}/api/courses`);
}

/** GET /api/registrations/:id */
export function fetchRegistration(id) {
  return fetch(`${API_BASE}/api/registrations/${encodeURIComponent(id)}`);
}

/** POST /api/registrations — used by the main registration form. */
export function createRegistration(data) {
  return fetch(`${API_BASE}/api/registrations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

/** PUT /api/registrations/:id — full replace. */
export function replaceRegistration(id, data) {
  return fetch(`${API_BASE}/api/registrations/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

/** PATCH /api/registrations/:id — programme only. */
export function updateProgramme(id, programme) {
  return fetch(`${API_BASE}/api/registrations/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ programme }),
  });
}

/** DELETE /api/registrations/:id */
export function deleteRegistration(id) {
  return fetch(`${API_BASE}/api/registrations/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

/**
 * POST /inspect with a JSON body — used by the diagnostics panel to show
 * students exactly what the server received.
 */
export function inspectJson(payload) {
  return fetch(`${API_BASE}/inspect`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
}

/**
 * POST /inspect with a form-encoded body — same endpoint, different
 * Content-Type, so students can compare how Express parses each one.
 */
export function inspectFormEncoded(payload) {
  const params = new URLSearchParams(payload);
  return fetch(`${API_BASE}/inspect`, {
    method: "POST",
    body: params, // fetch sets Content-Type: application/x-www-form-urlencoded automatically
  });
}

/**
 * GET /api/demo-cookie — sets a non-sensitive HttpOnly cookie.
 * credentials: "include" is required for the browser to store/send a
 * cross-port cookie between :5500 and :3000.
 */
export function setDemoCookie() {
  return fetch(`${API_BASE}/api/demo-cookie`, { credentials: "include" });
}

/** GET /api/whoami — reports back whether the demo cookie came with the request. */
export function whoAmI() {
  return fetch(`${API_BASE}/api/whoami`, { credentials: "include" });
}
