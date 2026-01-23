/**
 * Input validation constants and helpers.
 * Shared between web and mobile for consistent validation.
 */

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

  // Post fields
  postContent: 2000,

  // General
  address: 200,
  phone: 20,
  unit: 20,
  children: 500,
  pets: 500,
} as const;

/**
 * Validate a string field against max length.
 * @returns Error message if invalid, null if valid
 */
export function validateLength(
  value: string,
  fieldName: string,
  maxLength: number
): string | null {
  if (value.length > maxLength) {
    return `${fieldName} must be ${maxLength} characters or less (currently ${value.length})`;
  }
  return null;
}

/**
 * Validate that a required field is not empty.
 * @returns Error message if empty, null if valid
 */
export function validateRequired(
  value: string | null | undefined,
  fieldName: string
): string | null {
  if (!value || value.trim().length === 0) {
    return `${fieldName} is required`;
  }
  return null;
}

/**
 * Phone number regex - expects 10 digits.
 */
export const PHONE_REGEX = /^\d{10}$/;

/**
 * Basic email regex for client-side validation.
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate a phone number (10 digits).
 */
export function validatePhone(phone: string): boolean {
  return PHONE_REGEX.test(phone);
}

/**
 * Validate an email address.
 */
export function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

/**
 * Format a 10-digit phone for display.
 * "2165551234" -> "(216) 555-1234"
 */
export function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length !== 10) return phone;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/**
 * Normalize a phone number to just digits.
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}
