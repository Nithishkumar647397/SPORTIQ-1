import { requireLogin } from "./core/auth.js";
import { getCurrentUser } from "./modules/users.js";
import { loadData } from "./core/storage.js";
import {
  addSchedule,
  listSchedulesByCoach,
  listRequestsBySchedule,
  setRequestStatus,
} from "./modules/schedules.js";

document.addEventListener("DOMContentLoaded", () => {
  requireLogin();

  const coach = getCurrentUser();
  if (!coach || coach.role !== "Coach") {
    window.location.href = "dashboard.html";
    return;
  }

  // Elements
  const landing = document.getElementById("schedLanding");
  const createView = document.getElementById("schedCreate");
  const requestsView = document.getElementById("schedRequests");

  const createTile = document.getElementById("createTile");
  const requestsTile = document.getElementById("requestsTile");

  // Create form elements
  const schSport = document.getElementById("schSport");
  const schDate = document.getElementById("schDate");
  const schStart = document.getElementById("schStart");
  const schEnd = document.getElementById("schEnd");
  const schVenue = document.getElementById("schVenue");
  const schEntrance = document.getElementById("schEntrance");
  const formMsg = document.getElementById("formMsg");

  const saveBtn = document.getElementById("saveSchedule");
  const cancelBtn = document.getElementById("cancelCreate");

  // My schedules list
  const mySchedulesList = document.getElementById("mySchedulesList");
  const mySchedulesEmpty = document.getElementById("mySchedulesEmpty");

  // Requests view elements
  const coachSchedulesGrid = document.getElementById("coachSchedulesGrid");
  const coachSchedulesEmpty = document.getElementById("coachSchedulesEmpty");
  const requestsGrid = document.getElementById("requestsGrid");
  const noRequestsMsg = document.getElementById("noRequestsMsg");

  const DEFAULT_AVATAR =
    "https://cdn-icons-png.flaticon.com/512/149/149071.png";

  // Venues list (generic)
  const VENUES = [
    "National Sports Complex",
    "City Stadium",
    "Indoor Arena",
    "University Ground",
    "High School Field",
  ];

  // Prefill sport and venues
  schSport.value = coach.sport || "-";
  schVenue.innerHTML =
    `<option value="">Select venue</option>` +
    VENUES.map((v) => `<option value="${v}">${v}</option>`).join("");

  // Views
  function show(view) {
    landing.classList.add("hidden");
    createView.classList.add("hidden");
    requestsView.classList.add("hidden");
    if (view === "landing") landing.classList.remove("hidden");
    if (view === "create") createView.classList.remove("hidden");
    if (view === "requests") requestsView.classList.remove("hidden");
  }

  createTile.addEventListener("click", () => show("create"));
  requestsTile.addEventListener("click", () => {
    show("requests");
    renderCoachSchedules();
    clearRequestsPanel();
  });

  cancelBtn.addEventListener("click", () => {
    clearForm();
    show("landing");
  });

  function clearForm() {
    schDate.value = "";
    schStart.value = "";
    schEnd.value = "";
    schVenue.value = "";
    schEntrance.value = "";
    formMsg.textContent = "";
  }

  function validateForm() {
    const date = schDate.value;
    const start = schStart.value;
    const entrance = schEntrance.value;
    const venue = schVenue.value;

    if (!date || !start || !venue || !entrance) {
      formMsg.textContent =
        "Please fill all required fields (Date, Start time, Venue, Entrance).";
      return null;
    }

    // Optional end time validation
    const end = schEnd.value;
    if (end && start && end <= start) {
      formMsg.textContent = "End time must be after start time.";
      return null;
    }

    formMsg.textContent = "";
    return {
      date,
      startTime: start,
      endTime: end || "",
      venue,
      entrance,
    };
  }

  // Save schedule
  saveBtn.addEventListener("click", () => {
    const vals = validateForm();
    if (!vals) return;

    addSchedule({
      coachId: coach.id,
      sport: coach.sport || "",
      date: vals.date,
      startTime: vals.startTime,
      endTime: vals.endTime,
      venue: vals.venue,
      entrance: vals.entrance,
    });

    // Update UI immediately
    renderMySchedules();
    renderCoachSchedules(); // keep requests-view in sync too
    clearForm();
  });

  // Render My schedules (right side in Create view)
  function renderMySchedules() {
    const list = listSchedulesByCoach(coach.id);
    mySchedulesList.innerHTML = "";

    if (!list.length) {
      mySchedulesEmpty.classList.remove("hidden");
      return;
    }
    mySchedulesEmpty.classList.add("hidden");

    list.forEach((s) => {
      const card = document.createElement("div");
      card.className = "schedule-card";
      card.innerHTML = `
        <h4>${escapeHTML(s.venue)}</h4>
        <p><strong>${escapeHTML(s.sport)}</strong></p>
        <p>${escapeHTML(s.date)} • ${escapeHTML(s.startTime)}${
        s.endTime ? " - " + escapeHTML(s.endTime) : ""
      }</p>
        <div class="meta">
          <span class="badge ${s.entrance === "OPEN" ? "approved" : "pending"}">
            ${s.entrance === "OPEN" ? "Open to all" : "Approval needed"}
          </span>
        </div>
      `;
      mySchedulesList.appendChild(card);
    });
  }

  // Requests view: left schedules
  function renderCoachSchedules() {
    const list = listSchedulesByCoach(coach.id);
    coachSchedulesGrid.innerHTML = "";

    if (!list.length) {
      coachSchedulesEmpty.classList.remove("hidden");
      return;
    }
    coachSchedulesEmpty.classList.add("hidden");

    list.forEach((s) => {
      const card = document.createElement("div");
      card.className = "schedule-card";
      card.tabIndex = 0;
      card.innerHTML = `
        <h4>${escapeHTML(s.venue)}</h4>
        <p><strong>${escapeHTML(s.sport)}</strong></p>
        <p>${escapeHTML(s.date)} • ${escapeHTML(s.startTime)}${
        s.endTime ? " - " + escapeHTML(s.endTime) : ""
      }</p>
        <div class="meta">
          <span class="badge ${s.entrance === "OPEN" ? "approved" : "pending"}">
            ${s.entrance === "OPEN" ? "Open to all" : "Approval needed"}
          </span>
        </div>
      `;
      card.addEventListener("click", () => loadRequestsFor(s.id));
      card.addEventListener("keypress", (e) => {
        if (e.key === "Enter") loadRequestsFor(s.id);
      });
      coachSchedulesGrid.appendChild(card);
    });
  }

  function clearRequestsPanel() {
    noRequestsMsg.classList.remove("hidden");
    requestsGrid.innerHTML = "";
  }

  function loadRequestsFor(scheduleId) {
    const reqs = listRequestsBySchedule(scheduleId, "PENDING");
    requestsGrid.innerHTML = "";

    if (!reqs.length) {
      clearRequestsPanel();
      return;
    }

    noRequestsMsg.classList.add("hidden");

    // Build a map of users for quick lookup
    const users = loadData().users || [];
    const userById = new Map(users.map((u) => [u.id, u]));

    reqs.forEach((rq) => {
      const player = userById.get(rq.playerId);
      const age = calcAge(player?.dob);
      const photo = player?.profilePic || DEFAULT_AVATAR;

      const card = document.createElement("div");
      card.className = "request-card";
      card.innerHTML = `
        <div>
          <h5>${escapeHTML(player?.name || player?.username || "Player")}</h5>
          <p><strong>Sport:</strong> ${escapeHTML(player?.sport || "-")}</p>
          <p><strong>Age:</strong> ${age != null ? age : "-"}</p>
        </div>
        <div class="request-photo">
          <img src="${photo}" alt="player photo" />
        </div>
        <div class="request-actions">
          <button class="btn-tiny edit" data-act="approve" data-id="${
            rq.id
          }">Approve</button>
          <button class="btn-tiny danger" data-act="reject" data-id="${
            rq.id
          }">Reject</button>
        </div>
      `;
      requestsGrid.appendChild(card);
    });

    // Bind actions
    requestsGrid.querySelectorAll("button[data-act]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const act = btn.getAttribute("data-act");
        setRequestStatus(id, act === "approve" ? "APPROVED" : "REJECTED");
        // Re-render pending list
        loadRequestsFor(scheduleId);
      });
    });
  }

  function calcAge(dob) {
    if (!dob) return null;
    const today = new Date();
    const birth = new Date(dob);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }

  function escapeHTML(str = "") {
    return String(str).replace(
      /[&<>"']/g,
      (m) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        }[m])
    );
  }

  // Initial view
  show("landing");
  renderMySchedules(); // keep create-view list ready
});
