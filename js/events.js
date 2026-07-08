/* =========================================================
   events.js — event CRUD via Firestore "events" collection
   Each doc: { title, date, venue, seats, description }
   ========================================================= */
import { db } from "./firebase-config.js";
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, getDoc, query, where,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getParticipantsForEvent, deleteRegistrationsForEvent } from "./registration.js";

const eventsCol = collection(db, "events");

export async function getEvents() {
  const snap = await getDocs(eventsCol);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getEventById(id) {
  const snap = await getDoc(doc(db, "events", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function addEvent({ title, date, venue, seats, description, tags }) {
  await addDoc(eventsCol, {
    title: title.trim(),
    date,
    venue: venue.trim(),
    seats: Number(seats),
    description: description.trim(),
    tags: Array.isArray(tags) ? tags : [],
  });
}

export async function updateEvent(id, { title, date, venue, seats, description, tags }) {
  await updateDoc(doc(db, "events", id), {
    title: title.trim(),
    date,
    venue: venue.trim(),
    seats: Number(seats),
    description: description.trim(),
    tags: Array.isArray(tags) ? tags : [],
  });
}

export async function deleteEvent(id) {
  await deleteDoc(doc(db, "events", id));
  await deleteRegistrationsForEvent(id); // clean up orphaned registrations
}

/** How many seats are left for this event */
export async function seatsLeft(eventId) {
  const event = await getEventById(eventId);
  if (!event) return 0;
  const taken = (await getParticipantsForEvent(eventId)).length;
  return Math.max(0, event.seats - taken);
}

/** Search + optional exact-date filter (client-side, fine for small datasets) */
export async function searchEvents(query_, dateFilter) {
  let events = await getEvents();
  if (query_ && query_.trim()) {
    const q = query_.trim().toLowerCase();
    events = events.filter(e =>
      e.title.toLowerCase().includes(q) ||
      e.venue.toLowerCase().includes(q) ||
      (e.description || "").toLowerCase().includes(q)
    );
  }
  if (dateFilter) {
    events = events.filter(e => e.date === dateFilter);
  }
  return events;
}

/** Seed a few sample events the first time the app runs (only if collection is empty) */
export async function seedEvents() {
  const existing = await getDocs(eventsCol);
  if (!existing.empty) return;
  const samples = [
    { title: "Hackathon 2024", date: "2024-08-20", venue: "Seminar Hall", seats: 60, description: "24 Hour Coding Challenge open to all branches. Bring your own laptop and team of up to 4.", tags: ["Coding", "Workshop"] },
    { title: "Web Development Workshop", date: "2024-08-25", venue: "Lab 1", seats: 30, description: "Hands-on workshop covering HTML, CSS, JavaScript fundamentals and building your first web app.", tags: ["Coding", "Workshop"] },
    { title: "Tech Quiz", date: "2024-08-30", venue: "Auditorium", seats: 60, description: "General technology and computer science quiz. Prizes for top 3 teams.", tags: ["Quiz", "Coding"] },
    { title: "Tech Fest", date: "2024-09-05", venue: "Main Ground", seats: 200, description: "Annual college-wide technology festival with exhibits, talks, and competitions.", tags: ["Coding", "Business"] },
  ];
  for (const s of samples) await addDoc(eventsCol, s);
}
