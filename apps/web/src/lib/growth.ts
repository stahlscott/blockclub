// Thresholds for "growth mode" UI — tune these based on real usage data.
// When a neighborhood is below these counts, the app surfaces invite nudges
// to encourage community growth. Once thresholds are met, nudges disappear.
export const GROWTH_THRESHOLDS = {
  ACTIVE_MEMBERS: 10,
  LIBRARY_ITEMS: 5,
  POSTS: 5,
  DIRECTORY_MEMBERS: 10,
} as const;

export function isInGrowthMode(activeMemberCount: number): boolean {
  return activeMemberCount < GROWTH_THRESHOLDS.ACTIVE_MEMBERS;
}

const SECTION_THRESHOLDS: Record<"library" | "posts" | "directory", number> = {
  library: GROWTH_THRESHOLDS.LIBRARY_ITEMS,
  posts: GROWTH_THRESHOLDS.POSTS,
  directory: GROWTH_THRESHOLDS.DIRECTORY_MEMBERS,
};

export function shouldShowContentNudge(
  count: number,
  section: "library" | "posts" | "directory"
): boolean {
  return count < SECTION_THRESHOLDS[section];
}
