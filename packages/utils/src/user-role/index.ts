export const STAFF_USER_ROLES = ["ADMIN", "TENANT_STAFF"] as const;

export type StaffUserRole = (typeof STAFF_USER_ROLES)[number];

export const isStaffUserRole = (role: string | null | undefined): role is StaffUserRole =>
  role !== null && role !== undefined && (STAFF_USER_ROLES as readonly string[]).includes(role);
