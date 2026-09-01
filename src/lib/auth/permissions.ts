import { createAccessControl } from "better-auth/plugins/access";
import {
  adminAc,
  defaultStatements,
  userAc,
} from "better-auth/plugins/admin/access";

import { authRoles } from "./roles.ts";

export const authAccessControl = createAccessControl(defaultStatements);

export const authAccessRoles = {
  [authRoles.admin]: authAccessControl.newRole(adminAc.statements),
  [authRoles.staff]: authAccessControl.newRole(userAc.statements),
  [authRoles.customer]: authAccessControl.newRole(userAc.statements),
} as const;
