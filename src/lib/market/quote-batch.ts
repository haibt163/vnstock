/**
 * VPS quote batching. The board URL is one path of comma-separated symbols.
 * 400 names returned in ~1.2s (HTTP 200, every symbol present) on 2026-09-29.
 * A single 1,522-name URL also returned once (2.4s) but a later call stalled,
 * so batches stay at 400 and a timeout stops the rest of the cycle.
 */
export const VPS_QUOTE_BATCH_SIZE = 400;

export interface BatchFetchResult<T> {
  quotes: T[];
  okBatches: number;
  failedBatches: number;
  stoppedEarly: boolean;
}

export function chunkSymbols(symbols: string[], size: number): string[][] {
  if (size < 1) throw new Error("batch_size");
  const out: string[][] = [];
  for (let i = 0; i < symbols.length; i += size) out.push(symbols.slice(i, i + size));
  return out;
}

export function isTimeoutError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return err.name === "Timeout" || err.name === "AbortError" || err.message === "timeout";
}

export async function collectQuoteBatches<T>(
  symbols: string[],
  size: number,
  fetchBatch: (batch: string[]) => Promise<T[]>,
): Promise<BatchFetchResult<T>> {
  const quotes: T[] = [];
  let okBatches = 0;
  let failedBatches = 0;
  let stoppedEarly = false;
  const chunks = chunkSymbols(symbols, size);
  for (let i = 0; i < chunks.length; i += 1) {
    const batch = chunks[i];
    try {
      const rows = await fetchBatch(batch);
      quotes.push(...rows);
      okBatches += 1;
    } catch (err) {
      failedBatches += 1;
      console.warn(
        "[vnstock] VPS quote batch failed",
        `${i + 1}/${chunks.length}`,
        batch.length,
        err instanceof Error ? err.message : "error",
      );
      if (isTimeoutError(err)) {
        stoppedEarly = i < chunks.length - 1;
        break;
      }
    }
  }
  return { quotes, okBatches, failedBatches, stoppedEarly };
}
