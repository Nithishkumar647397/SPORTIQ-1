export const STORAGE_KEY = "sportiqData";

export function loadData() {
  const base = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
    users: [],
    currentUser: null,
  };

  // Non-breaking defaults for new modules
  if (!Array.isArray(base.schedules)) base.schedules = [];
  if (!Array.isArray(base.scheduleRequests)) base.scheduleRequests = [];
  if (!Array.isArray(base.tournaments)) base.tournaments = [];

  // Ensure users/currentUser keys exist (defensive)
  if (!Array.isArray(base.users)) base.users = [];
  if (!("currentUser" in base)) base.currentUser = null;

  return base;
}

export function saveData(data) {
  // Ensure arrays exist before saving (safety)
  if (!Array.isArray(data.users)) data.users = [];
  if (!Array.isArray(data.schedules)) data.schedules = [];
  if (!Array.isArray(data.scheduleRequests)) data.scheduleRequests = [];
  if (!Array.isArray(data.tournaments)) data.tournaments = [];
  if (!("currentUser" in data)) data.currentUser = null;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
