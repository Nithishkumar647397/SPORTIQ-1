import {
  getUserAchievements,
  deleteAchievement,
} from "./modules/achievements.js";
import { getCurrentUser, updateCurrentUser } from "./modules/users.js";
import { requireLogin } from "./core/auth.js";

requireLogin();

const listEl = document.getElementById("achievementList");

// Proof modal
const imgModal = document.getElementById("imgModal");
const imgModalClose = document.getElementById("imgModalClose");
const modalImg = document.getElementById("modalImg");

// Edit modal + fields
const editModal = document.getElementById("editModal");
const editModalClose = document.getElementById("editModalClose");
const editForm = document.getElementById("editForm");
const editTitle = document.getElementById("editTitle");
const editSport = document.getElementById("editSport");
const editDate = document.getElementById("editDate");
const editVenue = document.getElementById("editVenue");
const editDescription = document.getElementById("editDescription");
const editCancel = document.getElementById("editCancel");

// Delete confirmation modal
const deleteModal = document.getElementById("deleteModal");
const deleteModalClose = document.getElementById("deleteModalClose");
const deleteCancel = document.getElementById("deleteCancel");
const deleteConfirm = document.getElementById("deleteConfirm");

let editingId = null;
let pendingDeleteId = null;

// Status mapping with backward compatibility
function toStatus(a) {
  const s = (a.status || "").toString().toUpperCase();
  if (s === "APPROVED" || s === "REJECTED" || s === "PENDING") return s;

  if (typeof a.verified === "boolean") {
    return a.verified ? "APPROVED" : a.decisionReason ? "REJECTED" : "PENDING";
  }
  if (typeof a.verified === "string") {
    const v = a.verified.toUpperCase();
    if (v === "APPROVED") return "APPROVED";
    if (v === "REJECTED") return "REJECTED";
  }
  return "PENDING";
}

function badge(status) {
  if (status === "APPROVED")
    return '<span class="badge approved">Approved</span>';
  if (status === "REJECTED")
    return '<span class="badge rejected">Rejected</span>';
  return '<span class="badge pending">Pending</span>';
}

function escapeHtml(str) {
  return (str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createdMs(a) {
  if (a.createdAt) {
    const t = Date.parse(a.createdAt);
    if (!Number.isNaN(t)) return t;
  }
  if (a.id && a.id[0] === "a") {
    const t = Number(a.id.slice(1));
    if (!Number.isNaN(t)) return t;
  }
  return 0;
}

function render() {
  const items = getUserAchievements().map((x) => ({
    ...x,
    status: toStatus(x),
  }));
  items.sort((a, b) => createdMs(b) - createdMs(a));

  if (!items.length) {
    listEl.innerHTML = `
      <div class="glass-container">
        <p>No achievements yet.</p>
        <div class="btn-group">
          <a class="btn-small primary" href="upload.html">+ Upload</a>
        </div>
      </div>`;
    return;
  }

  listEl.innerHTML = items
    .map((a) => {
      const canDelete = a.status !== "APPROVED";
      const proofBtn = a.proof
        ? `<button class="btn-tiny view" data-action="view" data-id="${a.id}">View Proof</button>`
        : `<span class="muted">No proof</span>`;

      return `
        <div class="achievement-card">
          <h3 class="ach-title">${escapeHtml(a.title)} ${badge(a.status)}</h3>
          <div class="ach-meta">
            ${
              a.date
                ? `<span>${escapeHtml(
                    new Date(a.date).toLocaleDateString()
                  )}</span>`
                : ""
            }
            ${a.sport ? `<span>• ${escapeHtml(a.sport)}</span>` : ""}
            ${a.venue ? `<span>• ${escapeHtml(a.venue)}</span>` : ""}
          </div>
          <p class="ach-desc">${escapeHtml(a.description || "")}</p>
          ${
            a.status === "REJECTED" && a.decisionReason
              ? `<p class="ach-reason"><strong>Reason:</strong> ${escapeHtml(
                  a.decisionReason
                )}</p>`
              : ""
          }
          <div class="btn-row">
            ${proofBtn}
            <button class="btn-tiny edit" data-action="edit" data-id="${
              a.id
            }">Edit</button>
            <button class="btn-tiny danger" data-action="delete" data-id="${
              a.id
            }" ${canDelete ? "" : "disabled"}>Delete</button>
          </div>
        </div>`;
    })
    .join("");
}

// Event delegation for list actions
listEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  const id = btn.getAttribute("data-id");
  const action = btn.getAttribute("data-action");
  if (!id || !action) return;

  if (action === "view") {
    const ach = getUserAchievements().find((x) => x.id === id);
    if (ach?.proof) {
      modalImg.src = ach.proof;
      openModal(imgModal);
    }
  }

  if (action === "delete") {
    if (btn.hasAttribute("disabled")) return;
    pendingDeleteId = id;
    openModal(deleteModal);
  }

  if (action === "edit") {
    openEdit(id);
  }
});

// Proof modal close
imgModalClose.addEventListener("click", () => closeModal(imgModal));
imgModal.addEventListener("click", (e) => {
  if (e.target === imgModal) closeModal(imgModal);
});

// Delete modal handlers
deleteModalClose.addEventListener("click", () => closeModal(deleteModal));
deleteCancel.addEventListener("click", () => closeModal(deleteModal));
deleteModal.addEventListener("click", (e) => {
  if (e.target === deleteModal) closeModal(deleteModal);
});
deleteConfirm.addEventListener("click", () => {
  if (!pendingDeleteId) return;
  deleteAchievement(pendingDeleteId);
  pendingDeleteId = null;
  closeModal(deleteModal);
  render();
});

// Edit modal logic
function openEdit(id) {
  const user = getCurrentUser();
  const ach = (user?.achievements || []).find((x) => x.id === id);
  if (!ach) return;

  editingId = id;

  ensureOption(editSport, ach.sport || user?.sport || "");

  editTitle.value = ach.title || "";
  editSport.value = ach.sport || "";
  editDate.value = ach.date || "";
  editVenue.value = ach.venue || "";
  editDescription.value = ach.description || "";

  openModal(editModal);
}

editModalClose.addEventListener("click", () => closeModal(editModal));
editCancel.addEventListener("click", () => closeModal(editModal));
editModal.addEventListener("click", (e) => {
  if (e.target === editModal) closeModal(editModal);
});

editForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = editTitle.value.trim();
  const sport = editSport.value.trim();
  const date = editDate.value;
  const venue = editVenue.value.trim();
  const description = editDescription.value.trim();

  if (!title || !sport || !date || !venue) {
    alert("Please fill Title, Sport, Date, and Venue.");
    return;
  }

  const user = getCurrentUser();
  if (!user) return;

  const updated = (user.achievements || []).map((a) => {
    if (a.id !== editingId) return a;
    return {
      ...a,
      title,
      sport,
      date,
      venue,
      description,
      updatedAt: new Date().toISOString(),
    };
  });
  updateCurrentUser({ achievements: updated });

  closeModal(editModal);
  render();
});

function ensureOption(selectEl, value) {
  if (!value) return;
  const opts = Array.from(selectEl.options).map((o) => o.value);
  if (!opts.includes(value)) {
    const opt = document.createElement("option");
    opt.value = opt.textContent = value;
    selectEl.appendChild(opt);
  }
}

// Modal helpers
function openModal(modal) {
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}
function closeModal(modal) {
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

render();
