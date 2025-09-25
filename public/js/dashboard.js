// dashboard.js
import { requireLogin, logoutUser } from "./core/auth.js";
import { getCurrentUser } from "./modules/users.js";
import { renderDashboard } from "./modules/dashboards.js";

document.addEventListener("DOMContentLoaded", () => {
  requireLogin();

  const user = getCurrentUser();
  if (!user) return;

  // Welcome & Role
  document.getElementById("username").textContent = user.name || user.username;
  document.getElementById("roleTag").textContent = `🎭 Your Role: ${user.role}`;

  // Render Cards
  const roleCards = document.getElementById("roleCards");
  renderDashboard(user, roleCards);

  // Banner + Theme
  const banner = document.getElementById("roleBanner");
  const dashboard = document.querySelector(".dashboard");

  switch (user.role) {
    case "Admin":
      dashboard.classList.add("admin-mode");
      banner.textContent = "🔑 Admin/Organiser Panel";
      break;
    case "Government Official":
      dashboard.classList.add("govt-mode");
      banner.textContent = "🏛 Government Official Dashboard";
      break;
    case "Coach":
      dashboard.classList.add("coach-mode");
      banner.textContent = "🧑‍🏫 Coach Dashboard";
      break;
    case "Player":
      dashboard.classList.add("player-mode");
      banner.textContent = "🎮 Player Dashboard";
      break;
    default:
      banner.textContent = "⚠ Unknown Role";
  }

  banner.style.display = "inline-block";

  // Logout
  document.getElementById("logoutBtn").addEventListener("click", logoutUser);
});
