// js/mytournaments.js
import { requireLogin } from "./core/auth.js";
import { getCurrentUser } from "./modules/users.js";
import { listMyTournaments, toggleReminder } from "./modules/tournaments.js";

requireLogin();
const user = getCurrentUser();
if (!user || user.role !== "Player") {
  window.location.href = "dashboard.html";
}

const listEl = document.getElementById("myTournamentsList");

function render() {
  const list = listMyTournaments();
  if (!list.length) {
    listEl.innerHTML = `
      <div class="tournament-card">
        No registered tournaments yet.
        <div class="btn-group" style="margin-top:10px;">
          <a class="btn-small" href="find-tournament.html">+ Find Tournaments</a>
        </div>
      </div>`;
    return;
  }

  listEl.innerHTML = list
    .map((t) => {
      const status = normalizeStatus(t.regStatus);
      const meta = statusMeta(status);
      return `
      <div class="tournament-card" data-id="${escapeAttr(t.id)}">
        <div class="t-card-top">
          <strong>${escapeHtml(t.name)}</strong>
          <button class="bell-btn" title="Toggle reminder" data-action="reminder" data-id="${escapeAttr(
            t.id
          )}">
            <lord-icon
              src="https://cdn.lordicon.com/lomfljuq.json"
              trigger="hover"
              colors="primary:#ef4444,secondary:#ef4444">
            </lord-icon>
          </button>
        </div>
        <div class="muted" style="margin-top:4px;">
          <span>${escapeHtml(t.date || "-")}</span> •
          <span>${escapeHtml(t.venue || "-")}</span> •
          <span>${escapeHtml(t.sport || "-")}</span> •
          <span class="${meta.cls}" title="Registration status">${
        meta.label
      }</span>
        </div>
      </div>`;
    })
    .join("");
}

listEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action='reminder']");
  if (!btn) return;
  const id = btn.getAttribute("data-id");
  toggleReminder(id);
  // Visual change for reminder (glow) is optional; keeping default as per spec.
});

/* Helpers */
function normalizeStatus(s) {
  const v = String(s || "CONFIRMED").toUpperCase();
  if (v === "PENDING" || v === "REJECTED" || v === "CONFIRMED") return v;
  return "CONFIRMED";
}
function statusMeta(s) {
  switch (s) {
    case "PENDING":
      return { label: "Pending", cls: "badge pending" };
    case "REJECTED":
      return { label: "Rejected", cls: "badge rejected" };
    case "CONFIRMED":
    default:
      return { label: "Confirmed", cls: "badge approved" };
  }
}
function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function escapeAttr(str = "") {
  // safe enough for attribute usage
  return String(str).replace(/"/g, "&quot;");
}

render();
