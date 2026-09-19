import { isStaffRole } from "@/lib/auth/roles";

export function resolveAdminAccess(input: {
  user: { id: string } | null;
  profile: { role: string } | null;
}): "unauthenticated" | "unauthorized" | "ok" {
  if (!input.user) {
    return "unauthenticated";
  }
  if (!input.profile || !isStaffRole(input.profile.role)) {
    return "unauthorized";
  }
  return "ok";
}
