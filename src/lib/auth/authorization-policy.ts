import type { ActionErrorCode } from "../../features/shared/action-result.ts";

import { authRoles, type AuthRole } from "./roles.ts";

export const authCapabilities = {
  manageOwnComparisons: "comparisons:manage-own",
  manageOwnFavourites: "favourites:manage-own",
  enterAdmin: "admin:enter",
  manageAppointments: "appointments:manage",
  manageAudit: "audit:manage",
  manageLeads: "leads:manage",
  manageSettings: "settings:manage",
  manageUsers: "users:manage",
  manageVehicleMedia: "vehicle-media:manage",
  manageVehicles: "vehicles:manage",
} as const;

export type AuthCapability =
  (typeof authCapabilities)[keyof typeof authCapabilities];

export const authCapabilityValues = Object.freeze(
  Object.values(authCapabilities),
) as readonly AuthCapability[];

const accountCapabilities = Object.freeze([
  authCapabilities.manageOwnComparisons,
  authCapabilities.manageOwnFavourites,
] as const);

export const roleCapabilities = Object.freeze({
  [authRoles.admin]: authCapabilityValues,
  [authRoles.staff]: accountCapabilities,
  [authRoles.customer]: accountCapabilities,
}) satisfies Record<AuthRole, readonly AuthCapability[]>;

export type AuthorizationSessionLike = {
  user: {
    banned?: boolean | null;
    role?: string | null;
  };
};

export type AuthorizationState<TSession extends AuthorizationSessionLike> =
  | { status: "anonymous" }
  | { session: TSession; status: "banned" }
  | { session: TSession; status: "forbidden" }
  | { session: TSession; status: "authorized" };

export type AuthorizationDeniedReason = "BANNED" | "MISSING_CAPABILITY";

export class AuthenticationRequiredError extends Error {
  readonly code: ActionErrorCode = "AUTHENTICATION_REQUIRED";
  readonly status = 401;

  constructor() {
    super("Authentication is required.");
    this.name = "AuthenticationRequiredError";
  }
}

export class AuthorizationDeniedError extends Error {
  readonly code: ActionErrorCode = "FORBIDDEN";
  readonly status = 403;

  constructor(readonly reason: AuthorizationDeniedReason) {
    super(
      reason === "BANNED"
        ? "This account cannot perform protected operations."
        : "You do not have permission to perform this operation.",
    );
    this.name = "AuthorizationDeniedError";
  }
}

export function getAuthorizationState<
  TSession extends AuthorizationSessionLike,
>(
  session: TSession | null,
  capability?: AuthCapability,
): AuthorizationState<TSession> {
  if (!session) {
    return { status: "anonymous" };
  }

  if (session.user.banned === true) {
    return { session, status: "banned" };
  }

  if (capability && !hasCapability(session, capability)) {
    return { session, status: "forbidden" };
  }

  return { session, status: "authorized" };
}

export function assertAuthenticatedSession<
  TSession extends AuthorizationSessionLike,
>(session: TSession | null) {
  const state = getAuthorizationState(session);

  if (state.status === "anonymous") {
    throw new AuthenticationRequiredError();
  }

  if (state.status === "banned") {
    throw new AuthorizationDeniedError("BANNED");
  }

  return state.session;
}

export function assertCapability<TSession extends AuthorizationSessionLike>(
  session: TSession | null,
  capability: AuthCapability,
) {
  const state = getAuthorizationState(session, capability);

  if (state.status === "anonymous") {
    throw new AuthenticationRequiredError();
  }

  if (state.status === "banned") {
    throw new AuthorizationDeniedError("BANNED");
  }

  if (state.status === "forbidden") {
    throw new AuthorizationDeniedError("MISSING_CAPABILITY");
  }

  return state.session;
}

export function hasCapability(
  session: AuthorizationSessionLike | null,
  capability: AuthCapability,
) {
  if (!session || session.user.banned === true) {
    return false;
  }

  return getAuthRoles(session.user.role).some((role) =>
    (roleCapabilities[role] as readonly AuthCapability[]).includes(capability),
  );
}

export function getAuthRoles(role: string | null | undefined): AuthRole[] {
  return Array.from(
    new Set(
      role
        ?.split(",")
        .map((value) => value.trim())
        .filter(isAuthRole) ?? [],
    ),
  );
}

function isAuthRole(value: string): value is AuthRole {
  return (
    value === authRoles.admin ||
    value === authRoles.staff ||
    value === authRoles.customer
  );
}
