export const ReportsUI = (() => {
  function setText(id, value, fallback = "—") {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = value ?? fallback;
  }

  function setAttendanceBar(pct) {
    const bar = document.getElementById("attendanceBar");
    if (!bar) return;
    const val = typeof pct === "number" ? pct : 0;
    bar.style.width = `${Math.max(0, Math.min(100, val))}%`;
  }

  function clearSkeletons() {
    document.querySelectorAll("[data-skel]").forEach((el) => {
      el.classList.remove("animate-pulse");
      // If you added utility classes to fake skeletons, remove them here too:
      el.classList.remove("bg-white/10");
    });
  }

  function render(state) {
    const { kpis } = state;

    // Attendance
    const attText =
      typeof kpis.attendanceRatePct === "number"
        ? `${kpis.attendanceRatePct}%`
        : "No data";
    setText("attendanceValue", attText);
    setAttendanceBar(kpis.attendanceRatePct);

    // Achievements badges
    setText("achApproved", `${kpis.achievementsApproved} Approved`);
    setText("achPending", `${kpis.achievementsPending} Pending`);

    // Active players
    setText("activePlayersValue", `${kpis.activePlayersThisWeek}`);

    // Upcoming sessions
    setText("upcomingValue", `${kpis.upcomingSessions7d}`);

    // Registrations breakdown
    setText("regPending", `${kpis.regPending} Pending`);
    setText("regConfirmed", `${kpis.regConfirmed} Confirmed`);
  }

  return { render, clearSkeletons };
})();
