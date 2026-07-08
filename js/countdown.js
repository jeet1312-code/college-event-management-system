/* =========================================================
   countdown.js — live countdown timer to an event date
   ========================================================= */

/**
 * Renders a live-updating countdown into the given container element.
 * Assumes the event starts at 09:00 local time on its date.
 * Returns a cleanup function to stop the timer (call on page unload if needed).
 */
export function mountCountdown(containerEl, dateStr) {
  const target = new Date(`${dateStr}T09:00:00`).getTime();

  function render() {
    const now = Date.now();
    const diff = target - now;

    if (diff <= 0) {
      containerEl.innerHTML = `<span class="countdown-done">🎉 This event has started / passed</span>`;
      return false; // stop the interval
    }

    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);

    containerEl.innerHTML = `
      <div class="countdown-box">
        <div class="countdown-unit"><span>${days}</span><small>Days</small></div>
        <div class="countdown-unit"><span>${String(hours).padStart(2, "0")}</span><small>Hrs</small></div>
        <div class="countdown-unit"><span>${String(mins).padStart(2, "0")}</span><small>Min</small></div>
        <div class="countdown-unit"><span>${String(secs).padStart(2, "0")}</span><small>Sec</small></div>
      </div>
    `;
    return true;
  }

  if (!render()) return () => {};
  const interval = setInterval(() => {
    if (!render()) clearInterval(interval);
  }, 1000);

  return () => clearInterval(interval);
}
