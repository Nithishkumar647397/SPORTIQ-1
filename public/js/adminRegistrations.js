import { requireLogin } from "./core/auth.js";
import { getCurrentUser } from "./modules/users.js";
import {
  listRegistrationsForTournament,
  setRegistrationStatus,
} from "./modules/tournaments.js";
import { loadData } from "./core/storage.js";
import {
  publishTournament,
  unpublishTournament,
} from "./modules/tournaments-admin.js";

document.addEventListener("DOMContentLoaded", () => {
  requireLogin();
  const admin = getCurrentUser();
  if (!admin || admin.role !== "Admin") {
    window.location.href = "dashboard.html";
    return;
  }

  const DEFAULT_AVATAR =
    "https://cdn-icons-png.flaticon.com/512/149/149071.png";

  // Elements
  const tSearch = document.getElementById("tSearch");
  const showAll = document.getElementById("showAll");
  const picker = document.getElementById("tournamentPicker");
  const noTournaments = document.getElementById("noTournaments");

  const registrantsList = document.getElementById("registrantsList");
  const noRegistrations = document.getElementById("noRegistrations");

  const chips = Array.from(document.querySelectorAll(".chip"));
  const regSearch = document.getElementById("regSearch");

  const countAll = document.getElementById("countAll");
  const countPending = document.getElementById("countPending");
  const countConfirmed = document.getElementById("countConfirmed");
  const countRejected = document.getElementById("countRejected");

  // Reject modal
  const rejectModal = document.getElementById("rejectModal");
  const rejectClose = document.getElementById("rejectClose");
  const rejectCancel = document.getElementById("rejectCancel");
  const rejectConfirm = document.getElementById("rejectConfirm");
  const rejectReason = document.getElementById("rejectReason");

  // Profile modal
  const profileModal = document.getElementById("profileModal");
  const profileClose = document.getElementById("profileClose");
  const peekAvatar = document.getElementById("peekAvatar");
  const peekName = document.getElementById("peekName");
  const peekSport = document.getElementById("peekSport");
  const peekEmail = document.getElementById("peekEmail");
  const peekMobile = document.getElementById("peekMobile");

  // Bulk actions
  const bulkApprove = document.getElementById("bulkApprove");
  const bulkReject = document.getElementById("bulkReject");
  const exportCsv = document.getElementById("exportCsv");

  // State
  let selectedTournamentId = null;
  let allAdminTournaments = [];
  let registrants = [];
  let statusFilter = "ALL";
  let searchText = "";
  let pendingReject = { ids: [], mode: "single" }; // or "bulk"

  // Load admin tournaments
  function loadTournaments() {
    const data = loadData();
    const mine = (data.tournaments || []).filter(
      (t) => t.createdBy === admin.id
    );
    const onlyPublished = mine.filter((t) => t.status === "PUBLISHED");
    allAdminTournaments = showAll.checked ? mine : onlyPublished;

    const q = tSearch.value.trim().toLowerCase();
    const filtered = allAdminTournaments
      .filter((t) => t.name.toLowerCase().includes(q))
      .sort((a, b) =>
        (a.startDateTime || "").localeCompare(b.startDateTime || "")
      );
    renderTournamentPicker(filtered);
  }

  function renderTournamentPicker(list) {
    picker.innerHTML = "";
    if (!list.length) {
      noTournaments.classList.remove("hidden");
      return;
    }
    noTournaments.classList.add("hidden");

    list.forEach((t) => {
      const item = document.createElement("div");
      item.className = "t-item";
      const statusBadge = badgeForStatus(t.status);
      const dateRange = formatRange(t.startDateTime, t.endDateTime);

      // Buttons depend on status
      const actions =
        t.status === "APPROVED"
          ? `<button class="btn-tiny edit" data-act="publish" data-id="${t.id}">Publish</button>`
          : t.status === "PUBLISHED"
          ? `<button class="btn-tiny danger" data-act="unpublish" data-id="${t.id}">Unpublish</button>`
          : "";

      item.innerHTML = `
        <div class="row1">
          <strong>${escapeHTML(t.name)}</strong>
          <span class="badge ${statusBadge.cls}">${statusBadge.label}</span>
        </div>
        <div class="row2">
          ${escapeHTML(t.sport)} • ${escapeHTML(t.state)}, ${escapeHTML(
        t.district
      )} • ${escapeHTML(dateRange)}
          ${
            t.needsApproval
              ? ' • <span class="badge pending">Needs approval</span>'
              : ""
          }
        </div>
        <div class="row3">
          ${actions}
        </div>
      `;

      // Selecting the tournament
      item.addEventListener("click", () => selectTournament(t.id));

      // Publish/Unpublish actions should not trigger selection
      item.querySelectorAll("button[data-act]").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const act = btn.getAttribute("data-act");
          const id = btn.getAttribute("data-id");
          if (act === "publish") {
            publishTournament(id, admin.id);
          } else if (act === "unpublish") {
            unpublishTournament(id, admin.id);
          }
          // Keep selection if the same tournament remains visible under the filter
          const wasSelected = selectedTournamentId === id;
          loadTournaments();
          // If selection disappears (e.g., unpublish while Published-only), clear registrants
          if (wasSelected) {
            const stillVisible = allAdminTournaments.some((tt) => tt.id === id);
            if (!stillVisible) {
              selectedTournamentId = null;
              registrants = [];
              renderRegistrants();
            }
          }
        });
      });

      picker.appendChild(item);
    });
  }

  function selectTournament(id) {
    selectedTournamentId = id;
    loadRegistrations();
  }

  function loadRegistrations() {
    if (!selectedTournamentId) {
      registrants = [];
      renderRegistrants();
      return;
    }
    registrants = listRegistrationsForTournament(selectedTournamentId);
    renderRegistrants();
  }

  function filteredRegistrants() {
    let list = registrants.slice();
    if (statusFilter !== "ALL") {
      list = list.filter((r) => normalizeStatus(r.regStatus) === statusFilter);
    }
    if (searchText) {
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(searchText) ||
          r.email.toLowerCase().includes(searchText)
      );
    }
    const order = { PENDING: 0, CONFIRMED: 1, REJECTED: 2 };
    list.sort((a, b) => {
      const sa = order[normalizeStatus(a.regStatus)] ?? 9;
      const sb = order[normalizeStatus(b.regStatus)] ?? 9;
      if (sa !== sb) return sa - sb;
      return (b.registeredAt || "").localeCompare(a.registeredAt || "");
    });
    return list;
  }

  function renderCounts() {
    const all = registrants.length;
    const p = registrants.filter(
      (r) => normalizeStatus(r.regStatus) === "PENDING"
    ).length;
    const c = registrants.filter(
      (r) => normalizeStatus(r.regStatus) === "CONFIRMED"
    ).length;
    const r = registrants.filter(
      (r) => normalizeStatus(r.regStatus) === "REJECTED"
    ).length;
    countAll.textContent = `All: ${all}`;
    countPending.textContent = `Pending: ${p}`;
    countConfirmed.textContent = `Confirmed: ${c}`;
    countRejected.textContent = `Rejected: ${r}`;
  }

  function renderRegistrants() {
    renderCounts();
    const list = filteredRegistrants();
    registrantsList.innerHTML = "";
    if (!list.length) {
      noRegistrations.classList.remove("hidden");
      return;
    }
    noRegistrations.classList.add("hidden");

    list.forEach((r) => {
      const photo = r.avatar || DEFAULT_AVATAR;
      const meta = statusMeta(normalizeStatus(r.regStatus));
      const card = document.createElement("div");
      card.className = "reg-card";
      card.innerHTML = `
        <div class="reg-main">
          <h4>${escapeHTML(r.name)}</h4>
          <p><strong>Email:</strong> ${escapeHTML(r.email || "-")}</p>
          <p><strong>Mobile:</strong> ${escapeHTML(
            r.mobile || "-"
          )} • <strong>Sport:</strong> ${escapeHTML(r.sport || "-")}</p>
          <p class="muted"><strong>Registered:</strong> ${formatDate(
            r.registeredAt
          )}</p>
          <span class="${meta.cls}">${meta.label}</span>
        </div>
        <div class="reg-photo"><img src="${photo}" alt="avatar"/></div>
        <div class="reg-actions-row">
          <button class="btn-tiny" data-act="profile" data-id="${
            r.userId
          }">View profile</button>
          <span style="flex:1"></span>
          <button class="btn-tiny edit" data-act="approve" data-id="${
            r.userId
          }">Approve</button>
          <button class="btn-tiny danger" data-act="reject" data-id="${
            r.userId
          }">Reject</button>
        </div>
      `;
      registrantsList.appendChild(card);
    });

    registrantsList.querySelectorAll("button[data-act]").forEach((btn) => {
      btn.addEventListener("click", onRowAction);
    });
  }

  function onRowAction(e) {
    const act = e.currentTarget.getAttribute("data-act");
    const userId = e.currentTarget.getAttribute("data-id");
    if (!selectedTournamentId) return;

    if (act === "profile") {
      const r = registrants.find((x) => x.userId === userId);
      if (!r) return;
      peekAvatar.src = r.avatar || DEFAULT_AVATAR;
      peekName.textContent = r.name || "Player";
      peekSport.textContent = r.sport || "-";
      peekEmail.textContent = r.email || "-";
      peekMobile.textContent = r.mobile || "-";
      openModal(profileModal);
      return;
    }

    if (act === "approve") {
      setRegistrationStatus(
        userId,
        selectedTournamentId,
        "CONFIRMED",
        "",
        admin.id
      );
      loadRegistrations();
      return;
    }

    if (act === "reject") {
      pendingReject = { ids: [userId], mode: "single" };
      rejectReason.value = "";
      openModal(rejectModal);
      return;
    }
  }

  // Bulk actions
  bulkApprove.addEventListener("click", () => {
    if (!selectedTournamentId) return;
    const ids = filteredRegistrants()
      .filter((r) => normalizeStatus(r.regStatus) === "PENDING")
      .map((r) => r.userId);
    ids.forEach((uid) =>
      setRegistrationStatus(
        uid,
        selectedTournamentId,
        "CONFIRMED",
        "",
        admin.id
      )
    );
    loadRegistrations();
  });

  bulkReject.addEventListener("click", () => {
    if (!selectedTournamentId) return;
    const ids = filteredRegistrants()
      .filter((r) => normalizeStatus(r.regStatus) === "PENDING")
      .map((r) => r.userId);
    if (!ids.length) return;
    pendingReject = { ids, mode: "bulk" };
    rejectReason.value = "";
    openModal(rejectModal);
  });

  // Reject modal events
  function doReject() {
    const reason = rejectReason.value.trim();
    if (!reason) return;
    pendingReject.ids.forEach((uid) =>
      setRegistrationStatus(
        uid,
        selectedTournamentId,
        "REJECTED",
        reason,
        admin.id
      )
    );
    closeModal(rejectModal);
    loadRegistrations();
  }
  rejectConfirm.addEventListener("click", doReject);
  rejectClose.addEventListener("click", () => closeModal(rejectModal));
  rejectCancel.addEventListener("click", () => closeModal(rejectModal));
  rejectModal.addEventListener("click", (e) => {
    if (e.target === rejectModal) closeModal(rejectModal);
  });

  // CSV export
  exportCsv.addEventListener("click", () => {
    const list = registrants.slice(); // export all
    const rows = [
      [
        "tournamentId",
        "playerId",
        "playerName",
        "email",
        "mobile",
        "sport",
        "registeredAt",
        "regStatus",
        "regDecisionAt",
        "regDecisionBy",
        "regDecisionReason",
      ],
    ];
    list.forEach((r) => {
      rows.push([
        selectedTournamentId,
        r.userId,
        r.name || "",
        r.email || "",
        r.mobile || "",
        r.sport || "",
        r.registeredAt || "",
        normalizeStatus(r.regStatus),
        r.regDecisionAt || "",
        r.regDecisionBy || "",
        r.regDecisionReason || "",
      ]);
    });
    const csv = rows.map((arr) => arr.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "registrations.csv";
    a.click();
  });

  // Status filter chips
  chips.forEach((chip) =>
    chip.addEventListener("click", () => {
      chips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      statusFilter = chip.getAttribute("data-status") || "ALL";
      renderRegistrants();
    })
  );
  regSearch.addEventListener("input", () => {
    searchText = regSearch.value.trim().toLowerCase();
    renderRegistrants();
  });

  // Picker search/toggle
  tSearch.addEventListener("input", loadTournaments);
  showAll.addEventListener("change", loadTournaments);

  // Modal helpers
  function openModal(m) {
    m.classList.remove("hidden");
  }
  function closeModal(m) {
    m.classList.add("hidden");
  }

  // Utils
  function formatRange(startISO, endISO) {
    if (!startISO) return "-";
    const s = new Date(startISO);
    const e = endISO ? new Date(endISO) : null;
    const dateOpts = { year: "numeric", month: "short", day: "numeric" };
    const timeOpts = { hour: "2-digit", minute: "2-digit" };
    const sDate = s.toLocaleDateString(undefined, dateOpts);
    const sTime = s.toLocaleTimeString(undefined, timeOpts);
    if (!e) return `${sDate} ${sTime}`;
    const eDate = e.toLocaleDateString(undefined, dateOpts);
    const eTime = e.toLocaleTimeString(undefined, timeOpts);
    if (s.toDateString() === e.toDateString())
      return `${sDate} ${sTime}–${eTime}`;
    return `${sDate} ${sTime} → ${eDate} ${eTime}`;
  }
  function formatDate(iso) {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleString();
  }
  function normalizeStatus(s) {
    const v = String(s || "CONFIRMED").toUpperCase();
    return v === "PENDING" || v === "REJECTED" || v === "CONFIRMED"
      ? v
      : "CONFIRMED";
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
  function badgeForStatus(st) {
    switch (st) {
      case "DRAFT":
        return { label: "Draft", cls: "" };
      case "SUBMITTED":
        return { label: "Submitted", cls: "pending" };
      case "APPROVED":
        return { label: "Approved", cls: "approved" };
      case "PUBLISHED":
        return { label: "Published", cls: "approved" };
      case "REJECTED":
        return { label: "Rejected", cls: "rejected" };
      default:
        return { label: st || "-", cls: "" };
    }
  }
  function csvEscape(val) {
    const s = String(val ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }
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

  // Init
  loadTournaments();
  // Also render empty registrants initially
  renderRegistrants();
});
