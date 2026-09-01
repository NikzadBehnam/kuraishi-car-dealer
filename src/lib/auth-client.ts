"use client";

import { createAuthClient } from "better-auth/react";
import { adminClient, inferAdditionalFields } from "better-auth/client/plugins";

import { authAccessControl, authAccessRoles } from "@/lib/auth/permissions";
import { authUserAdditionalFields } from "@/lib/auth/schema-fields";

export const authClient = createAuthClient({
  plugins: [
    inferAdditionalFields({
      user: authUserAdditionalFields,
    }),
    adminClient({
      ac: authAccessControl,
      roles: authAccessRoles,
    }),
  ],
});
