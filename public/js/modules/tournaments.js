// js/modules/tournaments.js
import { getCurrentUser, updateCurrentUser } from "./users.js";
import { loadData, saveData } from "../core/storage.js";

/* Ensure user array exists */
function ensureArray() {
  const u = getCurrentUser();
  if (!u) throw new Error("No user");
  const list = Array.isArray(u.registeredTournaments)
    ? u.registeredTournaments
    : [];
  if (!Array.isArray(u.registeredTournaments))
    updateCurrentUser({ registeredTournaments: list });
  return list;
}

/* Format date range for admin tournaments */
function formatRange(startISO, endISO) {
  if (!startISO) return "";
  const s = new Date(startISO);
  const e = endISO ? new Date(endISO) : null;

  const dateOpts = { year: "numeric", month: "short", day: "numeric" };
  const timeOpts = { hour: "2-digit", minute: "2-digit" };
  const sDate = s.toLocaleDateString(undefined, dateOpts);
  const sTime = s.toLocaleTimeString(undefined, timeOpts);

  if (!e) return `${sDate} ${sTime}`;
  const eDate = e.toLocaleDateString(undefined, dateOpts);
  const eTime = e.toLocaleTimeString(undefined, timeOpts);
  if (s.toDateString() === e.toDateString()) {
    return `${sDate} ${sTime}–${eTime}`;
  }
  return `${sDate} ${sTime} → ${eDate} ${eTime}`;
}

/* Player: get published tournaments by location (Admin-created) */
export function getPublishedTournamentsByLocation(state, district) {
  const data = loadData();
  const list = (data.tournaments || [])
    .filter(
      (t) =>
        t.status === "PUBLISHED" && t.state === state && t.district === district
    )
    .sort((a, b) =>
      (a.startDateTime || "").localeCompare(b.startDateTime || "")
    )
    .map((t) => ({
      id: t.id,
      name: t.name,
      sport: t.sport,
      venue: t.venue,
      state: t.state,
      district: t.district,
      description: t.description || "",
      date: formatRange(t.startDateTime, t.endDateTime),
      startDateTime: t.startDateTime,
      endDateTime: t.endDateTime,
      needsApproval: !!t.needsApproval,
      _source: "admin",
    }));

  return list;
}

export function listMyTournaments() {
  const list = ensureArray();
  return list
    .slice()
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
}

/* Treat PENDING/CONFIRMED as already registered */
export function isRegistered(tournamentId) {
  const list = ensureArray();
  return list.some((t) => t.id === tournamentId && t.regStatus !== "REJECTED");
}

/* Register, respecting needsApproval (admin tournaments) */
export function registerForTournament(t) {
  const list = ensureArray();
  if (!t?.id) throw new Error("Tournament must have an id");

  const idx = list.findIndex((x) => x.id === t.id);
  const needsApproval = !!t.needsApproval;
  const desiredStatus = needsApproval ? "PENDING" : "CONFIRMED";

  if (idx !== -1) {
    // If previously rejected, allow re-apply by updating status; otherwise block
    if (list[idx].regStatus === "REJECTED") {
      const updated = {
        ...list[idx],
        regStatus: desiredStatus,
        registeredAt: new Date().toISOString(),
      };
      const copy = list.slice();
      copy[idx] = updated;
      updateCurrentUser({ registeredTournaments: copy });
      return true;
    }
    return false;
  }

  const entry = {
    id: t.id,
    name: t.name,
    date: t.date, // formatted string (for admin: from start/end)
    venue: t.venue,
    sport: t.sport,
    state: t.state,
    district: t.district,
    description: t.description || "",
    registeredAt: new Date().toISOString(),
    reminder: false,
    // NEW
    regStatus: desiredStatus, // PENDING | CONFIRMED | REJECTED
  };

  const updated = [...list, entry];
  updateCurrentUser({ registeredTournaments: updated });
  return true;
}

/* Toggle reminder unchanged */
export function toggleReminder(tournamentId) {
  const u = getCurrentUser();
  if (!u) return;
  const list = Array.isArray(u.registeredTournaments)
    ? u.registeredTournaments
    : [];
  const updated = list.map((t) =>
    t.id === tournamentId ? { ...t, reminder: !t.reminder } : t
  );
  updateCurrentUser({ registeredTournaments: updated });
  return updated.find((t) => t.id === tournamentId)?.reminder || false;
}

/* Admin helper: set registration status on a user's embedded registration */
export function setRegistrationStatus(
  userId,
  tournamentId,
  status,
  reason = "",
  deciderId = ""
) {
  const allowed = new Set(["PENDING", "CONFIRMED", "REJECTED"]);
  const s = String(status || "").toUpperCase();
  if (!allowed.has(s)) throw new Error("Invalid status");

  const data = loadData();
  const uIdx = (data.users || []).findIndex((u) => u.id === userId);
  if (uIdx === -1) return false;

  const list = Array.isArray(data.users[uIdx].registeredTournaments)
    ? data.users[uIdx].registeredTournaments
    : [];
  const rIdx = list.findIndex((r) => r.id === tournamentId);
  if (rIdx === -1) return false;

  const updated = {
    ...list[rIdx],
    regStatus: s,
    regDecisionReason: s === "REJECTED" ? reason : "",
    regDecisionAt: new Date().toISOString(),
    regDecisionBy: deciderId || "",
  };

  data.users[uIdx].registeredTournaments = [
    ...list.slice(0, rIdx),
    updated,
    ...list.slice(rIdx + 1),
  ];
  saveData(data);
  return true;
}

/* ...existing code... */

export function listRegistrationsForTournament(tournamentId) {
  const data = loadData();
  const users = data.users || [];
  const players = users.filter((u) => u.role === "Player");
  const out = [];

  players.forEach((u) => {
    const regs = Array.isArray(u.registeredTournaments)
      ? u.registeredTournaments
      : [];
    const r = regs.find((x) => x.id === tournamentId);
    if (!r) return;

    const normStatus = (r.regStatus || "CONFIRMED").toUpperCase();

    out.push({
      userId: u.id,
      name: u.name || u.username || "Player",
      email: u.email || "",
      mobile: u.mobile || "",
      sport: u.sport || "",
      avatar: u.profilePic || "",
      registeredAt: r.registeredAt || "",
      regStatus: normStatus, // PENDING | CONFIRMED | REJECTED
      regDecisionAt: r.regDecisionAt || "",
      regDecisionBy: r.regDecisionBy || "",
      regDecisionReason: r.regDecisionReason || "",
    });
  });

  return out;
}
