import { requireLogin } from "./core/auth.js";
import { getCurrentUser } from "./modules/users.js";
import { createTournament } from "./modules/tournaments-admin.js";

document.addEventListener("DOMContentLoaded", () => {
  requireLogin();

  const admin = getCurrentUser();
  if (!admin || admin.role !== "Admin") {
    window.location.href = "dashboard.html";
    return;
  }

  let step = 1;
  const totalSteps = 6;
  const formData = {
    basic: {},
    rules: {},
    registration: {},
    media: {},
    organizer: {},
    needsApproval: false,
  };

  const steps = Array.from(document.querySelectorAll(".step"));
  const wizardMsg = document.getElementById("wizardMsg");

  // Basic
  const nameEl = document.getElementById("name");
  const sportEl = document.getElementById("sport");
  const startDateEl = document.getElementById("startDate");
  const startTimeEl = document.getElementById("startTime");
  const endDateEl = document.getElementById("endDate");
  const endTimeEl = document.getElementById("endTime");
  const stateEl = document.getElementById("state");
  const districtEl = document.getElementById("district");
  const venueEl = document.getElementById("venue");

  // Rules
  const ageMinEl = document.getElementById("ageMin");
  const ageMaxEl = document.getElementById("ageMax");
  const genderEl = document.getElementById("gender");
  const distRestrictEl = document.getElementById("districtRestriction");
  const maxTeamsEl = document.getElementById("maxTeams");
  const maxPlayersEl = document.getElementById("maxPlayers");
  const formatName = "format";

  // Registration
  const regFeeEl = document.getElementById("regFee");
  const docChks = Array.from(document.querySelectorAll(".docChk"));
  const lastDateEl = document.getElementById("lastDate");
  const needsApprovalEl = document.getElementById("needsApproval");

  // Media
  const bannerEl = document.getElementById("banner");

  // Organizer
  const orgNameEl = document.getElementById("orgName");
  const orgMobileEl = document.getElementById("orgMobile");
  const orgEmailEl = document.getElementById("orgEmail");

  // Submit
  const submitMsg = document.getElementById("submitMsg");
  const createAnotherBtn = document.getElementById("createAnother");
  const cancelWizardBtn = document.getElementById("cancelWizard");

  // Prefill organizer
  orgNameEl.value = admin.name || "";
  orgMobileEl.value = admin.mobile || "";
  orgEmailEl.value = admin.email || "";

  // Populate states/districts (object shape)
  try {
    const raw = window.statesAndDistricts || {};
    const states = Object.keys(raw).sort((a, b) => a.localeCompare(b));
    stateEl.innerHTML =
      '<option value="">Select State</option>' +
      states
        .map(
          (s) => `<option value="${escapeHTML(s)}">${escapeHTML(s)}</option>`
        )
        .join("");
    stateEl.addEventListener("change", () => {
      const dists = raw[stateEl.value] || [];
      districtEl.innerHTML =
        '<option value="">Select District</option>' +
        dists
          .map(
            (d) => `<option value="${escapeHTML(d)}">${escapeHTML(d)}</option>`
          )
          .join("");
    });
  } catch {}

  // Nav
  document.getElementById("next1").onclick = () => {
    if (!validateStep1()) return;
    collectStep1();
    go(2);
  };
  document.getElementById("prev2").onclick = () => go(1);
  document.getElementById("next2").onclick = () => {
    if (!validateStep2()) return;
    collectStep2();
    go(3);
  };
  document.getElementById("prev3").onclick = () => go(2);
  document.getElementById("next3").onclick = () => {
    if (!validateStep3()) return;
    collectStep3();
    go(4);
  };
  document.getElementById("prev4").onclick = () => go(3);
  document.getElementById("next4").onclick = () => {
    collectStep4().then(() => go(5));
  };
  document.getElementById("prev5").onclick = () => go(4);
  document.getElementById("next5").onclick = () => {
    if (!validateStep5()) return;
    collectStep5();
    go(6);
  };
  document.getElementById("prev1").disabled = true;

  document.getElementById("submitApproval").onclick = async () => {
    const payload = buildPayload();
    createTournament(payload);
    submitMsg.style.color = "green";
    submitMsg.textContent = "✅ Submitted for approval!";
    createAnotherBtn.style.display = "inline-block";
  };

  cancelWizardBtn.onclick = () => (window.location.href = "dashboard.html");

  createAnotherBtn.onclick = () => {
    document
      .querySelectorAll(
        'input[type="text"], input[type="number"], input[type="date"], input[type="time"], input[type="email"], input[type="tel"]'
      )
      .forEach((i) => (i.value = ""));
    docChks.forEach((c) => (c.checked = false));
    sportEl.value = "";
    genderEl.value = "ANY";
    distRestrictEl.value = "DISTRICT_ONLY";
    document.querySelector(
      `input[name="${formatName}"][value="KNOCKOUT"]`
    ).checked = true;
    bannerEl.value = "";
    needsApprovalEl.checked = false;
    submitMsg.textContent = "";
    wizardMsg.textContent = "";
    orgNameEl.value = admin.name || "";
    orgMobileEl.value = admin.mobile || "";
    orgEmailEl.value = admin.email || "";
    document
      .querySelectorAll(".field-error")
      .forEach((e) => (e.textContent = ""));
    go(1);
  };

  function go(n) {
    step = n;
    steps.forEach((s) => s.classList.remove("active"));
    document.querySelector(`.step-${n}`).classList.add("active");
    wizardMsg.textContent = `Step ${n} of ${totalSteps}`;
  }

  function validateStep1() {
    let ok = true;
    clearErrors(
      "e_name",
      "e_sport",
      "e_startDate",
      "e_startTime",
      "e_endDate",
      "e_endTime",
      "e_state",
      "e_district",
      "e_venue"
    );
    if (!nameEl.value.trim()) {
      setErr("e_name", "Tournament name is required");
      ok = false;
    }
    if (!sportEl.value) {
      setErr("e_sport", "Select a sport");
      ok = false;
    }
    if (!startDateEl.value) {
      setErr("e_startDate", "Start date is required");
      ok = false;
    }
    if (!startTimeEl.value) {
      setErr("e_startTime", "Start time is required");
      ok = false;
    }
    if (!endDateEl.value) {
      setErr("e_endDate", "End date is required");
      ok = false;
    }
    if (!endTimeEl.value) {
      setErr("e_endTime", "End time is required");
      ok = false;
    }
    if (!stateEl.value) {
      setErr("e_state", "State is required");
      ok = false;
    }
    if (!districtEl.value) {
      setErr("e_district", "District is required");
      ok = false;
    }
    if (!venueEl.value.trim()) {
      setErr("e_venue", "Venue is required");
      ok = false;
    }
    if (ok) {
      const startIso = toISO(startDateEl.value, startTimeEl.value);
      const endIso = toISO(endDateEl.value, endTimeEl.value);
      if (startIso >= endIso) {
        setErr("e_endTime", "End must be after start");
        ok = false;
      }
    }
    return ok;
  }
  function validateStep2() {
    clearErrors("e_ageRange");
    const min = toNum(ageMinEl.value),
      max = toNum(ageMaxEl.value);
    if (min && max && min > max) {
      setErr("e_ageRange", "Age Min cannot exceed Age Max");
      return false;
    }
    return true;
  }
  function validateStep3() {
    clearErrors("e_lastDate");
    if (lastDateEl.value) {
      const last = new Date(lastDateEl.value + "T00:00:00");
      const start = new Date(startDateEl.value + "T00:00:00");
      if (last > start) {
        setErr("e_lastDate", "Last date must be on/before start date");
        return false;
      }
    }
    return true;
  }
  function validateStep5() {
    clearErrors("e_orgName", "e_orgMobile", "e_orgEmail");
    let ok = true;
    if (!orgNameEl.value.trim()) {
      setErr("e_orgName", "Organizer name required");
      ok = false;
    }
    if (!/^[0-9]{10}$/.test(orgMobileEl.value.trim())) {
      setErr("e_orgMobile", "Enter 10-digit mobile");
      ok = false;
    }
    if (!orgEmailEl.value.includes("@")) {
      setErr("e_orgEmail", "Enter valid email");
      ok = false;
    }
    return ok;
  }

  function collectStep1() {
    formData.basic = {
      name: nameEl.value.trim(),
      sport: sportEl.value,
      startDateTime: toISO(startDateEl.value, startTimeEl.value),
      endDateTime: toISO(endDateEl.value, endTimeEl.value),
      state: stateEl.value,
      district: districtEl.value,
      venue: venueEl.value.trim(),
    };
  }
  function collectStep2() {
    const format =
      (document.querySelector(`input[name="${formatName}"]:checked`) || {})
        .value || "KNOCKOUT";
    formData.rules = {
      eligibility: {
        ageMin: toNum(ageMinEl.value) || null,
        ageMax: toNum(ageMaxEl.value) || null,
        gender: genderEl.value || "ANY",
        districtRestricted: distRestrictEl.value === "DISTRICT_ONLY",
      },
      format,
      limits: {
        maxTeams: toNum(maxTeamsEl.value) || null,
        maxPlayers: toNum(maxPlayersEl.value) || null,
      },
    };
  }
  function collectStep3() {
    const docs = docChks.filter((c) => c.checked).map((c) => c.value);
    formData.registration = {
      fee: toNum(regFeeEl.value) || 0,
      documents: docs,
      lastDate: lastDateEl.value
        ? new Date(lastDateEl.value + "T00:00:00").toISOString()
        : null,
    };
    formData.needsApproval = !!needsApprovalEl.checked; // NEW
  }
  async function collectStep4() {
    const file = bannerEl.files && bannerEl.files[0];
    if (!file) {
      formData.media = { banner: "" };
      return;
    }
    const dataUrl = await compressImage(file, 1280, 0.8);
    formData.media = { banner: dataUrl };
  }
  function collectStep5() {
    formData.organizer = {
      name: orgNameEl.value.trim(),
      mobile: orgMobileEl.value.trim(),
      email: orgEmailEl.value.trim(),
    };
  }
  function buildPayload() {
    return {
      ...formData.basic,
      ...formData.rules,
      registration: formData.registration,
      media: formData.media,
      organizer: formData.organizer,
      needsApproval: !!formData.needsApproval, // NEW
      status: "SUBMITTED",
      createdBy: admin.id,
    };
  }

  // utils
  function toISO(d, t) {
    return new Date(`${d}T${t}:00`).toISOString();
  }
  function toNum(v) {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  }
  function setErr(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }
  function clearErrors(...ids) {
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = "";
    });
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

  async function compressImage(file, maxWidth = 1280, quality = 0.8) {
    const img = await fileToImage(file);
    const scale = Math.min(1, maxWidth / img.width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    let dataUrl = canvas.toDataURL("image/jpeg", quality);
    if (dataUrl.length > 900_000) dataUrl = canvas.toDataURL("image/jpeg", 0.7);
    return dataUrl;
  }
  function fileToImage(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = r.result;
      };
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }

  wizardMsg.textContent = `Step 1 of ${totalSteps}`;
});
