import { formatIct, ictParts, nowIctIso } from "./format.ts";
import type { SessionPhase } from "./types.ts";

export function sessionPhaseAt(date = new Date()): SessionPhase {
  const p = ictParts(date);
  const wd = p.weekday;
  if (wd === "Sat" || wd === "Sun") return "weekend";
  const mins = p.hour * 60 + p.minute;
  if (mins >= 8 * 60 + 45 && mins < 9 * 60) return "ato";
  if (mins >= 9 * 60 && mins < 11 * 60 + 30) return "continuous_am";
  if (mins >= 11 * 60 + 30 && mins < 13 * 60) return "lunch";
  if (mins >= 13 * 60 && mins < 14 * 60 + 30) return "continuous_pm";
  if (mins >= 14 * 60 + 30 && mins < 14 * 60 + 45) return "atc";
  if (mins >= 14 * 60 + 45 && mins < 15 * 60) return "put_through";
  if (mins >= 8 * 60 && mins < 8 * 60 + 45) return "preopen";
  return "closed";
}

export function isMarketOpen(phase: SessionPhase = sessionPhaseAt()): boolean {
  return (
    phase === "ato" ||
    phase === "continuous_am" ||
    phase === "continuous_pm" ||
    phase === "atc" ||
    phase === "put_through"
  );
}

export function sessionLabel(phase: SessionPhase): string {
  switch (phase) {
    case "preopen":
      return "Pre-open";
    case "ato":
      return "ATO";
    case "continuous_am":
      return "Continuous · morning";
    case "lunch":
      return "Lunch break";
    case "continuous_pm":
      return "Continuous · afternoon";
    case "atc":
      return "ATC";
    case "put_through":
      return "Put-through";
    case "weekend":
      return "Weekend";
    default:
      return "Market closed";
  }
}

export function makeAsOf(date = new Date()) {
  const iso = nowIctIso(date);
  return { asOfIso: iso, asOfIct: formatIct(iso) };
}
