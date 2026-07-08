/* =========================================================
   recommend.js — lightweight "AI assistance" module
   ---------------------------------------------------------
   No external API calls, no API key required — this is a
   rule-based keyword/interest matcher that runs entirely in
   the browser. It powers two things:
     1. suggestTags()          -> auto-tags an event when an
                                   admin is creating/editing it
     2. getRecommendedEvents() -> ranks events for a student
                                   based on their past interests
   ========================================================= */

/** Interest categories and the keywords that hint at each one */
export const TAG_KEYWORDS = {
  Coding:    ["code", "coding", "hackathon", "programming", "developer", "software", "app", "web", "python", "java", "algorithm"],
  Design:    ["design", "ui", "ux", "graphic", "figma", "creative", "art", "poster", "branding"],
  Business:  ["business", "startup", "entrepreneur", "finance", "marketing", "pitch", "case study", "management"],
  Sports:    ["sports", "cricket", "football", "basketball", "athletics", "tournament", "match", "run", "marathon"],
  Music:     ["music", "band", "concert", "singing", "instrument", "dj", "dance"],
  Career:    ["career", "placement", "job", "resume", "interview", "internship", "recruit"],
  Workshop:  ["workshop", "training", "hands-on", "session", "bootcamp", "learn"],
  Quiz:      ["quiz", "trivia", "gk", "general knowledge", "competition"],
  Science:   ["science", "research", "lab", "experiment", "physics", "chemistry", "biology"],
};

export const ALL_TAGS = [...Object.keys(TAG_KEYWORDS), "General"];

/**
 * Suggest 1+ tags for an event based on its title/description text.
 * Pure keyword matching — deterministic, instant, no network call.
 */
export function suggestTags(title, description) {
  const text = `${title || ""} ${description || ""}`.toLowerCase();
  const matches = Object.entries(TAG_KEYWORDS)
    .filter(([, keywords]) => keywords.some(k => text.includes(k)))
    .map(([tag]) => tag);
  return matches.length ? matches : ["General"];
}

/**
 * Rank events for a student based on tags of events they've
 * already registered for. Falls back to soonest-upcoming events
 * if the student has no registration history yet.
 */
export async function getRecommendedEvents(user, { getEvents, getMyRegistrations, seatsLeft }) {
  const allEvents = await getEvents();
  if (!user) return allEvents.slice(0, 3);

  const myRegs = await getMyRegistrations(user.uid);
  const registeredIds = new Set(myRegs.map(r => String(r.eventId)));
  const candidates = allEvents.filter(e => !registeredIds.has(String(e.id)));

  // Build an interest profile: how many times each tag shows up in events I already joined
  const registeredEvents = allEvents.filter(e => registeredIds.has(String(e.id)));
  const interestScore = {};
  registeredEvents.forEach(e => {
    (e.tags || []).forEach(tag => {
      interestScore[tag] = (interestScore[tag] || 0) + 1;
    });
  });

  const hasHistory = Object.keys(interestScore).length > 0;

  let ranked;
  if (hasHistory) {
    ranked = candidates
      .map(e => {
        const score = (e.tags || []).reduce((sum, tag) => sum + (interestScore[tag] || 0), 0);
        return { ...e, _score: score };
      })
      .sort((a, b) => b._score - a._score)
      .filter(e => e._score > 0);

    // Not enough tag-matched events? top up with soonest upcoming ones
    if (ranked.length < 3) {
      const fillers = candidates
        .filter(e => !ranked.some(r => r.id === e.id))
        .sort((a, b) => (a.date < b.date ? -1 : 1));
      ranked = [...ranked, ...fillers];
    }
  } else {
    ranked = candidates.sort((a, b) => (a.date < b.date ? -1 : 1));
  }

  return ranked.slice(0, 3);
}
