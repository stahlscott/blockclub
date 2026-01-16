// Staff admin configuration
// Staff admins have system-wide privileges including:
// - Creating new neighborhoods
// - Automatic admin access to all neighborhoods
// - Ability to promote members to admin in any neighborhood
// - Ability to demote admins to member in any neighborhood

import { env } from "./env";

export function isStaffAdmin(email: string | null | undefined): boolean {
  return env.STAFF_ADMIN_EMAILS.includes(email || "");
}
