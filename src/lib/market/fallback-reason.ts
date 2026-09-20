/** Map a cascade log string to a stable UI tag. */
export function fallbackReasonTag(raw?: string | null): string {
  if (!raw) return "unknown";
  if (raw.startsWith("http_")) return "http";
  if (raw.startsWith("vps_no_usable_last") || raw.startsWith("vps_history_thin")) return "no_usable_quote";
  const tag = raw.split(/[\s(]/)[0];
  if (tag === "timeout" || tag === "rate_limited" || tag === "invalid_schema") return tag;
  return "unknown";
}
