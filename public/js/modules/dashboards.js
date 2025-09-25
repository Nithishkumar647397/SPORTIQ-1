import { loadData } from "../core/storage.js";

export const dashboardConfig = {
  Player: [
    { icon: "kbtmbyzy", label: "Tournaments", link: "tournament.html" },
    { icon: "dxjqoygy", label: "My Profile", link: "profile.html" },
    { icon: "uqpazftn", label: "Achievements", link: "achievements.html" },
    { icon: "vusrdugn", label: "My Sport", link: "#" },
  ],

  Coach: [
    { icon: "msoeawqm", label: "View Players", link: "viewPlayers.html" },
    {
      icon: "hjeefwhm",
      label: "Verify Achievements",
      link: "coachVerify.html",
    },
    { icon: "abgtphux", label: "Schedules", link: "schedules.html" },
    { icon: "yqzmiobz", label: "Reports", link: "reports.html" },
  ],

  Admin: [
    {
      icon: "abgtphux",
      label: "Create Tournament/Event",
      link: "admintournament.html",
      color: "#dc2626",
    },
    {
      icon: "ajkxzzfb",
      label: "Manage Registrations",
      link: "adminregistrations.html",
      color: "#dc2626",
    },
    { icon: "qvyppzqz", label: "Upload Results", link: "#", color: "#dc2626" },
    { icon: "lupuorrc", label: "Announcements", link: "#", color: "#dc2626" },
  ],

  "Government Official": [
    {
      icon: "hjeefwhm",
      label: "Verification",
      link: "govverifiy.html",
      color: "#9333ea",
    } /* updated */,
    { icon: "ajkxzzfb", label: "Player Reports", link: "#", color: "#9333ea" },
    { icon: "oezixobx", label: "Analytics", link: "#", color: "#9333ea" },
    { icon: "uqpazftn", label: "Tournaments", link: "#", color: "#9333ea" },
  ],
};

export function renderDashboard(user, container) {
  const roleDashboard = dashboardConfig[user.role] || [];
  container.innerHTML = "";

  roleDashboard.forEach((card) => {
    const el = document.createElement("a");
    el.href = card.link;
    el.className = "card-box";
    el.style.position = "relative";

    const accent = card.color
      ? `colors="primary:#111,secondary:${card.color}"`
      : "";

    el.innerHTML = `
      <lord-icon src="https://cdn.lordicon.com/${card.icon}.json"
        trigger="hover" ${accent}
        style="width:70px;height:70px">
      </lord-icon>
      <h3>${card.label}</h3>
    `;

    // Admin pending registrations badge (already implemented earlier in your flow)
    if (user.role === "Admin" && card.label === "Manage Registrations") {
      const pending = countPendingRegistrations(user.id);
      addBadge(el, pending);
    }

    // Government Official pending approvals badge (SUBMITTED tournaments)
    if (user.role === "Government Official" && card.label === "Verification") {
      const pending = countPendingApprovalsForOfficial(user);
      addBadge(el, pending);
    }

    container.appendChild(el);
  });
}

function addBadge(tileEl, count) {
  if (count > 0) {
    const badge = document.createElement("span");
    badge.className = "badge pending";
    badge.textContent = count;
    badge.style.position = "absolute";
    badge.style.top = "8px";
    badge.style.right = "8px";
    tileEl.appendChild(badge);
  }
}

// Admin: total pending registrations
function countPendingRegistrations(adminId) {
  const data = loadData();
  const myIds = new Set(
    (data.tournaments || [])
      .filter((t) => t.createdBy === adminId)
      .map((t) => t.id)
  );
  let count = 0;
  (data.users || []).forEach((u) => {
    if (u.role !== "Player") return;
    (u.registeredTournaments || []).forEach((r) => {
      if (
        myIds.has(r.id) &&
        String(r.regStatus || "CONFIRMED").toUpperCase() === "PENDING"
      ) {
        count++;
      }
    });
  });
  return count;
}

// Government Official: count SUBMITTED tournaments by inferred region; if none, count all
function countPendingApprovalsForOfficial(official) {
  const data = loadData();
  const addr = String(official.address || "").toLowerCase();
  const ts = (data.tournaments || []).filter((t) => t.status === "SUBMITTED");
  if (!addr) return ts.length;

  // simple contains match against state/district strings
  const count = ts.filter((t) => {
    const st = String(t.state || "").toLowerCase();
    const di = String(t.district || "").toLowerCase();
    if (st && !addr.includes(st)) return false;
    if (di && !addr.includes(di)) return false;
    return true;
  }).length;

  return count || ts.length; // fallback to all if nothing matched
}
