// js/tournaments.js
import { requireLogin } from "./core/auth.js";
import { getCurrentUser } from "./modules/users.js";
import {
  registerForTournament,
  isRegistered,
  getPublishedTournamentsByLocation,
} from "./modules/tournaments.js";

requireLogin();
const user = getCurrentUser();
if (!user || user.role !== "Player") {
  window.location.href = "dashboard.html";
}

let selectedState = "";
let selectedDistrict = "";
let currentList = [];

window.addEventListener("DOMContentLoaded", () => {
  // Use dataset if loaded; otherwise a tiny fallback (dev safety)
  const dataset =
    window.statesAndDistricts && Object.keys(window.statesAndDistricts).length
      ? window.statesAndDistricts
      : fallbackStatesAndDistricts();

  const stateList = document.getElementById("stateList");
  const stateInput = document.getElementById("stateInput");
  const districtList = document.getElementById("districtList");
  const districtInput = document.getElementById("districtInput");
  const stateErr = document.getElementById("stateErr");
  const districtErr = document.getElementById("districtErr");

  // Populate states
  Object.keys(dataset).forEach((state) => {
    const opt = document.createElement("option");
    opt.value = state;
    stateList.appendChild(opt);
  });

  // Clear errors on typing
  stateInput.addEventListener("input", () => (stateErr.textContent = ""));
  districtInput.addEventListener("input", () => (districtErr.textContent = ""));

  // Step 1 → Step 2
  document.getElementById("nextBtn").onclick = () => {
    const raw = stateInput.value || "";
    const canonicalState = matchStateKey(dataset, raw);
    if (!canonicalState) {
      stateErr.textContent = "Please pick a valid state from the list.";
      return;
    }
    selectedState = canonicalState;

    // Populate districts for that state
    districtList.innerHTML = "";
    (dataset[canonicalState] || []).forEach((d) => {
      const opt = document.createElement("option");
      opt.value = d;
      districtList.appendChild(opt);
    });
    districtErr.textContent = "";
    switchStep(2);
  };

  // Show tournaments
  document.getElementById("showBtn").onclick = () => {
    const raw = districtInput.value || "";
    const canonicalDistrict = matchDistrict(dataset, selectedState, raw);
    if (!canonicalDistrict) {
      districtErr.textContent = "Please pick a valid district from the list.";
      return;
    }
    selectedDistrict = canonicalDistrict;

    const adminList = getPublishedTournamentsByLocation(
      selectedState,
      selectedDistrict
    );

    const hint = document.getElementById("fallbackHint");
    if (adminList.length > 0) {
      hint.classList.add("hidden");
      currentList = adminList;
      renderTournaments(currentList);
      return;
    }

    hint.textContent =
      "No admin-published tournaments found. Showing sample list.";
    hint.classList.remove("hidden");
    currentList = makeSampleTournaments(
      selectedState,
      selectedDistrict,
      user?.sport
    );
    renderTournaments(currentList);
  };

  document.getElementById("backToList").onclick = () => {
    switchStep(2);
  };
});

function switchStep(step) {
  document
    .querySelectorAll(".t-step")
    .forEach((s) => s.classList.remove("active"));
  document.querySelector(`.t-step-${step}`).classList.add("active");
}

function makeId(state, district, i) {
  return `t_${state.replace(/\s+/g, "")}_${district.replace(/\s+/g, "")}_${i}`;
}

function makeSampleTournaments(state, district, preferSport) {
  const sports = preferSport
    ? [preferSport, "Football", "Cricket", "Volleyball"]
    : ["Football", "Cricket", "Badminton", "Volleyball"];
  const base = [
    {
      name: `${district} District Championship`,
      venue: `${district} Stadium`,
      description: `District-level open championship for ${district}.`,
    },
    {
      name: `${state} State Cup Qualifiers`,
      venue: `${district} Sports Ground`,
      description: `State Cup qualifiers hosted in ${district}.`,
    },
    {
      name: `${district} Open Invitational`,
      venue: `Indoor Complex, ${district}`,
      description: `Open invitational tournament with multiple categories.`,
    },
  ];
  return base.map((b, i) => {
    const date = new Date();
    date.setDate(date.getDate() + (i + 1) * 7);
    return {
      id: makeId(state, district, i),
      name: b.name,
      date: date.toISOString().slice(0, 10),
      venue: b.venue,
      sport: sports[i % sports.length],
      state,
      district,
      description: b.description,
      needsApproval: false,
      _source: "sample",
    };
  });
}

function renderTournaments(list) {
  switchStep(2);
  const wrap = document.getElementById("tournamentList");
  if (!list.length) {
    wrap.innerHTML = `<div class="tournament-card">No tournaments found.</div>`;
    return;
  }
  wrap.innerHTML = list
    .map(
      (t) => `
      <div class="tournament-card" data-id="${escapeAttr(t.id)}">
        <strong>${escapeHtml(t.name)}</strong><br/>
        <span>${escapeHtml(t.date || "-")}</span> •
        <span>${escapeHtml(t.venue || "-")}</span> •
        <span>${escapeHtml(t.sport || "-")}</span>
      </div>`
    )
    .join("");

  wrap.querySelectorAll(".tournament-card").forEach((card) => {
    card.addEventListener("click", () => {
      const id = card.getAttribute("data-id");
      const t = currentList.find((x) => x.id === id);
      if (t) showDetails(t);
    });
  });
}

function showDetails(t) {
  document.getElementById("dName").textContent = t.name || "-";
  document.getElementById("dDate").textContent = t.date || "-";
  document.getElementById("dVenue").textContent = t.venue || "-";
  document.getElementById("dSport").textContent = t.sport || "-";
  document.getElementById("dDesc").textContent = t.description || "";

  const btn = document.getElementById("registerBtn");
  if (isRegistered(t.id)) {
    btn.textContent = "✅ Registered";
    btn.disabled = true;
  } else {
    btn.textContent = "Register";
    btn.disabled = false;
    btn.onclick = () => {
      const ok = registerForTournament(t);
      if (ok) {
        alert("✅ Registered! See My Tournaments.");
        btn.textContent = "✅ Registered";
        btn.disabled = true;
      }
    };
  }
  switchStep(3);
}

/* ---- Matching helpers (tolerant) ---- */
function canon(s) {
  return String(s || "")
    .trim()
    .toLowerCase();
}
function matchStateKey(dataset, input) {
  const key = canon(input);
  if (!key) return null;
  const states = Object.keys(dataset || {});
  let found = states.find((st) => canon(st) === key);
  if (found) return found;
  found = states.find(
    (st) => canon(st).startsWith(key) || key.startsWith(canon(st))
  );
  if (found) return found;
  found = states.find((st) => canon(st).includes(key));
  return found || null;
}
function matchDistrict(dataset, stateKey, input) {
  if (!stateKey) return null;
  const list = dataset[stateKey] || [];
  const key = canon(input);
  if (!key) return null;
  const norm = list.map((d) => ({
    raw: d,
    full: canon(d),
    base: canon(d.split("(")[0]),
  }));
  let found =
    norm.find((n) => n.full === key) || norm.find((n) => n.base === key);
  if (found) return found.raw;
  found = norm.find(
    (n) =>
      n.full.startsWith(key) ||
      key.startsWith(n.full) ||
      n.base.startsWith(key) ||
      key.startsWith(n.base)
  );
  if (found) return found.raw;
  found = norm.find((n) => n.full.includes(key) || n.base.includes(key));
  return found ? found.raw : null;
}

/* ---- HTML escape helpers ---- */
function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function escapeAttr(str = "") {
  return String(str).replace(/"/g, "&quot;");
}

/* ---- Small fallback dataset if js/districts.js failed to load ---- */
function fallbackStatesAndDistricts() {
  return {
    "Andhra Pradesh": ["Guntur", "Krishna"],
    Delhi: ["Central Delhi", "South Delhi", "West Delhi"],
    Karnataka: ["Bengaluru Urban", "Mysuru"],
    Maharashtra: ["Mumbai Suburban", "Pune"],
    "Tamil Nadu": ["Chennai", "Coimbatore"],
    Telangana: ["Hyderabad", "Warangal"],
  };
}
