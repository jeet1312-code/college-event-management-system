# College Event Management System — Firebase Setup Guide

This project now uses **Firebase Authentication** (for signup/login) and
**Firebase Firestore** (a real cloud database) instead of localStorage.
That means signups, logins, and registrations from ANY visitor, on ANY
device or browser, show up in your admin dashboard.

Follow these steps once. It takes about 10–15 minutes.

---

## Step 1 — Create a Firebase project

1. Go to https://console.firebase.google.com
2. Click **"Add project"**
3. Name it (e.g. `college-event-management`) → Continue
4. You can disable Google Analytics for this project (not needed) → Create project

## Step 2 — Register a Web App

1. On your project's home screen, click the **`</>`** (web) icon
2. Give it a nickname (e.g. `college-events-web`) → Register app
3. Firebase will show you a `firebaseConfig` object like this:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "college-event-management.firebaseapp.com",
  projectId: "college-event-management",
  storageBucket: "college-event-management.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456",
};
```

4. **Copy these exact values.**

## Step 3 — Paste your config into the project

1. Open `js/firebase-config.js` in VS Code
2. Replace each `"PASTE_YOUR_..._HERE"` placeholder with the matching value you copied
3. Save the file

## Step 4 — Enable Authentication

1. In the Firebase console left sidebar: **Build → Authentication**
2. Click **"Get started"**
3. Under "Sign-in method" tab, click **Email/Password** → toggle **Enable** → Save

## Step 5 — Enable Firestore Database

1. In the left sidebar: **Build → Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in test mode"** for now (you'll lock it down in Step 7) → pick a location close to you → Enable

## Step 6 — Run the site

Open `index.html` with Live Server (or `python -m http.server`) as before.
- Sign up as a normal student — this now creates a real account in Firebase Authentication, plus a profile document in Firestore under `users`.
- Add events as admin (see Step 8 for how to become admin) — they're stored in the `events` collection.
- Any visitor who opens your deployed link and signs up will show up in the SAME Firestore database, so your admin dashboard will see all of them.

## Step 7 — Lock down Firestore security rules (do this before going fully public)

"Test mode" allows anyone to read/write anything — fine for development, not for a real public site. Once things are working:

1. Firestore Database → **Rules** tab
2. Replace the rules with something like this, then **Publish**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    match /events/{eventId} {
      allow read: if true;
      allow write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin";
    }

    match /registrations/{regId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.studentUid == request.auth.uid;
      allow delete: if request.auth != null && (
        resource.data.studentUid == request.auth.uid ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin"
      );
    }

    match /mail/{mailId} {
      // Only signed-in users can queue an email (their own registration confirmation)
      allow create: if request.auth != null;
      allow read, update, delete: if false; // only the Trigger Email extension needs to read this
    }

    match /galleryImages/{imgId} {
      allow read: if true; // anyone can view event photos
      allow write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin";
    }
  }
}
```

This is a reasonable starting point — students can only edit their own profile/registrations, only admins can create/edit/delete events or gallery photos.

**If you enabled Firebase Storage (Step 9), also set its rules** — Storage has its own separate Rules tab:
1. Firebase console → **Storage** → **Rules** tab
2. Replace with:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /events/{eventId}/{fileName} {
      allow read: if true;
      allow write: if request.auth != null; // tighten further if you want admin-only uploads
    }
  }
}
```
3. **Publish**

## Step 8 — Make yourself an admin

There's no "sign up as admin" button on purpose (so random visitors can't grant themselves admin access). To create your own admin account:

1. Sign up normally through the site (creates a `student` account)
2. Go to Firebase console → **Firestore Database → Data**
3. Open the `users` collection, find the document with your email
4. Click the `role` field → change the value from `"student"` to `"admin"` → Save
5. Log out and log back in on the site — you'll now see the admin dashboard and Admin badge

You can repeat this for any teammate who should also have admin access.

## Step 9 — Enable Firebase Storage (needed for the Photo Gallery feature)

1. Firebase console → left sidebar → search **"Storage"** → click it
2. Click **"Get started"**
3. Choose **"Start in test mode"** → Next → pick a location → **Done**
4. That's it — admins can now upload event photos from the **Gallery** button on the Admin Dashboard, and everyone can view them on that event's details page

Like Firestore, this is a separate product that needs to be explicitly turned on — the app will silently fail to upload photos until this step is done.

## Step 10 — Set up email confirmations (needed for the Email Confirmation feature)

This app queues confirmation emails using Firebase's official **"Trigger Email"** Extension — no custom backend code needed, but it does need an SMTP email provider connected (a free one like SendGrid works well).

1. **Get a free SendGrid account** (or any SMTP provider): sendgrid.com → sign up → **Settings → API Keys → Create API Key** → copy the key somewhere safe
2. In Firebase console → left sidebar → **"Extensions"** (search for it if not visible) → **"Explore extensions"**
3. Search for **"Trigger Email"** (by Firebase) → click it → **Install**
4. During setup, it'll ask for:
   - **SMTP connection URI**, formatted like:
     `smtps://apikey:YOUR_SENDGRID_API_KEY@smtp.sendgrid.net:465`
   - **Email documents collection**: type `mail` (must match exactly — this is the Firestore collection this app already writes to on every registration)
   - **Default FROM address**: your sender email, e.g. `noreply@yourcollege.edu` (must be a verified sender in SendGrid — SendGrid walks you through verifying one for free)
5. Click **Install extension** → wait a few minutes for it to deploy

Once installed, every time a student registers for an event, this app automatically writes a document to the `mail` collection — and the extension picks it up and sends the email within a minute or two. No further code changes needed.

**Note:** if you skip this step, registrations still work completely normally — the app just quietly skips queuing an email (see `registration.js`, wrapped in a try/catch) rather than breaking anything.

## What's new in this version

| Feature | Where | Notes |
|---|---|---|
| 📅 Add to Calendar | Event details page | Downloads a `.ics` file any calendar app can import — no setup needed |
| ⏳ Countdown timer | Event details page | Live days/hours/min/sec countdown to the event — no setup needed |
| 📧 Email confirmation | On registration | Needs Step 10 above (Trigger Email extension) |
| 🎓 Certificate generator | Event details page, after the event date has passed, for registered students | Auto-drawn on an HTML canvas, downloads as PNG — no setup, no API key |
| 📸 Photo gallery | Admin: "Gallery" button on Dashboard. Everyone: shown on event details page if photos exist | Needs Step 9 above (Firebase Storage) |


Push this project to GitHub as before, then enable **GitHub Pages** in your repo's Settings → Pages. Your `firebase-config.js` values are safe to be public — Firebase web API keys are not secret; real security comes from the Firestore Rules in Step 7, not from hiding the config.

---

### What changed from the localStorage version
| Before | Now |
|---|---|
| Data stored per-browser in `localStorage` | Data stored centrally in Firestore, shared by every visitor |
| Custom admin account (`admin@college.edu`) | You promote a real signed-up account to `admin` in Firestore |
| Passwords stored in plain text | Passwords handled securely by Firebase Authentication |
| All JS functions were synchronous | All data functions are now `async` (they talk to the cloud) |
