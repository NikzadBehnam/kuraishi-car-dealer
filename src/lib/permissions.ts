import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/admin/access";

const ac = createAccessControl(defaultStatements);

// The master admin may only manage accounts. Without "set-role", account
// creation can never assign a role, so every new account gets the default "user".
export const adminRole = ac.newRole({
  user: ["create", "list", "get", "set-password"],
  session: [],
});

export const userRole = ac.newRole({
  user: [],
  session: [],
});

export { ac };
