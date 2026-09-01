export const authRoles = {
  admin: "ADMIN",
  staff: "STAFF",
  customer: "CUSTOMER",
} as const;

export type AuthRole = (typeof authRoles)[keyof typeof authRoles];

export const authRoleValues = [
  authRoles.admin,
  authRoles.staff,
  authRoles.customer,
] as const;
