/**
 * Pure role helpers — safe to import from both server and client code.
 * (auth-utils.ts imports next-auth/react and is for client hooks only.)
 */

export function isAdminRole(role?: string | null): boolean {
  return role === "ADMIN";
}

export function isOfficerOrAboveRole(role?: string | null): boolean {
  return role === "ADMIN" || role === "OFFICER";
}

export function isMemberOrAboveRole(role?: string | null): boolean {
  return role === "ADMIN" || role === "OFFICER" || role === "MEMBER";
}
