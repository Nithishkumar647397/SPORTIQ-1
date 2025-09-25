import API from "./api.js";
import { requireLogin } from "./core/auth.js";
import { loadData, saveData } from "./core/storage.js";
import { getCurrentUser } from "./modules/users.js";
import { ReportsStore } from "./modules/reports.store.js";
import { ReportsUI } from "./modules/reports.ui.js";

// Minimal bridge to mirror backend user into localStorage (profile fields only)
function syncLocalSession(apiUser) {
  if (!apiUser || !apiUser.id) return;
  const data = loadData();

  if (!Array.isArray(data.users)) data.users = [];
  let u = data.users.find((x) => x.id === apiUser.id);

  const profileFields = [
    "username",
    "email",
    "name",
    "dob",
    "gender",
    "mobile",
    "role",
    "sport",
    "profilePic",
    "height",
    "weight",
    "bloodgroup",
    "address",
  ];

  if (!u) {
    u = { id: apiUser.id, achievements: [], registeredTournaments: [] };
    data.users.push(u);
  }

  profileFields.forEach((k) => {
    if (apiUser[k] !== undefined) u[k] = apiUser[k];
  });

  // Maintain arrays as-is (init if missing)
  if (!Array.isArray(u.achievements)) u.achievements = [];
  if (!Array.isArray(u.registeredTournaments)) u.registeredTournaments = [];

  data.currentUser = apiUser.id;
  saveData(data);
}

async function seedLocalFromBackendIfAvailable() {
  try {
    const me = await API.me();
    if (me) syncLocalSession(me);
  } catch {
    // Backend not available or session not present — continue local-first
  }
}

function setupChips() {
  const chips = document.querySelectorAll(".chip");
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      chips.forEach((c) => c.classList.remove("bg-primary/20", "text-white"));
      chip.classList.add("bg-primary/20", "text-white");
      // UI-only placeholder; range is stored, but KPIs are computed 30D style for now
      ReportsStore.setRange(chip.dataset.range || "30d");
    });
  });
}

function setupLazySections() {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("opacity-100", "translate-y-0");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );
  document.querySelectorAll("[data-lazy]").forEach((el) => {
    el.classList.add("opacity-0", "translate-y-2", "transition");
    io.observe(el);
  });
}

function removeSkeletonsOnceLoaded() {
  setTimeout(() => {
    ReportsUI.clearSkeletons();
  }, 300);
}

async function init() {
  // Try to seed local session from backend (non-blocking for legacy)
  await seedLocalFromBackendIfAvailable();

  // Local guard (legacy policy)
  requireLogin();
  const me = getCurrentUser();
  if (!me || me.role !== "Coach") {
    window.location.href = "dashboard.html";
    return;
  }
  setupChips();
  setupLazySections();

  ReportsStore.subscribe((state) => ReportsUI.render(state));
  ReportsStore.init();
  removeSkeletonsOnceLoaded();
}

document.addEventListener("DOMContentLoaded", init);
