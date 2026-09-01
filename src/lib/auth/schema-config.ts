import { betterAuth } from "better-auth";

import { createKuraishiAuthOptions, localAuthOrigin } from "./options.ts";

const googleClientId =
  process.env.GOOGLE_CLIENT_ID ?? "schema-generation-google-client-id";
const googleClientSecret =
  process.env.GOOGLE_CLIENT_SECRET ?? "schema-generation-google-client-secret";

export const auth = betterAuth(
  createKuraishiAuthOptions({
    baseURL: localAuthOrigin,
    emailDelivery: {
      sendPasswordResetEmail: async () => {},
      sendVerificationEmail: async () => {},
    },
    googleClientId,
    googleClientSecret,
    secret: "schema-generation-better-auth-secret",
    useSecureCookies: false,
  }),
);
