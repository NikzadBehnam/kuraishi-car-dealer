export type AuthSession = {
  user: {
    role?: string | null;
  };
};

export class AuthorizationError extends Error {
  readonly status: 401 | 403;

  constructor(status: 401 | 403, message: string) {
    super(message);
    this.name = "AuthorizationError";
    this.status = status;
  }
}

export function hasAuthenticatedSession(
  session: AuthSession | null,
): session is AuthSession {
  return session !== null;
}

export function isMasterAdmin(role: string | null | undefined) {
  return role === "admin";
}

export function getAccountCreationPageRedirect(
  session: AuthSession | null,
): "login" | "dashboard" | null {
  if (!hasAuthenticatedSession(session)) {
    return "login";
  }

  return isMasterAdmin(session.user.role) ? null : "dashboard";
}

export function assertAuthenticatedSession<T extends AuthSession>(
  session: T | null,
): T {
  if (!hasAuthenticatedSession(session)) {
    throw new AuthorizationError(401, "Sign in required.");
  }

  return session;
}

export function assertAdminSession<T extends AuthSession>(
  session: T | null,
): T {
  const authenticatedSession = assertAuthenticatedSession(session);

  if (!isMasterAdmin(authenticatedSession.user.role)) {
    throw new AuthorizationError(403, "Administrator access required.");
  }

  return authenticatedSession;
}
