/* =========================================================
   admin.js — admin dashboard stats helpers
   ========================================================= */
import { db } from "./firebase-config.js";
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getEvents, seatsLeft } from "./events.js";
import { getRegistrations, getParticipantsForEvent } from "./registration.js";

export async function getAdminStats() {
  const events = await getEvents();
  const regs = await getRegistrations();
  const studentsSnap = await getDocs(query(collection(db, "users"), where("role", "==", "student")));
  return {
    totalEvents: events.length,
    totalRegistrations: regs.length,
    totalStudents: studentsSnap.size,
  };
}

/** Recent events with seats-taken info attached, for the dashboard table */
export async function getRecentEvents(limit = 10) {
  const events = await getEvents();
  const withTaken = await Promise.all(events.map(async e => {
    const left = await seatsLeft(e.id);
    return { ...e, taken: e.seats - left };
  }));
  // Firestore document IDs are random strings, not sequential numbers,
  // so we just show them in whatever order Firestore returns (no numeric sort).
  return withTaken.slice(0, limit);
}

/** Export all registrations for one event as a CSV download */
export async function exportParticipantsCSV(eventId, eventTitle) {
  const rows = await getParticipantsForEvent(eventId);
  let csv = "Name,Email,Registration Date\n";
  rows.forEach(r => {
    csv += `${r.studentName},${r.studentEmail},${r.regDate}\n`;
  });
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(eventTitle || "event").replace(/\s+/g, "_")}_participants.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
