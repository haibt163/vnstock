import { useEffect, useRef, useState } from "react";

export function shouldAcceptRefresh<T extends { degraded?: boolean }>(current: T, next: T): boolean {
  if (next.degraded && current && !current.degraded) return false;
  return true;
}

/** Keep SSR payload for the first paint; poll without replacing live with demo. */
export function useKeepLive<T extends { degraded?: boolean }>(
  initial: T,
  refetch: () => Promise<T>,
  intervalMs = 20_000,
): T {
  const [data, setData] = useState(initial);
  const latest = useRef(data);
  latest.current = data;
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  useEffect(() => {
    setData(initial);
  }, [initial]);

  useEffect(() => {
    let cancelled = false;
    const id = window.setInterval(() => {
      void refetchRef
        .current()
        .then((next) => {
          if (cancelled) return;
          if (!shouldAcceptRefresh(latest.current, next)) return;
          setData(next);
        })
        .catch(() => {
          /* keep last good snapshot */
        });
    }, intervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [intervalMs]);

  return data;
}
