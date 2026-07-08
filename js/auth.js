/* =========================================================
   auth.js — signup / login / profile updates (ES module)
   Uses Firebase Authentication for credentials, and a
   Firestore "users" collection (keyed by uid) for profile
   data: { name, email, role }.
   ========================================================= */
import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile as updateAuthProfile,
  updatePassword,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getCurrentUserProfile } from "./app.js";

/**
 * Create a new student account in Firebase Auth + Firestore profile doc.
 * Returns { ok: true } or { ok: false, message }
 */
export async function signup(name, email, password) {
  name = name.trim();
  email = email.trim().toLowerCase();

  if (!name || !email || !password) {
    return { ok: false, message: "All fields are required." };
  }
  if (password.length < 6) {
    return { ok: false, message: "Password must be at least 6 characters." };
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateAuthProfile(cred.user, { displayName: name });
    await setDoc(doc(db, "users", cred.user.uid), {
      name,
      email,
      role: "student",
      createdAt: new Date().toISOString(),
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, message: friendlyAuthError(err) };
  }
}

/**
 * Attempt login. Returns { ok: true, user } or { ok: false, message }
 */
export async function login(email, password) {
  email = email.trim().toLowerCase();
  try {
    await signInWithEmailAndPassword(auth, email, password);
    const user = await getCurrentUserProfile();
    return { ok: true, user };
  } catch (err) {
    return { ok: false, message: friendlyAuthError(err) };
  }
}

/** Update the logged-in user's profile (name / password) */
export async function updateProfile(newName, newPassword) {
  const fbUser = auth.currentUser;
  if (!fbUser) return { ok: false, message: "Not logged in." };

  try {
    if (newName && newName.trim()) {
      await updateAuthProfile(fbUser, { displayName: newName.trim() });
      await setDoc(doc(db, "users", fbUser.uid), { name: newName.trim() }, { merge: true });
    }
    if (newPassword && newPassword.trim()) {
      if (newPassword.trim().length < 6) {
        return { ok: false, message: "Password must be at least 6 characters." };
      }
      await updatePassword(fbUser, newPassword.trim());
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, message: friendlyAuthError(err) };
  }
}

/** Translate Firebase error codes into plain-English messages */
function friendlyAuthError(err) {
  const code = err?.code || "";
  if (code.includes("email-already-in-use")) return "An account with this email already exists.";
  if (code.includes("invalid-email")) return "Please enter a valid email address.";
  if (code.includes("weak-password")) return "Password must be at least 6 characters.";
  if (code.includes("user-not-found") || code.includes("wrong-password") || code.includes("invalid-credential"))
    return "Invalid email or password.";
  if (code.includes("requires-recent-login")) return "Please log out and log back in, then try changing your password again.";
  if (code.includes("network-request-failed")) return "Network error — check your internet connection.";
  return err?.message || "Something went wrong. Please try again.";
}
