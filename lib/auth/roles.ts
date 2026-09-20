import { STAFF_ROLES, type StaffRole } from "@/types/commerce";

export { STAFF_ROLES, type StaffRole };

export function isStaffRole(value: string | null | undefined): value is StaffRole {
  return STAFF_ROLES.includes(value as StaffRole);
}

export function canManageStaff(role: string): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

export function canManageCommerce(role: string): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN" || role === "OPERATIONS";
}

export function canHandleSupport(role: string): boolean {
  return (
    role === "SUPER_ADMIN" || role === "ADMIN" || role === "SUPPORT"
  );
}

export function canManageCategories(role: string): boolean {
  return isStaffRole(role);
}

export function canMessageUsers(role: string): boolean {
  return isStaffRole(role);
}

export function canVerifyUsers(role: string): boolean {
  return isStaffRole(role);
}

export function canModerateAccounts(role: string): boolean {
  return isStaffRole(role);
}

export function canViewPii(role: string): boolean {
  return (
    role === "SUPER_ADMIN" ||
    role === "ADMIN" ||
    role === "OPERATIONS" ||
    role === "SUPPORT"
  );
}
