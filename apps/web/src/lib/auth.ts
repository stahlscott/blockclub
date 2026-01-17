// Staff admin configuration
// Staff admins have system-wide privileges including:
// - Creating new neighborhoods
// - Automatic admin access to all neighborhoods
// - Ability to promote members to admin in any neighborhood
// - Ability to demote admins to member in any neighborhood
// - Impersonating users to see the app from their perspective

import { env } from "./env";

/**
 * Check if a user is a staff admin based on their email.
 * Staff admins are identified by email in the STAFF_ADMIN_EMAILS env var.
 */
export function isStaffAdmin(email: string | null | undefined): boolean {
  return env.STAFF_ADMIN_EMAILS.includes(email || "");
}

/**
 * Check if a user can have memberships in neighborhoods.
 * Staff admins should NOT have memberships - they access via impersonation.
 */
export function canHaveMemberships(email: string | null | undefined): boolean {
  return !isStaffAdmin(email);
}
