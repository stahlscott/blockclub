// Input validation constants and helpers

export const MAX_LENGTHS = {
  // User fields
  userName: 100,
  userBio: 500,

  // Neighborhood fields
  neighborhoodName: 100,
  neighborhoodDescription: 500,
  neighborhoodLocation: 200,

  // Item fields
  itemName: 100,
  itemDescription: 1000,

  // Bulletin fields
  bulletinContent: 2000,

  // General
  address: 200,
  phone: 20,
  unit: 20,
  children: 500,
  pets: 500,
} as const;

/**
 * Validate a string field against max length
 * @returns Error message if invalid, null if valid
 */
export function validateLength(
  value: string,
  fieldName: string,
  maxLength: number,
): string | null {
  if (value.length > maxLength) {
    return `${fieldName} must be ${maxLength} characters or less (currently ${value.length})`;
  }
  return null;
}

/**
 * Truncate a string to max length (for display purposes)
 */
export function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return value.slice(0, maxLength - 3) + "...";
}
