import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";

import { authAccessControl, authAccessRoles } from "./permissions";
import { authRoles } from "./roles";
import { authUserAdditionalFields } from "./schema-fields";

type GoogleProfile = {
  family_name?: string;
  given_name?: string;
};

const googleClientId =
  process.env.GOOGLE_CLIENT_ID ?? "schema-generation-google-client-id";
const googleClientSecret =
  process.env.GOOGLE_CLIENT_SECRET ?? "schema-generation-google-client-secret";

export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    customSyntheticUser: ({ additionalFields, coreFields, id }) => ({
      ...coreFields,
      role: authRoles.customer,
      banned: false,
      banReason: null,
      banExpires: null,
      ...additionalFields,
      id,
    }),
  },
  socialProviders: {
    google: {
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      mapProfileToUser: (profile) => {
        const googleProfile = profile as GoogleProfile;

        return {
          firstName: googleProfile.given_name,
          lastName: googleProfile.family_name,
        };
      },
    },
  },
  user: {
    additionalFields: authUserAdditionalFields,
  },
  plugins: [
    admin({
      ac: authAccessControl,
      adminRoles: [authRoles.admin],
      defaultRole: authRoles.customer,
      roles: authAccessRoles,
    }),
  ],
});
