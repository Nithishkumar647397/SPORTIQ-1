// js/upload.js (V1, frontend-only)
// Enhancements: field validation on Next, image compression + preview, user sport prefill

import { addAchievement } from "./modules/achievements.js";
import { requireLogin } from "./core/auth.js";
import { getCurrentUser } from "./modules/users.js";

requireLogin();

let proofImage = null;

// Elements
const section1 = document.getElementById("section-1");
const section2 = document.getElementById("section-2");
const nextBtn = document.getElementById("nextBtn");
const prevBtn = document.getElementById("prevBtn");
const saveCertBtn = document.getElementById("saveCertBtn");
const replaceCertBtn = document.getElementById("replaceCertBtn");
const finalSaveBtn = document.getElementById("finalSave");
const cancelBtn = document.getElementById("cancelBtn");

const titleEl = document.getElementById("title");
const sportEl = document.getElementById("sportCategory");
const dateEl = document.getElementById("date");
const venueEl = document.getElementById("venue");
const descEl = document.getElementById("description");
const proofInput = document.getElementById("proof");

const previewWrap = document.getElementById("previewWrap");
const previewImg = document.getElementById("previewImg");
const previewSize = document.getElementById("previewSize");

// Prefill sport from current user (if present)
const user = getCurrentUser();
if (user?.sport && sportEl) {
  const wanted = String(user.sport).trim();
  const opts = Array.from(sportEl.options).map((o) => o.value);
  if (!opts.includes(wanted)) {
    const opt = document.createElement("option");
    opt.value = opt.textContent = wanted;
    sportEl.appendChild(opt);
  }
  sportEl.value = wanted;
}

// Helpers
function showSection(step) {
  if (step === 1) {
    section2.classList.remove("active");
    section1.classList.add("active");
  } else {
    section1.classList.remove("active");
    section2.classList.add("active");
  }
}

function validateStep1() {
  const title = titleEl.value.trim();
  const sport = sportEl.value.trim();
  const date = dateEl.value;
  const venue = venueEl.value.trim();

  if (!title || !sport || !date || !venue) {
    alert("Please fill Title, Sport, Date, and Venue.");
    return false;
  }
  // Optional: prevent future dates
  // const today = new Date().toISOString().slice(0, 10);
  // if (date > today) { alert("Date cannot be in the future."); return false; }

  return true;
}

// Events
nextBtn.onclick = () => {
  if (!validateStep1()) return;
  showSection(2);
};

prevBtn.onclick = () => showSection(1);

saveCertBtn.onclick = async () => {
  const file = proofInput.files?.[0];
  if (!file) return alert("Pick an image file first.");
  if (!file.type.startsWith("image/")) {
    alert("Please select an image file.");
    proofInput.value = "";
    return;
  }
  try {
    const dataUrl = await compressImage(file, 1280, 600 * 1024); // ~600 KB target
    proofImage = dataUrl;

    // Preview
    if (previewImg && previewWrap && previewSize) {
      previewImg.src = dataUrl;
      previewWrap.hidden = false;
      const bytes = Math.round((dataUrl.length * 3) / 4);
      const kb = Math.round(bytes / 1024);
      previewSize.textContent = `~${kb} KB`;
    }
    alert("✅ Certificate saved");
  } catch (err) {
    console.error(err);
    alert("Failed to process the image. Try a different file.");
  }
};

replaceCertBtn.onclick = () => {
  proofImage = null;
  if (proofInput) proofInput.value = "";
  if (previewWrap) previewWrap.hidden = true;
  if (previewImg) previewImg.src = "";
  if (previewSize) previewSize.textContent = "";
};

finalSaveBtn.onclick = () => {
  const title = titleEl.value.trim();
  const sport = sportEl.value.trim();
  const date = dateEl.value;
  const venue = venueEl.value.trim();
  const desc = descEl.value.trim();

  if (!title || !sport || !date || !venue || !desc) {
    alert("Fill all fields before saving.");
    return;
  }

  if (!proofImage) {
    const ok = confirm("No certificate image attached. Save without proof?");
    if (!ok) return;
  }

  addAchievement({
    title,
    date,
    description: desc,
    proof: proofImage || "",
    sport,
    venue,
  });

  alert("✅ Achievement saved!");
  window.location.href = "achievements.html";
};

cancelBtn.onclick = () => {
  if (confirm("Cancel?")) window.location.href = "achievements.html";
};

// Image utilities
async function compressImage(file, maxWidth = 1280, maxBytes = 600 * 1024) {
  const dataUrl = await readFileAsDataURL(file);
  const img = await loadImage(dataUrl);

  const ratio = img.width > maxWidth ? maxWidth / img.width : 1;
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);

  let quality = 0.85;
  let out = canvas.toDataURL("image/jpeg", quality);

  for (let i = 0; i < 5; i++) {
    const bytes = Math.round((out.length * 3) / 4);
    if (bytes <= maxBytes) break;
    quality -= 0.1;
    if (quality < 0.4) break;
    out = canvas.toDataURL("image/jpeg", quality);
  }
  return out;
}

function readFileAsDataURL(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}