/* =========================================================
   chatbot.js — floating "AI Assistant" widget
   ---------------------------------------------------------
   Rule-based intent matching (keywords -> response), backed
   by LIVE Firestore data (real event names, real seat counts,
   a student's real registrations). No external API, no key,
   works the moment you deploy — safe for a public static site.
   ========================================================= */
import { getCurrentUserProfile, formatDate, escapeHtml } from "./app.js";
import { getEvents, searchEvents, seatsLeft } from "./events.js";
import { getMyRegistrations } from "./registration.js";

let mounted = false;

export function mountChatbot() {
  if (mounted) return;
  mounted = true;

  const wrap = document.createElement("div");
  wrap.id = "aiChatbot";
  wrap.innerHTML = `
    <button id="chatToggleBtn" aria-label="Open assistant">🤖</button>
    <div id="chatPanel" class="chat-panel hidden">
      <div class="chat-header">
        <span>🤖 Event Assistant</span>
        <button id="chatCloseBtn" aria-label="Close">✕</button>
      </div>
      <div id="chatMessages" class="chat-messages"></div>
      <div class="chat-quick" id="chatQuick">
        <button data-q="What events are open?">What events are open?</button>
        <button data-q="How do I register?">How do I register?</button>
        <button data-q="My events">My events</button>
      </div>
      <form id="chatForm" class="chat-input-row">
        <input id="chatInput" type="text" placeholder="Ask about events, seats, registering..." autocomplete="off" />
        <button type="submit">➤</button>
      </form>
    </div>
  `;
  document.body.appendChild(wrap);
  injectChatStyles();

  const panel = wrap.querySelector("#chatPanel");
  const messages = wrap.querySelector("#chatMessages");
  const form = wrap.querySelector("#chatForm");
  const input = wrap.querySelector("#chatInput");

  wrap.querySelector("#chatToggleBtn").addEventListener("click", () => {
    panel.classList.toggle("hidden");
    if (!panel.classList.contains("hidden") && messages.children.length === 0) {
      addBotMessage("Hi! I'm your event assistant 👋 Ask me things like <em>\"what events are open\"</em>, <em>\"seats left for hackathon\"</em>, or <em>\"how do I register\"</em>.");
    }
  });
  wrap.querySelector("#chatCloseBtn").addEventListener("click", () => panel.classList.add("hidden"));

  wrap.querySelectorAll("#chatQuick button").forEach(btn => {
    btn.addEventListener("click", () => handleUserMessage(btn.dataset.q));
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    handleUserMessage(text);
  });

  function addUserMessage(text) {
    const div = document.createElement("div");
    div.className = "chat-msg user";
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function addBotMessage(html) {
    const div = document.createElement("div");
    div.className = "chat-msg bot";
    div.innerHTML = html;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  async function handleUserMessage(text) {
    addUserMessage(text);
    const typing = document.createElement("div");
    typing.className = "chat-msg bot typing";
    typing.textContent = "…";
    messages.appendChild(typing);
    messages.scrollTop = messages.scrollHeight;

    const reply = await getBotReply(text);
    typing.remove();
    addBotMessage(reply);
  }
}

/** Core intent matching. Returns an HTML string reply. */
async function getBotReply(rawText) {
  const text = rawText.toLowerCase();

  // --- Greetings ---
  if (/\b(hi|hello|hey)\b/.test(text)) {
    return "Hey there! Ask me about events, seats, registration, or your account.";
  }

  // --- How to register / login / signup ---
  if (text.includes("how") && text.includes("register")) {
    return "To register: go to the <strong>Events</strong> page, open any event, and click <strong>Register Now</strong>. You'll need to be logged in first.";
  }
  if (text.includes("login") || text.includes("log in")) {
    return "Click <strong>Login</strong> in the top navigation bar and enter your email + password. No account yet? Use <strong>Sign Up</strong> instead.";
  }
  if (text.includes("sign up") || text.includes("signup") || text.includes("create account")) {
    return "Click <strong>Sign Up</strong> in the navigation bar, fill in your name, email, and a password (6+ characters) — you'll be logged in automatically.";
  }
  if (text.includes("cancel")) {
    return "You can cancel a registration from the <strong>My Events</strong> page, or from an event's details page if you're already registered.";
  }
  if (text.includes("admin")) {
    return "Admin access is granted by an existing admin directly in the database — there's no public sign-up for it, to keep the system secure.";
  }

  // --- "My events" (needs login) ---
  if (text.includes("my event") || text.includes("my registration")) {
    const user = await getCurrentUserProfile();
    if (!user) return "You'll need to <strong>log in</strong> first — then I can tell you which events you're registered for.";
    const regs = await getMyRegistrations(user.uid);
    if (regs.length === 0) return "You haven't registered for any events yet. Want me to suggest some? Try asking <em>\"what events are open\"</em>.";
    const events = await getEvents();
    const lines = regs.map(r => {
      const ev = events.find(e => String(e.id) === String(r.eventId));
      return ev ? `• <strong>${escapeHtml(ev.title)}</strong> — ${formatDate(ev.date)}` : "";
    }).filter(Boolean);
    return `You're registered for:<br>${lines.join("<br>")}`;
  }

  // --- Seats left for a specific event ---
  if (text.includes("seat")) {
    const events = await getEvents();
    const match = events.find(e => text.includes(e.title.toLowerCase()));
    if (match) {
      const left = await seatsLeft(match.id);
      return left > 0
        ? `<strong>${escapeHtml(match.title)}</strong> has <strong>${left}</strong> seat(s) left.`
        : `<strong>${escapeHtml(match.title)}</strong> is fully booked right now.`;
    }
    return "Which event? Try asking, for example: <em>\"seats left for hackathon\"</em>.";
  }

  // --- List / search events ---
  if (text.includes("event")) {
    // try to treat the message as a search query first (e.g. "any coding events?")
    const results = await searchEvents(text.replace(/[^a-z0-9 ]/g, " "), null);
    const events = results.length ? results : await getEvents();
    if (events.length === 0) return "There are no events posted yet — check back soon!";
    const top = events.slice(0, 5);
    const lines = await Promise.all(top.map(async e => {
      const left = await seatsLeft(e.id);
      return `• <strong>${escapeHtml(e.title)}</strong> — ${formatDate(e.date)} @ ${escapeHtml(e.venue)} (${left} seats left)`;
    }));
    return `Here's what I found:<br>${lines.join("<br>")}<br><br><a href="events.html">See all events →</a>`;
  }

  // --- Thanks / bye ---
  if (/\b(thanks|thank you|bye)\b/.test(text)) {
    return "You're welcome! 🎉 Good luck with the events.";
  }

  // --- Fallback ---
  return "I'm not totally sure about that one — try asking about <em>events</em>, <em>seats</em>, <em>registering</em>, or <em>my events</em>. Or browse the <a href=\"events.html\">Events page</a> directly.";
}

function injectChatStyles() {
  if (document.getElementById("aiChatbotStyles")) return;
  const style = document.createElement("style");
  style.id = "aiChatbotStyles";
  style.textContent = `
    #aiChatbot { position: fixed; bottom: 22px; right: 22px; z-index: 999; font-family: 'Inter', system-ui, sans-serif; }
    #chatToggleBtn {
      width: 56px; height: 56px; border-radius: 50%; border: none;
      background: linear-gradient(135deg, #f0a500, #c98600);
      font-size: 1.5rem; cursor: pointer; box-shadow: 0 8px 22px rgba(13,42,77,0.28);
      transition: transform .15s ease;
    }
    #chatToggleBtn:hover { transform: scale(1.08); }
    .chat-panel {
      position: absolute; bottom: 70px; right: 0;
      width: 320px; max-width: 88vw; height: 440px; max-height: 70vh;
      background: #fff; border-radius: 14px; box-shadow: 0 16px 40px rgba(13,42,77,0.28);
      display: flex; flex-direction: column; overflow: hidden;
      border: 1px solid #e3ddd0;
    }
    .chat-panel.hidden { display: none; }
    .chat-header {
      background: linear-gradient(180deg, #0d2a4d, #081c35); color: #fff;
      padding: 12px 14px; font-weight: 700; font-size: 0.92rem;
      display: flex; align-items: center; justify-content: space-between;
    }
    .chat-header button { background: none; border: none; color: #cfd9e8; cursor: pointer; font-size: 1rem; }
    .chat-messages { flex: 1; overflow-y: auto; padding: 12px; background: #faf8f2; }
    .chat-msg { max-width: 85%; padding: 8px 12px; border-radius: 10px; margin-bottom: 8px; font-size: 0.85rem; line-height: 1.45; }
    .chat-msg.bot { background: #eef2f7; color: #16233a; border-bottom-left-radius: 2px; }
    .chat-msg.user { background: #0d2a4d; color: #fff; margin-left: auto; border-bottom-right-radius: 2px; }
    .chat-msg.typing { color: #93a0b3; font-style: italic; }
    .chat-msg a { color: #f0a500; font-weight: 600; }
    .chat-quick { display: flex; gap: 6px; flex-wrap: wrap; padding: 8px 10px; border-top: 1px solid #eee; background: #fff; }
    .chat-quick button {
      font-size: 0.72rem; background: #fff2d9; color: #c98600; border: none;
      padding: 5px 9px; border-radius: 20px; cursor: pointer; font-weight: 600;
    }
    .chat-quick button:hover { background: #ffe6b0; }
    .chat-input-row { display: flex; border-top: 1px solid #e3ddd0; }
    .chat-input-row input {
      flex: 1; border: none; padding: 11px 12px; font-size: 0.85rem; outline: none; margin: 0; border-radius: 0;
    }
    .chat-input-row button {
      width: 44px; border: none; background: #0d2a4d; color: #f0a500; font-size: 1rem; cursor: pointer;
    }
  `;
  document.head.appendChild(style);
}
