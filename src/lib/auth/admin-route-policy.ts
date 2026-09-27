import { authRoles } from "./roles.ts";

export const adminBasePath = "/admin";
export const adminRequestPathHeader = "x-kuraishi-admin-request-path";
export const adminLoginPath = "/login";

export type AdminSessionLike = {
  user: {
    banned?: boolean | null;
    role?: string | null;
  };
};

export type AdminAuthorizationState<TSession extends AdminSessionLike> =
  | {
      loginPath: string;
      status: "anonymous";
    }
  | {
      session: TSession;
      status: "forbidden";
    }
  | {
      session: TSession;
      status: "authorized";
    };

export class AdminAuthenticationRequiredError extends Error {
  readonly loginPath: string;

  constructor(loginPath: string) {
    super("Authentication is required to access admin resources.");
    this.name = "AdminAuthenticationRequiredError";
    this.loginPath = loginPath;
  }
}

export class AdminAccessDeniedError extends Error {
  constructor() {
    super("Administrator access is required.");
    this.name = "AdminAccessDeniedError";
  }
}

export function getAdminAuthorizationState<TSession extends AdminSessionLike>(
  session: TSession | null,
  requestPath: string | string[] | undefined = adminBasePath,
): AdminAuthorizationState<TSession> {
  if (!session) {
    return {
      loginPath: getAdminLoginRedirectPath(requestPath),
      status: "anonymous",
    };
  }

  if (session.user.banned === true || !isAdminRole(session.user.role)) {
    return {
      session,
      status: "forbidden",
    };
  }

  return {
    session,
    status: "authorized",
  };
}

export function assertAdminAuthorizedForServerEntry<
  TSession extends AdminSessionLike,
>(session: TSession | null, requestPath?: string | string[]) {
  const state = getAdminAuthorizationState(session, requestPath);

  if (state.status === "anonymous") {
    throw new AdminAuthenticationRequiredError(state.loginPath);
  }

  if (state.status === "forbidden") {
    throw new AdminAccessDeniedError();
  }

  return state.session;
}

export function getAdminLoginRedirectPath(
  requestPath: string | string[] | undefined,
) {
  const params = new URLSearchParams({
    callbackURL: getSafeAdminReturnPath(requestPath),
  });

  return `${adminLoginPath}?${params.toString()}`;
}

export function getSafeAdminReturnPath(
  value: string | string[] | undefined,
  fallback = adminBasePath,
) {
  if (typeof value !== "string" || value.length === 0) {
    return fallback;
  }

  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001f\u007f]/u.test(value)
  ) {
    return fallback;
  }

  let parsed: URL;

  try {
    parsed = new URL(value, "https://kuraishi.local");
  } catch {
    return fallback;
  }

  if (
    parsed.origin !== "https://kuraishi.local" ||
    !isAdminPath(parsed.pathname)
  ) {
    return fallback;
  }

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

export function isAdminPath(pathname: string) {
  return pathname === adminBasePath || pathname.startsWith(`${adminBasePath}/`);
}

export function isAdminRole(role: string | null | undefined) {
  return parseRoleList(role).includes(authRoles.admin);
}

function parseRoleList(role: string | null | undefined) {
  return (
    role
      ?.split(",")
      .map((value) => value.trim())
      .filter(Boolean) ?? []
  );
}
