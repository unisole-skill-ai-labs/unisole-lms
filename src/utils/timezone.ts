/**
 * Timezone utilities for Admin Course Editor & LMS
 * Standardizes all date/time handling to Indian Standard Time (IST, Asia/Kolkata, UTC+05:30)
 */

const IST_TIMEZONE = "Asia/Kolkata";

/**
 * Converts a UTC ISO date string into "YYYY-MM-DDTHH:mm" strictly in IST.
 * Suitable for HTML5 <input type="datetime-local" />.
 */
export function toIstDatetimeLocal(isoString?: string | null): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";

  // Extract year, month, day, hour, minute in Asia/Kolkata
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || "";

  let hour = getPart("hour");
  if (hour === "24") hour = "00";

  return `${getPart("year")}-${getPart("month")}-${getPart("day")}T${hour}:${getPart("minute")}`;
}

/**
 * Converts a "YYYY-MM-DDTHH:mm" value (entered in IST by user) into a UTC ISO string.
 * Returns null if the string is empty or invalid.
 */
export function fromIstDatetimeLocal(datetimeLocal?: string | null): string | null {
  if (!datetimeLocal || !datetimeLocal.trim()) return null;
  const trimmed = datetimeLocal.trim();

  // If already full ISO string with timezone, parse directly
  if (trimmed.includes("Z") || trimmed.includes("+") || (trimmed.includes("-") && trimmed.length > 19)) {
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  // Append explicit IST offset (+05:30) to preserve user-intended time
  const istString = `${trimmed}:00+05:30`;
  const date = new Date(istString);
  if (isNaN(date.getTime())) return null;
  return date.toISOString();
}

/**
 * Formats an ISO string clearly for IST display, e.g. "12 Dec 2026, 09:00 AM IST"
 */
export function formatIstDisplay(isoString?: string | null): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";

  const formatted = new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);

  return `${formatted} IST`;
}

/**
 * Validates that lockAt is strictly after unlockAt if both are provided.
 * Returns error string or null if valid.
 */
export function validateScheduleDates(
  unlockIso?: string | null,
  lockIso?: string | null
): string | null {
  if (!unlockIso || !lockIso) return null;
  const unlockMs = new Date(unlockIso).getTime();
  const lockMs = new Date(lockIso).getTime();
  if (isNaN(unlockMs) || isNaN(lockMs)) return null;

  if (lockMs <= unlockMs) {
    return "Lock date/time must be strictly after unlock date/time.";
  }
  return null;
}
