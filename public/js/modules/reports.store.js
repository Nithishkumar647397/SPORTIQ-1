// Local-only data store for Reports (placeholder; swap to API later)
import { loadData } from "../core/storage.js";
import { getCurrentUser } from "./users.js";

const DAY = 24 * 60 * 60 * 1000;

function inLast(dtIso, days) {
  if (!dtIso) return false;
  const t = Date.parse(dtIso);
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= days * DAY;
}

function isNextNDays(dateStr, timeStr, n) {
  if (!dateStr) return false;
  const dt = timeStr
    ? new Date(`${dateStr}T${timeStr}`)
    : new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(+dt)) return false;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + n * DAY);
  return dt >= start && dt <= end;
}

function dedupe(arr) {
  return [...new Set(arr)];
}

export const ReportsStore = (() => {
  let state = {
    range: "30d",
    kpis: {
      attendanceRatePct: null,
      achievementsApproved: 0,
      achievementsPending: 0,
      activePlayersThisWeek: 0,
      upcomingSessions7d: 0,
      regPending: 0,
      regConfirmed: 0,
    },
  };

  const subs = new Set();

  function notify() {
    subs.forEach((fn) => fn(state));
  }

  function setRange(range) {
    state.range = range;
    compute();
  }

  function compute() {
    const data = loadData();
    const coach = getCurrentUser();

    if (!coach || coach.role !== "Coach") {
      state.kpis = {
        attendanceRatePct: null,
        achievementsApproved: 0,
        achievementsPending: 0,
        activePlayersThisWeek: 0,
        upcomingSessions7d: 0,
        regPending: 0,
        regConfirmed: 0,
      };
      return notify();
    }

    const users = data.users || [];
    const players = users.filter(
      (u) => u.role === "Player" && u.sport === coach.sport
    );

    // 1) Achievements (Approved vs Pending) across players in coach.sport
    let achApproved = 0;
    let achPending = 0;
    for (const p of players) {
      const ach = Array.isArray(p.achievements) ? p.achievements : [];
      for (const a of ach) {
        const status =
          a?.status || (a?.verified === true ? "APPROVED" : "PENDING");
        if (status === "APPROVED") achApproved += 1;
        else if (status === "PENDING") achPending += 1;
      }
    }

    // 2) Attendance rate (placeholder): use scheduleRequests for this coach's schedules (last 30 days)
    const schedules = (data.schedules || []).filter(
      (s) => s.coachId === coach.id
    );
    const scheduleIds = new Set(schedules.map((s) => s.id));
    const sreq = (data.scheduleRequests || []).filter((r) =>
      scheduleIds.has(r.scheduleId)
    );

    const sreq30d = sreq.filter((r) => inLast(r.createdAt, 30));
    const totalReq = sreq30d.length;
    const approvedReq = sreq30d.filter((r) => r.status === "APPROVED").length;
    const attendanceRate =
      totalReq > 0 ? Math.round((approvedReq / totalReq) * 100) : null;

    // 3) Active players this week: unique players with any request (APPROVED or PENDING) in last 7 days
    const activePlayers = dedupe(
      sreq
        .filter(
          (r) =>
            inLast(r.createdAt, 7) &&
            (r.status === "APPROVED" || r.status === "PENDING")
        )
        .map((r) => r.playerId)
    ).length;

    // 4) Upcoming sessions next 7 days
    const upcoming7d = schedules.filter((s) =>
      isNextNDays(s.date, s.startTime, 7)
    ).length;

    // 5) Tournament registrations breakdown across players in coach.sport
    let regPending = 0;
    let regConfirmed = 0;
    for (const p of players) {
      const regs = Array.isArray(p.registeredTournaments)
        ? p.registeredTournaments
        : [];
      for (const rt of regs) {
        const status = rt?.regStatus || "CONFIRMED"; // default per PRD
        if (status === "PENDING") regPending += 1;
        if (status === "CONFIRMED") regConfirmed += 1;
      }
    }

    state.kpis = {
      attendanceRatePct: attendanceRate, // null when no data
      achievementsApproved: achApproved,
      achievementsPending: achPending,
      activePlayersThisWeek: activePlayers,
      upcomingSessions7d: upcoming7d,
      regPending,
      regConfirmed,
    };

    notify();
  }

  function subscribe(fn) {
    subs.add(fn);
    return () => subs.delete(fn);
  }

  function init() {
    compute();
  }

  return { init, subscribe, setRange, getState: () => state };
})();
