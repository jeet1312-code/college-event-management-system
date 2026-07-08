/* =========================================================
   ics.js — "Add to Calendar" (.ics file) generator
   Pure client-side, no external service. Produces a standard
   iCalendar file any calendar app (Google, Apple, Outlook) can import.
   ========================================================= */

/** Escape text per the iCalendar spec (commas, semicolons, newlines) */
function icsEscape(str) {
  return String(str || "")
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\n/g, "\\n");
}

/** Format a Date as YYYYMMDDTHHmmssZ (UTC), required by the .ics format */
function toICSDate(date) {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

/**
 * Trigger a browser download of a .ics file for the given event.
 * Assumes the event runs from its date at 09:00 to 17:00 local time
 * (colleges rarely publish exact times, so this is a sensible default).
 */
export function downloadICS(event) {
  const start = new Date(`${event.date}T09:00:00`);
  const end = new Date(`${event.date}T17:00:00`);

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//College Event Management System//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${event.id}@college-events`,
    `DTSTAMP:${toICSDate(new Date())}`,
    `DTSTART:${toICSDate(start)}`,
    `DTEND:${toICSDate(end)}`,
    `SUMMARY:${icsEscape(event.title)}`,
    `LOCATION:${icsEscape(event.venue)}`,
    `DESCRIPTION:${icsEscape(event.description || "")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${event.title.replace(/\s+/g, "_")}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
