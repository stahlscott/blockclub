/**
 * Parses user input from the get-started page into a neighborhood slug.
 * Accepts either a full invite URL (any domain) or a bare slug.
 */
export function parseInviteInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // If input contains /join/, extract the slug from the path
  const joinIndex = trimmed.indexOf("/join/");
  if (joinIndex !== -1) {
    const afterJoin = trimmed.slice(joinIndex + "/join/".length).replace(/\/+$/, "");
    return afterJoin || null;
  }

  // Otherwise treat the whole input as a bare slug
  return trimmed;
}
