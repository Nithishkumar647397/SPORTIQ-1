// js/modules/achievements.js
import { getCurrentUser, updateCurrentUser } from "./users.js";
import { loadData, saveData } from "../core/storage.js";

function nowIso() {
  return new Date().toISOString();
}

// Ensure legacy items (boolean or string verified) gain a status field
function withStatus(a) {
  if (a.status) return a;

  // Legacy: verified might be a string ("Rejected", "Approved")
  if (typeof a.verified === "string") {
    const v = a.verified.toUpperCase();
    const status =
      v === "APPROVED" ? "APPROVED" : v === "REJECTED" ? "REJECTED" : "PENDING";
    return { ...a, status };
  }

  // Legacy: boolean verified
  const status = a.verified === true ? "APPROVED" : "PENDING";
  return { ...a, status };
}

export function addAchievement({
  title,
  date,
  description,
  proof,
  sport,
  venue,
}) {
  const user = getCurrentUser();
  if (!user) throw new Error("No user");

  const newA = {
    id: "a" + Date.now(),
    title,
    date,
    description,
    proof, // base64 data URL
    sport,
    venue,
    verified: false, // keep for backward compatibility
    status: "PENDING", // PENDING | APPROVED | REJECTED
    decisionReason: "",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  const ach = Array.isArray(user.achievements) ? user.achievements.slice() : [];
  ach.push(newA);
  updateCurrentUser({ achievements: ach });
  return newA;
}

export function getUserAchievements() {
  const u = getCurrentUser();
  const list = (u?.achievements || []).map(withStatus);
  // newest first
  return list.sort((a, b) =>
    (b.createdAt || 0).localeCompare(a.createdAt || 0)
  );
}

export function updateAchievement(id, patch) {
  const u = getCurrentUser();
  if (!u) throw new Error("No user");
  const updated = (u.achievements || []).map((a) =>
    a.id === id
      ? withStatus({ ...a, ...patch, updatedAt: nowIso() })
      : withStatus(a)
  );
  updateCurrentUser({ achievements: updated });
  return updated.find((a) => a.id === id);
}

export function deleteAchievement(id) {
  const u = getCurrentUser();
  if (!u) return;
  const updated = (u.achievements || []).filter((a) => a.id !== id);
  updateCurrentUser({ achievements: updated });
}

// Strictly return only PENDING items; ignore legacy verified boolean
export function getPendingAchievements(users) {
  const list = [];
  (users || []).forEach((u) =>
    (u.achievements || []).forEach((a) => {
      const A = withStatus(a);
      if (A.status === "PENDING") {
        list.push({ ...A, owner: u.username, ownerId: u.id });
      }
    })
  );
  return list;
}

// decision can be "APPROVED" | "REJECTED" | true | false (case-insensitive for strings)
// Records verifiedBy/verifiedByName and enforces Coach sport guard
export function verifyAchievement(
  ownerId,
  achId,
  decision,
  decisionReason = ""
) {
  const actor = getCurrentUser(); // who is verifying (coach)
  const data = loadData();

  const uIdx = (data.users || []).findIndex((u) => u.id === ownerId);
  if (uIdx === -1) return false;

  const list = data.users[uIdx].achievements || [];
  const aIdx = list.findIndex((a) => a.id === achId);
  if (aIdx === -1) return false;

  const target = withStatus(list[aIdx]);

  // Normalize decision
  let status = "PENDING";
  if (typeof decision === "string") {
    const d = decision.toUpperCase().trim();
    status =
      d === "APPROVED" ? "APPROVED" : d === "REJECTED" ? "REJECTED" : "PENDING";
  } else {
    status =
      decision === true
        ? "APPROVED"
        : decision === false
        ? "REJECTED"
        : "PENDING";
  }

  // Sport guard: a Coach can verify only achievements matching their sport
  if (actor && actor.role === "Coach") {
    if (actor.sport && target.sport && actor.sport !== target.sport) {
      return false; // block cross-sport verification
    }
  }

  const updatedAch = withStatus({
    ...target,
    verified: status === "APPROVED",
    status,
    decisionReason: status === "REJECTED" ? decisionReason : "",
    verifiedBy: actor ? actor.id : target.verifiedBy || null,
    verifiedByName: actor
      ? actor.username || actor.name || ""
      : target.verifiedByName || "",
    verifiedAt: nowIso(),
    updatedAt: nowIso(),
  });

  data.users[uIdx].achievements = [
    ...list.slice(0, aIdx),
    updatedAch,
    ...list.slice(aIdx + 1),
  ];

  saveData(data);
  return true;
}
