/**
 * Performance timing utility for debugging slow operations.
 *
 * Usage:
 *   import { withTiming } from "@/lib/timing";
 *   const result = await withTiming("operation-name", () => slowOperation());
 *
 * Enable logging by setting DEBUG_TIMING=true in environment.
 */

const timings: Map<string, number> = new Map();
let requestId = 0;

const isEnabled = () => process.env.DEBUG_TIMING === "true";

export function startTiming(label: string): string {
  const id = `${++requestId}-${label}`;
  timings.set(id, performance.now());
  if (isEnabled()) {
    console.log(`[TIMING] START: ${label}`);
  }
  return id;
}

export function endTiming(id: string): number {
  const start = timings.get(id);
  if (!start) return 0;
  const duration = performance.now() - start;
  timings.delete(id);
  const label = id.split("-").slice(1).join("-");
  if (isEnabled()) {
    console.log(`[TIMING] END: ${label} - ${duration.toFixed(0)}ms`);
  }
  return duration;
}

export async function withTiming<T>(
  label: string,
  fn: () => PromiseLike<T> | T
): Promise<T> {
  if (!isEnabled()) {
    return fn();
  }
  const id = startTiming(label);
  try {
    return await fn();
  } finally {
    endTiming(id);
  }
}
