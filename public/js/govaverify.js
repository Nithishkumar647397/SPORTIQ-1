import { requireLogin } from "./core/auth.js";
import { getCurrentUser } from "./modules/users.js";
import {
  listTournamentsForOfficial,
  setTournamentReview,
} from "./modules/tournaments-admin.js";

document.addEventListener("DOMContentLoaded", () => {
  requireLogin();
  const official = getCurrentUser();
  if (!official || official.role !== "Government Official") {
    window.location.href = "dashboard.html";
    return;
  }

  // Elements
  const chips = Array.from(document.querySelectorAll(".chip"));
  const fState = document.getElementById("fState");
  const fDistrict = document.getElementById("fDistrict");
  const fSearch = document.getElementById("fSearch");
  const tList = document.getElementById("tList");
  const emptyMsg = document.getElementById("emptyMsg");

  // Details modal
  const detailsModal = document.getElementById("detailsModal");
  const detailsClose = document.getElementById("detailsClose");
  const d = {
    banner: document.getElementById("dBanner"),
    name: document.getElementById("dName"),
    sport: document.getElementById("dSport"),
    range: document.getElementById("dRange"),
    venue: document.getElementById("dVenue"),
    region: document.getElementById("dRegion"),
    desc: document.getElementById("dDesc"),
    fee: document.getElementById("dFee"),
    docs: document.getElementById("dDocs"),
    last: document.getElementById("dLast"),
    age: document.getElementById("dAge"),
    gender: document.getElementById("dGender"),
    restrict: document.getElementById("dRestrict"),
    format: document.getElementById("dFormat"),
    limits: document.getElementById("dLimits"),
    approveBtn: document.getElementById("approveBtn"),
    rejectBtn: document.getElementById("rejectBtn"),
  };

  // Reject modal
  const rejectModal = document.getElementById("rejectModal");
  const rejectClose = document.getElementById("rejectClose");
  const rejectCancel = document.getElementById("rejectCancel");
  const rejectConfirm = document.getElementById("rejectConfirm");
  const rejectReason = document.getElementById("rejectReason");

  // State
  let status = "SUBMITTED";
  let search = "";
  let currentState = "";
  let currentDistrict = "";
  let detailsId = null;

  // Region inference from address (demo-friendly)
  const inferred = inferRegionFromAddress(
    official.address || "",
    window.statesAndDistricts || {}
  );
  currentState = inferred.state || "";
  currentDistrict = inferred.district || "";

  // Populate State/District from dataset
  initRegionSelectors(
    window.statesAndDistricts || {},
    currentState,
    currentDistrict
  );

  // Events
  chips.forEach((c) =>
    c.addEventListener("click", () => {
      chips.forEach((x) => x.classList.remove("active"));
      c.classList.add("active");
      status = c.getAttribute("data-status") || "SUBMITTED";
      render();
    })
  );
  fSearch.addEventListener("input", () => {
    search = fSearch.value.trim().toLowerCase();
    render();
  });
  fState.addEventListener("change", () => {
    currentState = fState.value;
    populateDistricts(
      window.statesAndDistricts || {},
      currentState,
      fDistrict,
      currentDistrict
    );
    currentDistrict = ""; // reset selection
    render();
  });
  fDistrict.addEventListener("change", () => {
    currentDistrict = fDistrict.value;
    render();
  });

  detailsClose.addEventListener("click", () => closeModal(detailsModal));
  rejectClose.addEventListener("click", () => closeModal(rejectModal));
  rejectCancel.addEventListener("click", () => closeModal(rejectModal));
  rejectConfirm.addEventListener("click", () => {
    const reason = rejectReason.value.trim();
    if (!reason || !detailsId) return;
    setTournamentReview({
      tournamentId: detailsId,
      decision: "REJECTED",
      note: reason,
      officialId: official.id,
    });
    closeModal(rejectModal);
    closeModal(detailsModal);
    render();
  });

  // Render list
  function render() {
    const list = listTournamentsForOfficial({
      state: currentState,
      district: currentDistrict,
      status,
    });

    // search by name
    const filtered = list.filter((t) => t.name.toLowerCase().includes(search));

    tList.innerHTML = "";
    if (!filtered.length) {
      emptyMsg.classList.remove("hidden");
      return;
    }
    emptyMsg.classList.add("hidden");

    filtered.forEach((t) => {
      const card = document.createElement("div");
      card.className = "t-card";
      const needs = t.needsApproval
        ? ' • <span class="badge pending">Needs approval</span>'
        : "";
      card.innerHTML = `
        <div class="row1">
          <strong>${escapeHTML(t.name)}</strong>
          <span class="muted">${escapeHTML(t.range)}</span>
        </div>
        <div class="row2">
          ${escapeHTML(t.sport)} • ${escapeHTML(t.state)}, ${escapeHTML(
        t.district
      )} • ${escapeHTML(t.venue)}${needs}
        </div>
        <div class="row3">
          <button class="btn-tiny" data-act="details" data-id="${
            t.id
          }">View details</button>
          <button class="btn-tiny edit" data-act="approve" data-id="${
            t.id
          }">Approve</button>
          <button class="btn-tiny danger" data-act="reject" data-id="${
            t.id
          }">Reject</button>
        </div>
      `;
      tList.appendChild(card);
    });

    // bind actions
    tList.querySelectorAll("button[data-act]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.getAttribute("data-id");
        const act = e.currentTarget.getAttribute("data-act");
        const item = filtered.find((x) => x.id === id);
        if (!item) return;

        if (act === "details") {
          openDetails(item);
          return;
        }
        if (act === "approve") {
          setTournamentReview({
            tournamentId: id,
            decision: "APPROVED",
            note: "",
            officialId: official.id,
          });
          render();
          return;
        }
        if (act === "reject") {
          detailsId = id;
          rejectReason.value = "";
          openModal(rejectModal);
          return;
        }
      });
    });
  }

  function openDetails(t) {
    detailsId = t.id;
    d.banner.src = t.media?.banner || "";
    d.banner.style.display = t.media?.banner ? "block" : "none";
    d.name.textContent = t.name || "-";
    d.sport.textContent = t.sport || "-";
    d.range.textContent = t.range || "-";
    d.venue.textContent = t.venue || "-";
    d.region.textContent = `${t.state || "-"}, ${t.district || "-"}`;
    d.desc.textContent = t.description || "-";

    const fee = t.registration?.fee ?? "-";
    const docs = (t.registration?.documents || []).join(", ") || "-";
    const last = t.registration?.lastDate
      ? formatDateOnly(t.registration.lastDate)
      : "-";
    d.fee.textContent = fee === "-" ? "-" : `₹${fee}`;
    d.docs.textContent = docs;
    d.last.textContent = last;

    const eg = t.eligibility || {};
    const age =
      (eg.ageMin ? eg.ageMin : "") + (eg.ageMax ? ` - ${eg.ageMax}` : "");
    d.age.textContent = age || "-";
    d.gender.textContent = eg.gender || "-";
    d.restrict.textContent = eg.districtRestricted
      ? "Only this district"
      : "Open to all in state";
    d.format.textContent = t.format || "-";
    const lim = t.limits || {};
    const lims = [];
    if (lim.maxTeams) lims.push(`Teams: ${lim.maxTeams}`);
    if (lim.maxPlayers) lims.push(`Players: ${lim.maxPlayers}`);
    d.limits.textContent = lims.join(", ") || "-";

    d.approveBtn.onclick = () => {
      setTournamentReview({
        tournamentId: t.id,
        decision: "APPROVED",
        note: "",
        officialId: official.id,
      });
      closeModal(detailsModal);
      render();
    };
    d.rejectBtn.onclick = () => {
      detailsId = t.id;
      rejectReason.value = "";
      openModal(rejectModal);
    };

    openModal(detailsModal);
  }

  // Helpers
  function initRegionSelectors(statesObj, selState, selDistrict) {
    // populate state
    const states = Object.keys(statesObj || {}).sort((a, b) =>
      a.localeCompare(b)
    );
    fState.innerHTML =
      '<option value="">All</option>' +
      states
        .map(
          (s) => `<option value="${escapeHTML(s)}">${escapeHTML(s)}</option>`
        )
        .join("");
    if (selState && states.includes(selState)) fState.value = selState;
    populateDistricts(statesObj, fState.value, fDistrict, selDistrict);
    fDistrict.value = selDistrict || "";
  }

  function populateDistricts(statesObj, state, districtSelect, sel) {
    const districts = state ? statesObj[state] || [] : [];
    districtSelect.innerHTML =
      '<option value="">All</option>' +
      districts
        .map(
          (d) => `<option value="${escapeHTML(d)}">${escapeHTML(d)}</option>`
        )
        .join("");
    if (sel && districts.includes(sel)) districtSelect.value = sel;
  }

  function inferRegionFromAddress(address, statesObj) {
    const addr = String(address || "").toLowerCase();
    if (!addr || !statesObj) return { state: "", district: "" };
    const states = Object.keys(statesObj);
    let foundState = "";
    for (const st of states) {
      if (addr.includes(st.toLowerCase())) {
        foundState = st;
        break;
      }
    }
    if (!foundState) return { state: "", district: "" };
    let foundDistrict = "";
    for (const d of statesObj[foundState] || []) {
      if (addr.includes(String(d).toLowerCase())) {
        foundDistrict = d;
        break;
      }
    }
    return { state: foundState, district: foundDistrict };
  }

  function formatDateOnly(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString();
    } catch {
      return "-";
    }
  }

  function openModal(m) {
    m.classList.remove("hidden");
  }
  function closeModal(m) {
    m.classList.add("hidden");
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

  // Initial render
  render();
});
