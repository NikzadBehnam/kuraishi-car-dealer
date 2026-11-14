import { createAuthClient } from "better-auth/react";

// Same-origin client: requests go to /api/auth. Keep secrets and database code out of this module.
export const authClient = createAuthClient();
