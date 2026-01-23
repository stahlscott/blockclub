/**
 * Date utility functions for consistent date handling across the app.
 *
 * Core utilities are from @blockclub/shared for mobile compatibility.
 * Web-specific seasonal functions remain here.
 */

// Re-export shared utilities
export {
  parseDateLocal,
  formatDateLocal,
  formatDate,
  displayDateLocal,
  formatRelativeTime,
  getTodayLocal,
  getDaysFromNow,
  isOverdue,
  daysBetween,
} from "@blockclub/shared";

// Web-specific seasonal utilities (not needed on mobile)

export type Season = "winter" | "spring" | "summer" | "fall";

export function getCurrentSeason(): Season {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "fall";
  return "winter";
}

export function getSeasonalClosing(): string {
  const season = getCurrentSeason();
  switch (season) {
    case "winter":
      return "Stay warm out there!";
    case "spring":
      return "Enjoy the fresh air!";
    case "summer":
      return "Enjoy the sunshine!";
    case "fall":
      return "Enjoy the crisp weather!";
  }
}
