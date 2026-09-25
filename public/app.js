/**
 * app.js — wires up the registration form and the diagnostics panel.
 * Loaded as <script type="module" src="app.js"> from index.html.
 */
import {
  fetchCourses,
  createRegistration,
  inspectJson,
  inspectFormEncoded,
  setDemoCookie,
  whoAmI,
} from "./api.js";

const PROGRAMME_STORAGE_KEY = "ict461:preferredProgramme";

const form = document.getElementById("registration-form");
const nameInput = document.getElementById("name");
const studentIdInput = document.getElementById("studentId");
const programmeSelect = document.getElementById("programme");
const courseSelect = document.getElementById("course");
const submitButton = document.getElementById("submit-button");
const statusEl = document.getElementById("form-status");
const preferenceStatusEl = document.getElementById("preference-status");
const clearPreferenceButton = document.getElementById("clear-preference");

// ---------------------------------------------------------------------------
// Task 1.3 — localStorage stores ONLY the programme preference, nothing else.
// ---------------------------------------------------------------------------
function restoreProgrammePreference() {
  const saved = window.localStorage.getItem(PROGRAMME_STORAGE_KEY);
  if (saved) {
    programmeSelect.value = saved;
    preferenceStatusEl.textContent = `Restored from a previous visit: "${saved}".`;
  } else {
    preferenceStatusEl.textContent = "No saved preference yet.";
  }
}

function saveProgrammePreference(programme) {
  window.localStorage.setItem(PROGRAMME_STORAGE_KEY, programme);
}

clearPreferenceButton.addEventListener("click", () => {
  window.localStorage.removeItem(PROGRAMME_STORAGE_KEY);
  preferenceStatusEl.textContent = "Saved preference cleared.";
});

// ---------------------------------------------------------------------------
// Populate the course dropdown from the API on load.
// ---------------------------------------------------------------------------
async function loadCourses() {
  courseSelect.innerHTML = '<option value="">Loading courses…</option>';
  try {
    const response = await fetchCourses();
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }
    const courses = await response.json();

    courseSelect.innerHTML = '<option value="">Select a course</option>';
    for (const course of courses) {
      const option = document.createElement("option");
      option.value = course.code;
      option.textContent = `${course.code} — ${course.name}`;
      courseSelect.appendChild(option);
    }
  } catch (err) {
    courseSelect.innerHTML = '<option value="">Could not load courses</option>';
    setStatus(
      "Could not load the course list. Check that the API is running on http://localhost:3000.",
      "error"
    );
  }
}

// ---------------------------------------------------------------------------
// Visible, accessible status messages (loading / success / error).
// ---------------------------------------------------------------------------
function setStatus(message, kind) {
  statusEl.textContent = message;
  statusEl.classList.remove("is-error", "is-success");
  if (kind === "error") statusEl.classList.add("is-error");
  if (kind === "success") statusEl.classList.add("is-success");
}

// ---------------------------------------------------------------------------
// Form submit — client-side required fields are a convenience only; the
// server (server.js) revalidates everything independently.
// ---------------------------------------------------------------------------
form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    name: nameInput.value.trim(),
    studentId: studentIdInput.value.trim(),
    programme: programmeSelect.value,
    course: courseSelect.value,
  };

  submitButton.disabled = true;
  setStatus("Registering…", "");

  try {
    const response = await createRegistration(payload);

    if (response.status === 201) {
      const record = await response.json();
      setStatus(
        `Registered. Confirmation ID ${record.id} for ${record.course}.`,
        "success"
      );
      saveProgrammePreference(payload.programme);
      nameInput.value = "";
      studentIdInput.value = "";
      // Programme and course are left as-is so the student can see what
      // was just submitted and register again for a different course.
    } else if (response.status === 400) {
      const body = await response.json();
      setStatus(`Please fix: ${body.details.join(" ")}`, "error");
    } else if (response.status === 409) {
      const body = await response.json();
      setStatus(body.details[0] || "This registration already exists.", "error");
    } else {
      setStatus(`Unexpected response (status ${response.status}).`, "error");
    }
  } catch (err) {
    setStatus(
      "Could not reach the API. Check that the server is running on http://localhost:3000.",
      "error"
    );
  } finally {
    submitButton.disabled = false;
  }
});

// ---------------------------------------------------------------------------
// Diagnostics panel — Task 2.3 (/inspect) and Task 4.1 (cookies).
// Purely illustrative: shows the raw JSON the API sent back so the shape
// of the request/response is visible without opening DevTools.
// ---------------------------------------------------------------------------
const inspectOutput = document.getElementById("inspect-output");
const cookieOutput = document.getElementById("cookie-output");

document.getElementById("inspect-json").addEventListener("click", async () => {
  inspectOutput.textContent = "Sending…";
  try {
    const response = await inspectJson({ example: "value", sentAs: "json" });
    const body = await response.json();
    inspectOutput.textContent = JSON.stringify(body, null, 2);
  } catch (err) {
    inspectOutput.textContent = "Request failed. Is the API running?";
  }
});

document.getElementById("inspect-form").addEventListener("click", async () => {
  inspectOutput.textContent = "Sending…";
  try {
    const response = await inspectFormEncoded({ example: "value", sentAs: "form" });
    const body = await response.json();
    inspectOutput.textContent = JSON.stringify(body, null, 2);
  } catch (err) {
    inspectOutput.textContent = "Request failed. Is the API running?";
  }
});

document.getElementById("set-cookie").addEventListener("click", async () => {
  cookieOutput.textContent = "Sending…";
  try {
    const response = await setDemoCookie();
    const body = await response.json();
    cookieOutput.textContent =
      JSON.stringify(body, null, 2) +
      "\n\nOpen DevTools → Application → Cookies to see it stored. " +
      "It will not appear in document.cookie because it is HttpOnly.";
  } catch (err) {
    cookieOutput.textContent = "Request failed. Is the API running?";
  }
});

document.getElementById("check-cookie").addEventListener("click", async () => {
  cookieOutput.textContent = "Sending…";
  try {
    const response = await whoAmI();
    const body = await response.json();
    cookieOutput.textContent = JSON.stringify(body, null, 2);
  } catch (err) {
    cookieOutput.textContent = "Request failed. Is the API running?";
  }
});

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
restoreProgrammePreference();
loadCourses();