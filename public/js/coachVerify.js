import { requireLogin } from "./core/auth.js";
import { getCurrentUser } from "./modules/users.js";
import { getPendingAchievements, verifyAchievement } from "./modules/achievements.js";
import { loadData } from "./core/storage.js";

requireLogin();
const coach = getCurrentUser();
if (!coach || coach.role !== "Coach") {
  window.location.href = "dashboard.html";
}

const wrap = document.getElementById("pendingList");
const statusMsg = document.getElementById("statusMsg");

// Modals
const proofModal = document.getElementById("proofModal");
const proofImg = document.getElementById("proofImg");
const proofClose = document.getElementById("proofClose");

const rejectModal = document.getElementById("rejectModal");
const rejectClose = document.getElementById("rejectClose");
const rejectCancel = document.getElementById("rejectCancel");
const rejectSubmit = document.getElementById("rejectSubmit");
const rejectReason = document.getElementById("rejectReason");

let current = []; // cache of pending list
let rejectTarget = null; // { ownerId, achId }

function setStatus(msg = "") {
  statusMsg.textContent = msg;
  if (msg) setTimeout(() => (statusMsg.textContent = ""), 1800);
}

function fetchPending() {
  const data = loadData();
  let list = getPendingAchievements(data.users || []);
  // Filter by coach's sport
  if (coach.sport) list = list.filter((a) => a.sport && a.sport === coach.sport);
  return list;
}

function render() {
  current = fetchPending();

  if (!current.length) {
    wrap.innerHTML = `<div class="glass-container"><p>No pending achievements 🎉</p></div>`;
    return;
  }

  wrap.innerHTML = current
    .map((p) => {
      const dateStr = p.date ? new Date(p.date).toLocaleDateString() : "-";
      const proofBtn = p.proof
        ? `<button class="btn-tiny view" data-action="proof">View Proof</button>`
        : `<span class="muted">No proof</span>`;

      return `
        <div class="achievement-card" data-id="${p.id}" data-owner="${p.ownerId}">
          <h3 class="ach-title">${escapeHtml(p.title)}</h3>
          <div class="ach-meta">
            <span>${dateStr}</span> •
            <span>${escapeHtml(p.sport || "-")}</span> •
            <span>by ${escapeHtml(p.owner || "-")}</span>
          </div>
          <p class="ach-desc">${escapeHtml(p.description || "")}</p>
          <div class="btn-row">
            ${proofBtn}
            <button class="btn-tiny edit" data-action="approve">Approve</button>
            <button class="btn-tiny danger" data-action="reject">Reject</button>
          </div>
        </div>
      `;
    })
    .join("");
}

// Event delegation
wrap.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const card = e.target.closest(".achievement-card");
  if (!card) return;

  const ownerId = card.getAttribute("data-owner");
  const achId = card.getAttribute("data-id");
  const action = btn.getAttribute("data-action");
  const item = current.find((x) => x.id === achId && x.ownerId === ownerId);
  if (!item) return;

  if (action === "proof") {
    if (item.proof) {
      proofImg.src = item.proof;
      openModal(proofModal);
    }
  }

  if (action === "approve") {
    const ok = verifyAchievement(ownerId, achId, "APPROVED");
    if (ok) {
      setStatus("Approved.");
      render();
    } else {
      setStatus("Blocked: cross-sport or error.");
    }
  }

  if (action === "reject") {
    rejectTarget = { ownerId, achId };
    rejectReason.value = "";
    openModal(rejectModal);
  }
});

// Reject modal events
rejectClose.addEventListener("click", () => closeModal(rejectModal));
rejectCancel.addEventListener("click", () => closeModal(rejectModal));
rejectModal.addEventListener("click", (e) => {
  if (e.target === rejectModal) closeModal(rejectModal);
});
rejectSubmit.addEventListener("click", () => {
  if (!rejectTarget) return;
  const reason = rejectReason.value.trim();
  if (!reason) {
    setStatus("Please provide a reason.");
    return;
  }
  const ok = verifyAchievement(rejectTarget.ownerId, rejectTarget.achId, "REJECTED", reason);
  rejectTarget = null;
  closeModal(rejectModal);
  if (ok) {
    setStatus("Rejected with reason.");
    render();
  } else {
    setStatus("Blocked: cross-sport or error.");
  }
});

// Proof modal close
proofClose.addEventListener("click", () => closeModal(proofModal));
proofModal.addEventListener("click", (e) => {
  if (e.target === proofModal) closeModal(proofModal);
});

// Helpers
function openModal(modal) {
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}
function closeModal(modal) {
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}
function escapeHtml(str = "") {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

render();