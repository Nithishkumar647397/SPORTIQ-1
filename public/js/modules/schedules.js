import { loadData, saveData } from "../core/storage.js";

/* Utilities */
const nowIso = () => new Date().toISOString();

/* Ensure arrays exist (defensive) */
function ensure(data) {
  if (!Array.isArray(data.schedules)) data.schedules = [];
  if (!Array.isArray(data.scheduleRequests)) data.scheduleRequests = [];
}

/* Create a schedule */
export function addSchedule({
  coachId,
  sport,
  date,
  startTime,
  endTime,
  venue,
  entrance,
}) {
  const data = loadData();
  ensure(data);

  const sched = {
    id: "s" + Date.now(),
    coachId,
    sport,
    date, // YYYY-MM-DD
    startTime, // HH:mm
    endTime: endTime || "",
    venue,
    entrance, // OPEN | APPROVAL
    createdAt: nowIso(),
  };

  data.schedules.push(sched);
  saveData(data);
  return sched;
}

/* List schedules created by this coach (newest first) */
export function listSchedulesByCoach(coachId) {
  const data = loadData();
  ensure(data);
  return (data.schedules || [])
    .filter((s) => s.coachId === coachId)
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

/* List requests for a schedule (optionally by status) */
export function listRequestsBySchedule(scheduleId, status = "PENDING") {
  const data = loadData();
  ensure(data);
  let reqs = (data.scheduleRequests || []).filter(
    (r) => r.scheduleId === scheduleId
  );
  if (status) reqs = reqs.filter((r) => r.status === status);
  return reqs;
}

/* Approve/Reject a request */
export function setRequestStatus(requestId, status) {
  const data = loadData();
  ensure(data);
  const idx = (data.scheduleRequests || []).findIndex(
    (r) => r.id === requestId
  );
  if (idx === -1) return false;
  data.scheduleRequests[idx].status = status;
  data.scheduleRequests[idx].updatedAt = nowIso();
  saveData(data);
  return true;
}

/* (Optional) Player creates a request - provided for future use */
export function createRequest({ scheduleId, playerId, message = "" }) {
  const data = loadData();
  ensure(data);
  const req = {
    id: "rq" + Date.now(),
    scheduleId,
    playerId,
    status: "PENDING",
    message,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  data.scheduleRequests.push(req);
  saveData(data);
  return req;
}
