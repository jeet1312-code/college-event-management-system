/* =========================================================
   app.js — shared utilities used by every page (ES module)
   ========================================================= */
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export function escapeHtml(str) {
  if (str === undefined || str === null) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

export function showError(el, message) {
  el.textContent = message;
  el.classList.add("show");
}
export function hideError(el) {
  el.classList.remove("show");
}

/**
 * Resolves once Firebase has confirmed the current login state.
 * Returns { uid, name, email, role } or null if logged out.
 * This replaces the old synchronous getCurrentUser() from the
 * localStorage version — Firebase auth state is asynchronous.
 */
export function getCurrentUserProfile() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) return resolve(null);
      const snap = await getDoc(doc(db, "users", fbUser.uid));
      if (!snap.exists()) return resolve(null);
      resolve({ uid: fbUser.uid, ...snap.data() });
    });
  });
}

export async function logout() {
  await signOut(auth);
}

/** Build and inject the top navigation bar. Call on every page. */
export async function renderNavbar(activePage) {
  const nav = document.getElementById("navbar");
  if (!nav) return null;
  const user = await getCurrentUserProfile();

  let links = "";
  if (!user) {
    links = `
      <a href="events.html" data-page="events">Events</a>
      <a href="login.html" data-page="login">Login</a>
      <a href="signup.html" data-page="signup">Sign Up</a>
    `;
  } else if (user.role === "admin") {
    links = `
      <a href="events.html" data-page="events">Events</a>
      <a href="admin-dashboard.html" data-page="admin-dashboard">Dashboard</a>
      <a href="add-event.html" data-page="add-event">Add Event</a>
      <a href="profile.html" data-page="profile">Profile</a>
      <button id="logoutBtn">Logout</button>
    `;
  } else {
    links = `
      <a href="events.html" data-page="events">Events</a>
      <a href="my-events.html" data-page="my-events">My Events</a>
      <a href="profile.html" data-page="profile">Profile</a>
      <button id="logoutBtn">Logout</button>
    `;
  }

  nav.innerHTML = `
    <div class="nav-inner">
      <a href="index.html" class="brand" style="text-decoration:none;">
        <span class="brand-badge">CE</span> College Events
      </a>
      <div class="nav-links">
        ${links}
        ${user ? `<span class="nav-user">${user.role === "admin" ? "🛠️ " : "👤 "}${escapeHtml(user.name)}</span>` : ""}
      </div>
    </div>
  `;

  if (activePage) {
    const el = nav.querySelector(`a[data-page="${activePage}"]`);
    if (el) el.classList.add("active");
  }

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await logout();
      window.location.href = "index.html";
    });
  }

  return user;
}

/** Redirect to login if nobody is logged in. Returns the user or null (and redirects). */
export async function requireAuth() {
  const user = await getCurrentUserProfile();
  if (!user) {
    window.location.href = "login.html";
    return null;
  }
  return user;
}

/** Redirect non-admins away from admin-only pages. */
export async function requireAdmin() {
  const user = await requireAuth();
  if (!user) return null;
  if (user.role !== "admin") {
    window.location.href = "events.html";
    return null;
  }
  return user;
}
