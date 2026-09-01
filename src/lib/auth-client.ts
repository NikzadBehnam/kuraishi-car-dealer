"use client";

import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

import { authAccessControl, authAccessRoles } from "@/lib/auth/permissions";

export const authClient = createAuthClient({
  plugins: [
    adminClient({
      ac: authAccessControl,
      roles: authAccessRoles,
    }),
  ],
});
