import { STAFF_ROLES, type StaffRole } from "@/types/commerce";

export { STAFF_ROLES, type StaffRole };

export function isStaffRole(value: string | null | undefined): value is StaffRole {
  return STAFF_ROLES.includes(value as StaffRole);
}

export function canManageStaff(role: StaffRole): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

export function canManageCommerce(role: StaffRole): boolean {
  return role === "SUPER_ADMIN" || role === "ADMIN" || role === "OPERATIONS";
}

export function canHandleSupport(role: StaffRole): boolean {
  return (
    role === "SUPER_ADMIN" || role === "ADMIN" || role === "SUPPORT"
  );
}

export function canViewPii(role: StaffRole): boolean {
  return (
    role === "SUPER_ADMIN" ||
    role === "ADMIN" ||
    role === "OPERATIONS" ||
    role === "SUPPORT"
  );
}
