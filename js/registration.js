/* =========================================================
   registration.js — student event registrations
   Firestore "registrations" collection, each doc:
   { eventId, studentUid, studentEmail, studentName, regDate }
   ========================================================= */
import { db } from "./firebase-config.js";
import {
  collection, addDoc, deleteDoc, doc,
  getDocs, query, where,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const regsCol = collection(db, "registrations");
// "mail" collection is watched by the Firebase "Trigger Email" extension
// (see README setup steps) — any doc added here gets emailed automatically.
const mailCol = collection(db, "mail");

export async function getRegistrations() {
  const snap = await getDocs(regsCol);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Register the given user for an event.
 * `eventInfo` ({ title, date, venue }) is optional and only used to
 * personalize the confirmation email — registration still works without it.
 * Returns { ok: true } or { ok: false, message }
 */
export async function registerForEvent(eventId, user, seatsLeftFn, eventInfo) {
  if (!user) return { ok: false, message: "Please log in first." };

  const already = await isRegistered(eventId, user.uid);
  if (already) return { ok: false, message: "You are already registered for this event." };

  const left = await seatsLeftFn(eventId);
  if (left <= 0) return { ok: false, message: "Sorry, this event is fully booked." };

  await addDoc(regsCol, {
    eventId,
    studentUid: user.uid,
    studentEmail: user.email,
    studentName: user.name,
    regDate: new Date().toISOString().slice(0, 10),
  });

  // Fire off a confirmation email (silently skipped if the extension isn't installed yet)
  try {
    await sendRegistrationEmail(user, eventInfo);
  } catch (e) {
    // Don't fail the registration just because the email couldn't be queued
    console.warn("Could not queue confirmation email:", e);
  }

  return { ok: true };
}

/** Queue a confirmation email for the Trigger Email extension to send */
async function sendRegistrationEmail(user, eventInfo) {
  if (!eventInfo) return;
  await addDoc(mailCol, {
    to: [user.email],
    message: {
      subject: `You're registered: ${eventInfo.title}`,
      html: `
        <div style="font-family:Arial,sans-serif; max-width:480px; margin:0 auto;">
          <h2 style="color:#0d2a4d;">You're all set, ${user.name}! 🎉</h2>
          <p>Your registration for <strong>${eventInfo.title}</strong> is confirmed.</p>
          <table style="margin:16px 0; font-size:14px; color:#333;">
            <tr><td style="padding:4px 12px 4px 0;">📅 Date</td><td>${eventInfo.date}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;">📍 Venue</td><td>${eventInfo.venue}</td></tr>
          </table>
          <p style="color:#5a6478; font-size:13px;">See you there! — College Event Management System</p>
        </div>
      `,
    },
  });
}

export async function cancelRegistration(regId) {
  await deleteDoc(doc(db, "registrations", regId));
}

/** Delete every registration tied to an event (used when an event is deleted) */
export async function deleteRegistrationsForEvent(eventId) {
  const snap = await getDocs(query(regsCol, where("eventId", "==", eventId)));
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
}

/** All registrations belonging to the given student uid, newest first */
export async function getMyRegistrations(uid) {
  const snap = await getDocs(query(regsCol, where("studentUid", "==", uid)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.regDate < b.regDate ? 1 : -1));
}

/** All participants registered for a given event */
export async function getParticipantsForEvent(eventId) {
  const snap = await getDocs(query(regsCol, where("eventId", "==", eventId)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function isRegistered(eventId, uid) {
  const snap = await getDocs(query(regsCol, where("eventId", "==", eventId), where("studentUid", "==", uid)));
  return !snap.empty;
}
