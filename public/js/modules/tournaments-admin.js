import { loadData, saveData } from "../core/storage.js";

const nowIso = () => new Date().toISOString();

export function createTournament(payload) {
  const data = loadData();
  if (!Array.isArray(data.tournaments)) data.tournaments = [];
  const t = {
    id: "t" + Date.now(),
    ...payload,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  data.tournaments.push(t);
  saveData(data);
  return t;
}

export function updateTournamentStatus(id, status) {
  const data = loadData();
  const idx = (data.tournaments || []).findIndex((t) => t.id === id);
  if (idx === -1) return false;
  data.tournaments[idx].status = status;
  data.tournaments[idx].updatedAt = nowIso();
  saveData(data);
  return true;
}

/* NEW: Publish/Unpublish for Admin */
export function publishTournament(id, adminId = "") {
  const data = loadData();
  const idx = (data.tournaments || []).findIndex((t) => t.id === id);
  if (idx === -1) return false;
  data.tournaments[idx] = {
    ...data.tournaments[idx],
    status: "PUBLISHED",
    publishedAt: nowIso(),
    publishedBy: adminId,
    updatedAt: nowIso(),
  };
  saveData(data);
  return true;
}

export function unpublishTournament(id, adminId = "") {
  const data = loadData();
  const idx = (data.tournaments || []).findIndex((t) => t.id === id);
  if (idx === -1) return false;
  // Revert to APPROVED (visible to admin only; not to players)
  data.tournaments[idx] = {
    ...data.tournaments[idx],
    status: "APPROVED",
    updatedAt: nowIso(),
    // keep publishedAt/publishedBy as history if you want
  };
  saveData(data);
  return true;
}

/* Used by Government Official page; included here for completeness */
export function listTournamentsForOfficial(opts = {}) {
  const { state = "", district = "", status = "SUBMITTED" } = opts;
  const data = loadData();
  const src = (data.tournaments || []).filter((t) => {
    if (status && t.status !== status) return false;
    if (state && t.state !== state) return false;
    if (district && t.district !== district) return false;
    return true;
  });

  return src
    .sort((a, b) =>
      (a.startDateTime || "").localeCompare(b.startDateTime || "")
    )
    .map((t) => ({
      id: t.id,
      name: t.name,
      sport: t.sport,
      venue: t.venue,
      state: t.state,
      district: t.district,
      description: t.description || "",
      range: formatRange(t.startDateTime, t.endDateTime),
      registration: t.registration || {},
      eligibility: t.eligibility || {},
      format: t.format || "",
      limits: t.limits || {},
      media: t.media || {},
      needsApproval: !!t.needsApproval,
    }));
}

export function setTournamentReview({
  tournamentId,
  decision,
  note = "",
  officialId = "",
}) {
  const data = loadData();
  const idx = (data.tournaments || []).findIndex((t) => t.id === tournamentId);
  if (idx === -1) return false;

  const allowed = new Set(["APPROVED", "REJECTED"]);
  const dec = String(decision || "").toUpperCase();
  if (!allowed.has(dec)) return false;

  data.tournaments[idx] = {
    ...data.tournaments[idx],
    status: dec,
    reviewedAt: nowIso(),
    reviewedBy: officialId,
    reviewNote: String(note || ""),
    updatedAt: nowIso(),
  };
  saveData(data);
  return true;
}

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
