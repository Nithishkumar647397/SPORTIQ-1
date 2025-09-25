// public/js/auth-pages.js
// Backend-first for Register/Login/Details, with a localStorage "bridge"
// so legacy pages (achievements/tournaments/etc.) keep working.

import API from "./api.js";
import { loadData, saveData } from "./core/storage.js"; // bridge into localStorage

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  switch (page) {
    case "register":
      initRegister();
      break;
    case "login":
      initLogin();
      break;
    case "details":
      initDetails();
      break;
  }
});

/* ============== Bridge: backend user -> localStorage session ============== */
function syncLocalSession(apiUser) {
  if (!apiUser) return;
  // Ensure sportiqData has this user and set currentUser
  const data = loadData();

  // Find by id or email to avoid duplicates if the user existed from older local runs
  let idx = (data.users || []).findIndex(
    (u) => u.id === apiUser.id || u.email === apiUser.email
  );

  const local = idx !== -1 ? { ...data.users[idx] } : {};

  // Map API user (DB) to local user shape used across the app
  const merged = {
    ...local,
    id: apiUser.id,
    username: apiUser.username,
    email: apiUser.email,
    // Never store raw passwords; keep whatever was already in local (if any)
    role: apiUser.role || local.role || "Player",
    sport: apiUser.sport ?? local.sport ?? "",
    name: apiUser.name ?? local.name ?? "",
    dob: apiUser.dob ? apiUser.dob.slice(0, 10) : local.dob || "",
    gender: apiUser.gender ?? local.gender ?? "",
    mobile: apiUser.mobile ?? local.mobile ?? "",
    profilePic: apiUser.profilePic ?? local.profilePic ?? "",
    height: apiUser.height ?? local.height ?? null,
    weight: apiUser.weight ?? local.weight ?? null,
    bloodgroup: apiUser.bloodgroup ?? local.bloodgroup ?? "",
    address: apiUser.address ?? local.address ?? "",
    // Embedded arrays: keep local ones so existing pages continue to work
    achievements: Array.isArray(local.achievements) ? local.achievements : [],
    registeredTournaments: Array.isArray(local.registeredTournaments)
      ? local.registeredTournaments
      : [],
  };

  if (idx === -1) {
    data.users.push(merged);
    idx = data.users.length - 1;
  } else {
    data.users[idx] = merged;
  }

  data.currentUser = merged.id;
  saveData(data);
}

/* =========================
   REGISTER (inline errors)
========================= */
function initRegister() {
  const form = document.getElementById("registerForm");
  if (!form) return;
  const msg = document.getElementById("msg");

  const usernameEl = document.getElementById("regUsername");
  const emailEl = document.getElementById("regEmail");
  const passEl = document.getElementById("regPass");
  const pass2El = document.getElementById("regPass2");

  const pass2ErrorEl = document.getElementById("regPass2Error");
  const emailErrorEl = document.getElementById("regEmailError");

  const clearPassMismatch = () => {
    passEl.classList.remove("input-error");
    pass2El.classList.remove("input-error");
    if (pass2ErrorEl) pass2ErrorEl.textContent = "";
  };
  const clearEmailError = () => {
    emailEl.classList.remove("input-error");
    if (emailErrorEl) emailErrorEl.textContent = "";
  };

  passEl.addEventListener("input", () => {
    if (pass2El.value && passEl.value === pass2El.value) clearPassMismatch();
  });
  pass2El.addEventListener("input", () => {
    if (passEl.value === pass2El.value) clearPassMismatch();
  });
  emailEl.addEventListener("input", clearEmailError);

  form.onsubmit = async (e) => {
    e.preventDefault();
    clearPassMismatch();
    clearEmailError();
    msg.textContent = "";
    msg.style.color = "";

    const username = usernameEl.value.trim();
    const email = emailEl.value.trim().toLowerCase();
    const pass = passEl.value;
    const pass2 = pass2El.value;

    if (pass !== pass2) {
      passEl.classList.add("input-error");
      pass2El.classList.add("input-error");
      if (pass2ErrorEl) pass2ErrorEl.textContent = "Passwords do not match.";
      pass2El.focus();
      return;
    }

    try {
      const me = await API.register({ username, email, password: pass });
      // Bridge backend session -> localStorage
      syncLocalSession(me);

      msg.textContent = "✅ Registered! Redirecting...";
      msg.style.color = "green";
      setTimeout(() => (window.location.href = "details.html"), 800);
    } catch (err) {
      const message = (err && err.message) || "Registration failed";
      if (message.toLowerCase().includes("exists")) {
        emailEl.classList.add("input-error");
        if (emailErrorEl) {
          emailErrorEl.textContent =
            "Email or username already exists. Try logging in or use a different email.";
        }
        emailEl.focus();
      } else {
        msg.textContent = "❌ " + message;
        msg.style.color = "red";
      }
    }
  };
}

/* =========================
   LOGIN (email or username + show password + generic inline error)
   Note: no auto-redirect if a session exists
========================= */
function initLogin() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  // Allow usernames in the "email" field by disabling native email validation
  form.setAttribute("novalidate", "");

  const msg = document.getElementById("msg");
  const identifierEl = document.getElementById("loginEmail"); // email OR username
  const passEl = document.getElementById("loginPass");
  const showToggle = document.getElementById("showLoginPass");

  if (showToggle) {
    showToggle.addEventListener("change", () => {
      passEl.type = showToggle.checked ? "text" : "password";
    });
  }

  [identifierEl, passEl].forEach((el) =>
    el.addEventListener("input", () => {
      msg.textContent = "";
      msg.style.color = "";
    })
  );

  form.onsubmit = async (e) => {
    e.preventDefault();
    const identifier = identifierEl.value.trim();
    const pass = passEl.value;

    try {
      const me = await API.login({ identifier, password: pass });
      // Bridge backend session -> localStorage
      syncLocalSession(me);

      msg.textContent = "✅ Login successful!";
      msg.style.color = "green";
      setTimeout(() => (window.location.href = "dashboard.html"), 800);
    } catch {
      msg.textContent = "❌ Invalid email or password";
      msg.style.color = "red";
    }
  };
}

/* =========================
   DETAILS (inline validation, saves to backend, 10-digit mobile)
========================= */
function initDetails() {
  guard().then((me) => runDetails(me));

  async function guard() {
    try {
      const me = await API.me();
      // Bridge ensures other pages keep working
      syncLocalSession(me);
      return me;
    } catch {
      window.location.href = "login.html";
    }
  }

  function runDetails(me) {
    const nameEl = document.getElementById("name");
    const dobEl = document.getElementById("dob");
    const genderEl = document.getElementById("gender");
    const mobileEl = document.getElementById("mobile");
    const otpEl = document.getElementById("otp");
    const nextToRoleBtn = document.getElementById("nextToRole");

    const roleEl = document.getElementById("role");
    const sportEl = document.getElementById("sport");
    const nextToPicBtn = document.getElementById("nextToPic");

    const profilePicEl = document.getElementById("profilePic");
    const finishBtn = document.getElementById("finishBtn");
    const skipLink = document.getElementById("skipLink");
    const detailsMsg = document.getElementById("detailsMsg");

    const mobileErrorEl = document.getElementById("mobileError");
    const otpErrorEl = document.getElementById("otpError");
    const step1ErrorEl = document.getElementById("step1Error");
    const roleErrorEl = document.getElementById("roleError");
    const sportErrorEl = document.getElementById("sportError");

    const showStep = (n) => {
      document
        .querySelectorAll(".step")
        .forEach((s) => s.classList.remove("active"));
      document.querySelector(`.step-${n}`).classList.add("active");
    };

    const clearStep1Errors = () => {
      [nameEl, dobEl, genderEl, mobileEl, otpEl].forEach((el) =>
        el.classList.remove("input-error")
      );
      if (mobileErrorEl) mobileErrorEl.textContent = "";
      if (otpErrorEl) otpErrorEl.textContent = "";
      if (step1ErrorEl) step1ErrorEl.textContent = "";
    };
    const clearStep2Errors = () => {
      [roleEl, sportEl].forEach((el) => el.classList.remove("input-error"));
      if (roleErrorEl) roleErrorEl.textContent = "";
      if (sportErrorEl) sportErrorEl.textContent = "";
    };

    // Prefill from backend me
    const u = me || {};
    if (u.name) nameEl.value = u.name;
    if (u.dob) dobEl.value = u.dob?.slice?.(0, 10) || "";
    if (u.gender) genderEl.value = u.gender;
    if (u.mobile) mobileEl.value = u.mobile;
    if (u.role) roleEl.value = u.role;
    if (u.sport) sportEl.value = u.sport;

    const hasStep1 = !!(u.name && u.dob && u.gender && u.mobile);
    const hasStep2 = !!(u.role && u.sport);
    if (!hasStep1) showStep(1);
    else if (!hasStep2) showStep(2);
    else showStep(3);

    mobileEl.addEventListener("input", () => {
      const digits = mobileEl.value.replace(/\D/g, "").slice(0, 10);
      if (mobileEl.value !== digits) mobileEl.value = digits;
      mobileEl.classList.remove("input-error");
      if (mobileErrorEl) mobileErrorEl.textContent = "";
      if (step1ErrorEl) step1ErrorEl.textContent = "";
    });

    // Step 1: Next
    nextToRoleBtn.onclick = async () => {
      clearStep1Errors();
      detailsMsg.textContent = "";
      detailsMsg.style.color = "";

      const missing = [];
      if (!nameEl.value.trim()) {
        nameEl.classList.add("input-error");
        missing.push(nameEl);
      }
      if (!dobEl.value) {
        dobEl.classList.add("input-error");
        missing.push(dobEl);
      }
      if (!genderEl.value) {
        genderEl.classList.add("input-error");
        missing.push(genderEl);
      }
      const mobileDigits = mobileEl.value.replace(/\D/g, "");
      if (!mobileDigits) {
        mobileEl.classList.add("input-error");
        missing.push(mobileEl);
      }

      if (missing.length) {
        if (step1ErrorEl)
          step1ErrorEl.textContent = "Please fill all required fields.";
        missing[0].focus();
        return;
      }

      if (mobileDigits.length !== 10) {
        mobileEl.classList.add("input-error");
        if (mobileErrorEl)
          mobileErrorEl.textContent = "Enter a valid 10-digit mobile number.";
        mobileEl.focus();
        return;
      }

      if (otpEl.value.trim() !== "123456") {
        otpEl.classList.add("input-error");
        if (otpErrorEl)
          otpErrorEl.textContent = "Invalid OTP. Use 123456 for demo.";
        otpEl.focus();
        return;
      }

      try {
        const updated = await API.updateMe({
          name: nameEl.value.trim(),
          dob: dobEl.value,
          gender: genderEl.value,
          mobile: mobileDigits,
        });
        // Keep localStorage in sync
        syncLocalSession(updated);
        showStep(2);
      } catch (err) {
        detailsMsg.textContent = "❌ " + (err?.message || "Failed to save");
        detailsMsg.style.color = "red";
      }
    };

    // Step 2: Next
    nextToPicBtn.onclick = async () => {
      clearStep2Errors();
      detailsMsg.textContent = "";
      detailsMsg.style.color = "";

      let firstInvalid = null;
      if (!roleEl.value) {
        roleEl.classList.add("input-error");
        if (roleErrorEl) roleErrorEl.textContent = "Please select a role.";
        firstInvalid = firstInvalid || roleEl;
      }
      if (!sportEl.value) {
        sportEl.classList.add("input-error");
        if (sportErrorEl) sportErrorEl.textContent = "Please select a sport.";
        firstInvalid = firstInvalid || sportEl;
      }
      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      try {
        const updated = await API.updateMe({
          role: roleEl.value,
          sport: sportEl.value,
        });
        syncLocalSession(updated);
        showStep(3);
      } catch (err) {
        detailsMsg.textContent = "❌ " + (err?.message || "Failed to save");
        detailsMsg.style.color = "red";
      }
    };

    // Step 3: Finish
    finishBtn.onclick = async () => {
      detailsMsg.textContent = "";
      detailsMsg.style.color = "";

      const file = profilePicEl.files[0];
      const goLogin = () => {
        detailsMsg.textContent = "✅ Profile saved! Redirecting to Login...";
        detailsMsg.style.color = "green";
        setTimeout(() => (window.location.href = "login.html"), 900);
      };

      if (file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const updated = await API.updateMe({ profilePic: e.target.result });
            syncLocalSession(updated);
            goLogin();
          } catch (err) {
            detailsMsg.textContent =
              "❌ " + (err?.message || "Failed to save image");
            detailsMsg.style.color = "red";
          }
        };
        reader.readAsDataURL(file);
      } else {
        goLogin();
      }
    };

    // Step 3: Skip link
    skipLink.addEventListener("click", (e) => {
      e.preventDefault();
      skipLink.style.color = "#2563eb";
      setTimeout(() => {
        window.location.href = "login.html";
      }, 200);
    });

    // Clear errors on changes
    [nameEl, dobEl, otpEl].forEach((el) =>
      el.addEventListener("input", () => {
        el.classList.remove("input-error");
        if (el === otpEl && otpErrorEl) otpErrorEl.textContent = "";
        if (step1ErrorEl) step1ErrorEl.textContent = "";
      })
    );
    genderEl.addEventListener("change", () => {
      genderEl.classList.remove("input-error");
      if (step1ErrorEl) step1ErrorEl.textContent = "";
    });
    [roleEl, sportEl].forEach((el) =>
      el.addEventListener("change", () => {
        el.classList.remove("input-error");
        if (el === roleEl && roleErrorEl) roleErrorEl.textContent = "";
        if (el === sportEl && sportErrorEl) sportErrorEl.textContent = "";
      })
    );
  }
}
