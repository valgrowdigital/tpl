import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Parses time-only strings (e.g., "13:30", "00:30", "18:00:00") or Date/ISO values
 * and converts them into standard 12-hour format: `h:mm AM/PM`.
 *
 * Examples:
 *   13:30 -> 1:30 PM
 *   18:00 -> 6:00 PM
 *   00:00 -> 12:00 AM
 *   00:30 -> 12:30 AM
 *   09:00 -> 9:00 AM
 *   12:00 -> 12:00 PM
 *   12:30 -> 12:30 PM
 *   23:59 -> 11:59 PM
 */
export function formatMatchTime(dateStr?: string | number | Date | null): string {
  if (!dateStr && dateStr !== 0) return "TBD";

  try {
    // 1. Check if string is a raw time format like "13:30" or "09:00:00"
    if (typeof dateStr === "string") {
      const timeMatch = dateStr.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
      if (timeMatch) {
        const hours = parseInt(timeMatch[1], 10);
        const minutes = parseInt(timeMatch[2], 10);
        if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
          const period = hours >= 12 ? "PM" : "AM";
          const h12 = hours % 12 === 0 ? 12 : hours % 12;
          const minStr = String(minutes).padStart(2, "0");
          return `${h12}:${minStr} ${period}`;
        }
      }
    }

    // 2. Parse as Date object / ISO string / Timestamp
    const d = dateStr instanceof Date ? dateStr : new Date(dateStr);
    if (isNaN(d.getTime())) return "TBD";

    const hours = d.getHours();
    const minutes = d.getMinutes();
    const period = hours >= 12 ? "PM" : "AM";
    const h12 = hours % 12 === 0 ? 12 : hours % 12;
    const minStr = String(minutes).padStart(2, "0");

    return `${h12}:${minStr} ${period}`;
  } catch {
    return "TBD";
  }
}

/**
 * Converts 12-hour components (hour 1-12, minute 0-59, period "AM"|"PM") to canonical 24-hour "HH:mm" string.
 *
 * Examples:
 *   parseTime12To24(12, 0, "AM") -> "00:00"
 *   parseTime12To24(12, 15, "AM") -> "00:15"
 *   parseTime12To24(12, 30, "AM") -> "00:30"
 *   parseTime12To24(1, 0, "AM") -> "01:00"
 *   parseTime12To24(5, 0, "AM") -> "05:00"
 *   parseTime12To24(11, 45, "AM") -> "11:45"
 *   parseTime12To24(12, 0, "PM") -> "12:00"
 *   parseTime12To24(12, 30, "PM") -> "12:30"
 *   parseTime12To24(1, 0, "PM") -> "13:00"
 *   parseTime12To24(2, 30, "PM") -> "14:30"
 *   parseTime12To24(11, 45, "PM") -> "23:45"
 */
export function parseTime12To24(
  hour12: number | string,
  minute: number | string,
  period: "AM" | "PM" | string,
): string {
  let h = parseInt(String(hour12), 10);
  if (isNaN(h) || h < 1 || h > 12) h = 12;
  let m = parseInt(String(minute), 10);
  if (isNaN(m) || m < 0 || m > 59) m = 0;
  const p = String(period).toUpperCase() === "PM" ? "PM" : "AM";

  let h24: number;
  if (p === "AM") {
    h24 = h === 12 ? 0 : h;
  } else {
    h24 = h === 12 ? 12 : h + 12;
  }

  return `${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Parses a 24-hour "HH:mm" string or Date and returns structured 12-hour components and formatted string.
 */
export function parse24ToTime12(time24: string | Date): {
  hour: number;
  minute: number;
  period: "AM" | "PM";
  formatted: string;
} {
  if (time24 instanceof Date) {
    const hours = time24.getHours();
    const minutes = time24.getMinutes();
    const period: "AM" | "PM" = hours >= 12 ? "PM" : "AM";
    const hour = hours % 12 === 0 ? 12 : hours % 12;
    const formatted = `${hour}:${String(minutes).padStart(2, "0")} ${period}`;
    return { hour, minute: minutes, period, formatted };
  }

  const match = (time24 || "").trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) {
    return { hour: 12, minute: 0, period: "PM", formatted: "12:00 PM" };
  }
  const h24 = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const period: "AM" | "PM" = h24 >= 12 ? "PM" : "AM";
  const hour = h24 % 12 === 0 ? 12 : h24 % 12;
  const formatted = `${hour}:${String(m).padStart(2, "0")} ${period}`;
  return { hour, minute: m, period, formatted };
}

/**
 * Calculates fixture start time across match intervals with proper midnight rollover.
 */
export function calculateScheduleMatchTime(
  startDateStr: string,
  startTime24: string,
  matchIndex: number,
  intervalMinutes: number,
): { isoString: string; time24: string; time12: string } {
  const [y, m, d] = (startDateStr || "2026-08-30").split("-").map(Number);
  const { hour, minute, period } = parse24ToTime12(startTime24);
  const h24 = period === "AM" ? (hour === 12 ? 0 : hour) : (hour === 12 ? 12 : hour + 12);

  const baseDate = new Date(y || 2026, (m || 8) - 1, d || 30, h24, minute, 0, 0);
  const matchDate = new Date(baseDate.getTime() + matchIndex * intervalMinutes * 60000);

  const hours = matchDate.getHours();
  const minutes = matchDate.getMinutes();
  const time24 = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  const time12 = formatMatchTime(matchDate);

  return {
    isoString: matchDate.toISOString(),
    time24,
    time12,
  };
}

/**
 * Formats a date into `D MMM YYYY` (e.g., "15 Aug 2026").
 * Optionally supports relative format ("Today", "Tomorrow").
 */
export function formatMatchDate(
  dateStr?: string | number | Date | null,
  options?: { relative?: boolean },
): string {
  if (!dateStr && dateStr !== 0) return "Today";

  try {
    const d = dateStr instanceof Date ? dateStr : new Date(dateStr);
    if (isNaN(d.getTime())) return "Today";

    if (options?.relative) {
      const today = new Date();
      const isSameDay =
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear();
      if (isSameDay) return "Today";

      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const isTomorrow =
        d.getDate() === tomorrow.getDate() &&
        d.getMonth() === tomorrow.getMonth() &&
        d.getFullYear() === tomorrow.getFullYear();
      if (isTomorrow) return "Tomorrow";
    }

    const day = d.getDate();
    const month = MONTH_NAMES[d.getMonth()];
    const year = d.getFullYear();

    return `${day} ${month} ${year}`;
  } catch {
    return "Today";
  }
}

/**
 * Formats full match date and time as:
 * `D MMM YYYY, h:mm AM/PM` (e.g., "15 Aug 2026, 1:30 PM")
 */
export function formatMatchDateTime(dateStr?: string | number | Date | null): string {
  if (!dateStr && dateStr !== 0) return "TBD";

  try {
    // If it's already a time-only string, just return formatted time
    if (typeof dateStr === "string" && /^\d{1,2}:\d{2}(?::\d{2})?$/.test(dateStr.trim())) {
      return formatMatchTime(dateStr);
    }

    const d = dateStr instanceof Date ? dateStr : new Date(dateStr);
    if (isNaN(d.getTime())) return "TBD";

    const day = d.getDate();
    const month = MONTH_NAMES[d.getMonth()];
    const year = d.getFullYear();
    const time = formatMatchTime(d);

    return `${day} ${month} ${year}, ${time}`;
  } catch {
    return "TBD";
  }
}

/**
 * Formats delivery/ball event timestamps into 12-hour format with seconds:
 * `h:mm:ss AM/PM`
 */
export function formatDeliveryTimestamp(timestamp?: number | null): string {
  if (!timestamp) return "";
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return "";

    const hours = d.getHours();
    const minutes = d.getMinutes();
    const seconds = d.getSeconds();
    const period = hours >= 12 ? "PM" : "AM";
    const h12 = hours % 12 === 0 ? 12 : hours % 12;

    const minStr = String(minutes).padStart(2, "0");
    const secStr = String(seconds).padStart(2, "0");

    return `${h12}:${minStr}:${secStr} ${period}`;
  } catch {
    return "";
  }
}

/**
 * Resizes an uploaded image File on the client canvas and exports as a WebP / JPEG data URL
 */
export function resizeImageToDataUrl(file: File, maxSize = 400): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/webp", 0.85));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
