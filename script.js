/* ===========================================================
   Expiry Calculator — core logic + UI wiring
   =========================================================== */

const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/**
 * formatDate(date, fmt) — renders a Date in the chosen format string.
 * Supported fmt values:
 *   "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD"
 *   "MMM D, YYYY" | "D MMM YYYY" | "DD.MM.YYYY"
 */
function formatDate(d, fmt) {
  const mm    = String(d.getMonth() + 1).padStart(2, "0");
  const dd    = String(d.getDate()).padStart(2, "0");
  const yyyy  = d.getFullYear();
  const mAbbr = MONTH_ABBR[d.getMonth()];
  const dNum  = d.getDate();
  switch (fmt) {
    case "DD/MM/YYYY":  return `${dd}/${mm}/${yyyy}`;
    case "YYYY-MM-DD":  return `${yyyy}-${mm}-${dd}`;
    case "MMM D, YYYY": return `${mAbbr} ${dNum}, ${yyyy}`;
    case "D MMM YYYY":  return `${dNum} ${mAbbr} ${yyyy}`;
    case "DD.MM.YYYY":  return `${dd}.${mm}.${yyyy}`;
    case "MM/DD/YYYY":
    default:            return `${mm}/${dd}/${yyyy}`;
  }
}

/**
 * calculateExpiryDates(daysToAdd, options)
 *   options.format          — date format string (default "MM/DD/YYYY")
 *   options.includeWeekends — keep Sat/Sun end dates as-is (default false)
 *
 * Returns:
 *   startDate       — today, formatted
 *   endDate         — today + daysToAdd, shifted off the weekend unless includeWeekends
 *   adjusted        — true if a weekend shift happened
 *   originalEndDate — pre-shift end date, formatted
 */
function calculateExpiryDates(daysToAdd, options = {}) {
  const { format = "MM/DD/YYYY", includeWeekends = false } = options;

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + Number(daysToAdd));

  const originalEnd = new Date(end);
  let adjusted = false;

  if (!includeWeekends) {
    const day = end.getDay(); // 0 = Sun, 6 = Sat
    if (day === 6) { end.setDate(end.getDate() + 2); adjusted = true; }
    else if (day === 0) { end.setDate(end.getDate() + 1); adjusted = true; }
  }

  return {
    startDate: formatDate(start, format),
    endDate: formatDate(end, format),
    adjusted,
    originalEndDate: formatDate(originalEnd, format),
    _start: start,
    _end: end,
    _originalEnd: originalEnd,
  };
}

/* Expose for console testing */
window.calculateExpiryDates = calculateExpiryDates;
window.formatDate = formatDate;

/* ===========================================================
   UI wiring
   =========================================================== */

const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

const form        = document.getElementById("form");
const input       = document.getElementById("days");
const formatSel   = document.getElementById("format");
const includeCb   = document.getElementById("include-weekends");
const suffix      = document.getElementById("suffix");
const errorBox    = document.getElementById("error");
const errorText   = document.getElementById("error-text");
const results     = document.getElementById("results");
const startDateEl = document.getElementById("start-date");
const startDayEl  = document.getElementById("start-day");
const endDateEl   = document.getElementById("end-date");
const endDayEl    = document.getElementById("end-day");
const noteEl      = document.getElementById("note");
const noteText    = document.getElementById("note-text");
const pillDays    = document.getElementById("pill-days-text");
const pillFormat  = document.getElementById("pill-format-text");
const pillWeekend = document.getElementById("pill-weekend-text");

function showError(msg) {
  errorText.textContent = msg;
  errorBox.classList.add("show");
  input.classList.add("error");
}
function clearError() {
  errorBox.classList.remove("show");
  input.classList.remove("error");
}

function reanimate(el) {
  el.classList.remove("anim");
  void el.offsetWidth; // force reflow to restart animation
  el.classList.add("anim");
}

function validate(raw) {
  if (raw === "" || raw === null) return { ok: false, msg: "Please enter a number of days to add." };
  const n = Number(raw);
  if (Number.isNaN(n)) return { ok: false, msg: "That doesn't look like a valid number." };
  if (!Number.isInteger(n)) return { ok: false, msg: "Use a whole number — no decimals." };
  if (n < 0) return { ok: false, msg: "Days to add must be zero or greater." };
  if (n > 36500) return { ok: false, msg: "That's over 100 years away — try a smaller value." };
  return { ok: true, value: n };
}

function render() {
  const raw = input.value.trim();
  const v = validate(raw);

  if (!v.ok) {
    showError(v.msg);
    return;
  }
  clearError();

  const fmt = formatSel.value;
  const includeWeekends = includeCb.checked;
  const r = calculateExpiryDates(v.value, { format: fmt, includeWeekends });

  startDateEl.textContent = r.startDate;
  startDayEl.textContent  = `${DAY_NAMES[r._start.getDay()]} · Today`;
  endDateEl.textContent   = r.endDate;
  endDayEl.textContent    = DAY_NAMES[r._end.getDay()];

  if (r.adjusted) {
    const origDay = DAY_NAMES[r._originalEnd.getDay()];
    noteText.innerHTML =
      `The raw end date <b>${r.originalEndDate}</b> fell on <b>${origDay}</b>, so it shifted forward to <b>${r.endDate}</b>.`;
    noteEl.classList.add("show");
  } else {
    noteEl.classList.remove("show");
  }

  pillDays.textContent = `+${v.value} calendar ${v.value === 1 ? "day" : "days"}`;
  pillFormat.textContent = fmt;
  pillWeekend.textContent = includeWeekends ? "Weekends included" : "Weekends skipped";
  suffix.textContent = v.value === 1 ? "day" : "days";

  reanimate(results);
  if (r.adjusted) reanimate(noteEl);
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  render();
});

input.addEventListener("input", () => {
  if (input.classList.contains("error")) {
    const v = validate(input.value.trim());
    if (v.ok) clearError();
  }
});

// Re-render live when format or weekend toggle changes
formatSel.addEventListener("change", render);
includeCb.addEventListener("change", render);

// Auto-calc on load
render();
