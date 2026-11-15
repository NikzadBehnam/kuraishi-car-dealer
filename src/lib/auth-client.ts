import { adminClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// Same-origin client: requests go to /api/auth. Keep secrets and database code out of this module.
// adminClient is only used for session typing (user.role); authorization stays on the server.
export const authClient = createAuthClient({
  plugins: [adminClient()],
});
