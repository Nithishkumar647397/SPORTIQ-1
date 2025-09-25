import { requireLogin } from "./core/auth.js";
import { getCurrentUser } from "./modules/users.js";
import { loadData } from "./core/storage.js";

document.addEventListener("DOMContentLoaded", () => {
  requireLogin();

  const coach = getCurrentUser();
  if (!coach || coach.role !== "Coach") {
    window.location.href = "dashboard.html";
    return;
  }

  const sportTag = document.getElementById("sportTag");
  sportTag.textContent = `Sport: ${coach.sport || "-"}`;

  // UI refs
  const grid = document.getElementById("playersGrid");
  const emptyMsg = document.getElementById("emptyMsg");
  const filterBtn = document.getElementById("filterBtn");
  const filterPanel = document.getElementById("filterPanel");
  const filterSport = document.getElementById("filterSport");
  const minAgeEl = document.getElementById("filterMinAge");
  const maxAgeEl = document.getElementById("filterMaxAge");

  // Modal refs
  const profileModal = document.getElementById("profileModal");
  const profileClose = document.getElementById("profileModalClose");
  const aboutModal = document.getElementById("aboutModal");
  const aboutClose = document.getElementById("aboutModalClose");

  // Modal detail elements
  const m = {
    name: document.getElementById("m_name"),
    age: document.getElementById("m_age"),
    dob: document.getElementById("m_dob"),
    email: document.getElementById("m_email"),
    mobile: document.getElementById("m_mobile"),
    sport: document.getElementById("m_sport"),
    approved: document.getElementById("m_approved"),
    pending: document.getElementById("m_pending"),
    rejected: document.getElementById("m_rejected"),
    height: document.getElementById("m_height"),
    weight: document.getElementById("m_weight"),
    blood: document.getElementById("m_blood"),
    avatar: document.getElementById("m_avatar"),
    aboutBtn: document.getElementById("aboutBtn"),
    aboutText: document.getElementById("aboutText"),
  };

  // Constants
  const DEFAULT_AVATAR =
    "https://cdn-icons-png.flaticon.com/512/149/149071.png";

  // Prepare sport filter (disabled, shows current sport)
  filterSport.innerHTML = `<option value="${coach.sport || ""}">${
    coach.sport || "Sport"
  }</option>`;
  filterSport.disabled = true;

  // Load players that match coach.sport
  const allUsers = loadData().users || [];
  const basePlayers = allUsers.filter(
    (u) => u.role === "Player" && (coach.sport ? u.sport === coach.sport : true)
  );

  function calculateAge(dob) {
    if (!dob) return null;
    const today = new Date();
    const birth = new Date(dob);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }

  function normalizeStatus(a) {
    if (!a) return "PENDING";
    if (a.status) {
      const s = String(a.status).toUpperCase();
      if (s === "APPROVED" || s === "REJECTED" || s === "PENDING") return s;
    }
    // legacy support
    if (typeof a.verified === "string") {
      const v = a.verified.toUpperCase();
      return v === "APPROVED"
        ? "APPROVED"
        : v === "REJECTED"
        ? "REJECTED"
        : "PENDING";
    }
    return a.verified === true ? "APPROVED" : "PENDING";
  }

  function summarizeAchievements(user) {
    const list = (user.achievements || []).map((a) => normalizeStatus(a));
    return {
      approved: list.filter((s) => s === "APPROVED").length,
      pending: list.filter((s) => s === "PENDING").length,
      rejected: list.filter((s) => s === "REJECTED").length,
    };
  }

  function applyFilters(players) {
    const minAge = parseInt(minAgeEl.value, 10);
    const maxAge = parseInt(maxAgeEl.value, 10);

    return players.filter((p) => {
      const age = calculateAge(p.dob);
      if (Number.isFinite(minAge) && age !== null && age < minAge) return false;
      if (Number.isFinite(maxAge) && age !== null && age > maxAge) return false;
      return true;
    });
  }

  function render(players) {
    grid.innerHTML = "";
    const list = applyFilters(players);

    if (!list.length) {
      emptyMsg.classList.remove("hidden");
      return;
    }
    emptyMsg.classList.add("hidden");

    list.forEach((p) => {
      const age = calculateAge(p.dob);
      const card = document.createElement("div");
      card.className = "player-card";

      const photo = p.profilePic || DEFAULT_AVATAR;

      card.innerHTML = `
        <div class="player-info">
          <h4>${escapeHTML(p.name || p.username || "Player")}</h4>
          <p><strong>Sport:</strong> ${escapeHTML(p.sport || "-")}</p>
          <p><strong>Age:</strong> ${age != null ? age : "-"}</p>
        </div>
        <div class="player-photo">
          <img src="${photo}" alt="Player photo" />
        </div>
        <div class="card-actions">
          <button class="btn-tiny edit view-profile-btn" data-id="${
            p.id
          }">View full profile</button>
        </div>
      `;

      grid.appendChild(card);
    });

    // Bind view buttons
    grid.querySelectorAll(".view-profile-btn").forEach((btn) => {
      btn.addEventListener("click", () => openProfileModal(btn.dataset.id));
    });
  }

  function openProfileModal(userId) {
    const player = allUsers.find((u) => u.id === userId);
    if (!player) return;

    const age = calculateAge(player.dob);
    const sum = summarizeAchievements(player);

    m.name.textContent = player.name || player.username || "Player";
    m.age.textContent = age != null ? age : "-";
    m.dob.textContent = player.dob || "-";
    m.email.textContent = player.email || "-";
    m.mobile.textContent = player.mobile || "-";
    m.sport.textContent = player.sport || "-";

    m.approved.textContent = `Approved: ${sum.approved}`;
    m.pending.textContent = `Pending: ${sum.pending}`;
    m.rejected.textContent = `Rejected: ${sum.rejected}`;

    m.height.textContent = player.height || "-";
    m.weight.textContent = player.weight || "-";
    m.blood.textContent = player.bloodgroup || "-";

    m.avatar.src = player.profilePic || DEFAULT_AVATAR;

    // About button (stub: show user.about if present or fallback)
    m.aboutBtn.onclick = () => {
      const txt =
        (player.about && String(player.about).trim()) ||
        "No about info added yet.";
      m.aboutText.textContent = txt;
      openModal(aboutModal);
    };

    openModal(profileModal);
  }

  // Modal helpers (simple)
  function openModal(modal) {
    modal.classList.remove("hidden");
  }
  function closeModal(modal) {
    modal.classList.add("hidden");
  }

  profileClose.addEventListener("click", () => closeModal(profileModal));
  aboutClose.addEventListener("click", () => closeModal(aboutModal));
  // Close on backdrop click
  [profileModal, aboutModal].forEach((mEl) => {
    mEl.addEventListener("click", (e) => {
      if (e.target === mEl) closeModal(mEl);
    });
  });
  // Esc key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal(profileModal);
      closeModal(aboutModal);
    }
  });

  // Filter UI events
  filterBtn.addEventListener("click", () => {
    filterPanel.classList.toggle("hidden");
  });
  document.getElementById("applyFilters").addEventListener("click", () => {
    render(basePlayers);
    filterPanel.classList.add("hidden");
  });
  document.getElementById("resetFilters").addEventListener("click", () => {
    minAgeEl.value = "";
    maxAgeEl.value = "";
    render(basePlayers);
    filterPanel.classList.add("hidden");
  });

  // Escape HTML util (safe rendering)
  function escapeHTML(str = "") {
    return String(str).replace(
      /[&<>"']/g,
      (m) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        }[m])
    );
  }

  // Initial render
  render(basePlayers);
});
