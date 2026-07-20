export interface AffectedMutation<T> {
  data: T;
  affected: true;
}

export function hasAffectedRow<T>(data: T | T[] | null | undefined): boolean {
  return data !== null && data !== undefined && (!Array.isArray(data) || data.length > 0);
}

export function requireAffectedRow<T>(
  data: T | T[] | null | undefined,
  operation: string,
): AffectedMutation<T> {
  if (!hasAffectedRow(data)) {
    throw new Error(`${operation} did not affect a row`);
  }
  const affectedData = Array.isArray(data) ? data[0] : data;
  if (affectedData === null || affectedData === undefined) {
    throw new Error(`${operation} did not affect a row`);
  }
  return { data: affectedData, affected: true };
}
