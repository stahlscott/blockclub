// Super admin configuration
// Super admins have system-wide privileges including:
// - Creating new neighborhoods
// - Automatic admin access to all neighborhoods
// - Ability to promote members to admin in any neighborhood
// - Ability to demote admins to member in any neighborhood

export const SUPER_ADMIN_EMAILS = ["stahl@hey.com"];

export function isSuperAdmin(email: string | null | undefined): boolean {
  return SUPER_ADMIN_EMAILS.includes(email || "");
}
