import type { BetterAuthOptions } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { admin } from "better-auth/plugins";

import { authAccessControl, authAccessRoles } from "./permissions.ts";
import { authRoles } from "./roles.ts";
import { authUserAdditionalFields } from "./schema-fields.ts";
import {
  applyPublicCredentialSignupUserDefaults,
  applyTrustedOrPublicUserAccessDefaults,
  preparePublicCredentialSignupBody,
} from "./signup-policy.ts";

export const localAuthOrigin = "http://localhost:3000";
export const productionAuthOrigin = "https://kuraishi-car-dealer.vercel.app";
export const authTrustedOrigins = [localAuthOrigin, productionAuthOrigin];

type GoogleProfile = {
  family_name?: string;
  given_name?: string;
};

type AuthEmailDelivery = {
  sendPasswordResetEmail: (input: {
    recipientName?: string | null;
    to: string;
    url: string;
  }) => Promise<void>;
  sendVerificationEmail: (input: {
    recipientName?: string | null;
    to: string;
    url: string;
  }) => Promise<void>;
};

type CreateKuraishiAuthOptionsInput = {
  baseURL: string;
  database?: BetterAuthOptions["database"];
  emailDelivery: AuthEmailDelivery;
  googleClientId: string;
  googleClientSecret: string;
  secret: string;
  useSecureCookies: boolean;
  backgroundTaskHandler?: (promise: Promise<unknown>) => void;
};

export function createKuraishiAuthOptions({
  backgroundTaskHandler,
  baseURL,
  database,
  emailDelivery,
  googleClientId,
  googleClientSecret,
  secret,
  useSecureCookies,
}: CreateKuraishiAuthOptionsInput) {
  return {
    account: {
      accountLinking: {
        allowDifferentEmails: false,
        allowUnlinkingAll: false,
        enabled: true,
        updateUserInfoOnLink: false,
      },
      encryptOAuthTokens: true,
    },
    advanced: {
      backgroundTasks: backgroundTaskHandler
        ? { handler: backgroundTaskHandler }
        : undefined,
      cookiePrefix: "kuraishi-auth",
      database: {
        joins: true,
      },
      useSecureCookies,
    },
    appName: "Kuraishi Autohandel",
    basePath: "/api/auth",
    baseURL,
    database,
    databaseHooks: {
      user: {
        create: {
          before: async (user, context) => {
            if (context?.path !== "/sign-up/email") {
              return {
                data: applyTrustedOrPublicUserAccessDefaults(user),
              };
            }

            return {
              data: applyPublicCredentialSignupUserDefaults(user),
            };
          },
        },
      },
    },
    emailAndPassword: {
      autoSignIn: false,
      enabled: true,
      requireEmailVerification: true,
      resetPasswordTokenExpiresIn: 60 * 60,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ url, user }) => {
        await emailDelivery.sendPasswordResetEmail({
          recipientName: user.name,
          to: user.email,
          url,
        });
      },
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
    emailVerification: {
      expiresIn: 60 * 60,
      sendOnSignIn: true,
      sendOnSignUp: true,
      sendVerificationEmail: async ({ url, user }) => {
        await emailDelivery.sendVerificationEmail({
          recipientName: user.name,
          to: user.email,
          url,
        });
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/sign-up/email") {
          return;
        }

        const result = preparePublicCredentialSignupBody(ctx.body);

        if (!result.ok) {
          throw new APIError("BAD_REQUEST", {
            message: result.error,
          });
        }

        return {
          context: {
            ...ctx,
            body: result.body,
          },
        };
      }),
    },
    plugins: [
      admin({
        ac: authAccessControl,
        adminRoles: [authRoles.admin],
        defaultRole: authRoles.customer,
        roles: authAccessRoles,
      }),
    ],
    secret,
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      freshAge: 60 * 60 * 24,
      updateAge: 60 * 60 * 24,
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
    trustedOrigins: authTrustedOrigins,
    user: {
      additionalFields: authUserAdditionalFields,
    },
    verification: {
      storeIdentifier: "hashed",
    },
  } satisfies BetterAuthOptions;
}
