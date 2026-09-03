import { authRoles } from "./roles.ts";

export const firstAdminSeedEnvNames = {
  databaseUrl: "DATABASE_URL",
  email: "SEED_ADMIN_EMAIL",
  firstName: "SEED_ADMIN_FIRST_NAME",
  lastName: "SEED_ADMIN_LAST_NAME",
  password: "SEED_ADMIN_PASSWORD",
  secret: "BETTER_AUTH_SECRET",
} as const;

export type FirstAdminSeedInput = {
  databaseUrl: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  secret: string;
};

export type ExistingFirstAdminUser = {
  accounts: Array<{
    password: string | null;
    providerId: string;
  }>;
  emailVerified: boolean;
  role: string | null;
};

type FirstAdminSeedInputResult =
  | {
      input: FirstAdminSeedInput;
      ok: true;
    }
  | {
      issues: string[];
      ok: false;
    };

export type FirstAdminSeedState =
  | {
      action: "create";
    }
  | {
      action: "already-configured";
    }
  | {
      action: "conflict";
      reasons: string[];
    };

const minSeedPasswordLength = 14;

export function readFirstAdminSeedInput(
  env: Record<string, string | undefined>,
): FirstAdminSeedInputResult {
  const databaseUrl = readRequiredEnv(env, firstAdminSeedEnvNames.databaseUrl);
  const email = normalizeEmail(
    readRequiredEnv(env, firstAdminSeedEnvNames.email),
  );
  const firstName = normalizeName(
    readRequiredEnv(env, firstAdminSeedEnvNames.firstName),
  );
  const lastName = normalizeName(
    readRequiredEnv(env, firstAdminSeedEnvNames.lastName),
  );
  const password = readRequiredEnv(env, firstAdminSeedEnvNames.password);
  const secret = readRequiredEnv(env, firstAdminSeedEnvNames.secret);
  const issues: string[] = [];

  if (!databaseUrl) {
    issues.push(`${firstAdminSeedEnvNames.databaseUrl} is required.`);
  }

  if (!email) {
    issues.push(`${firstAdminSeedEnvNames.email} must be a valid email.`);
  }

  if (!firstName) {
    issues.push(
      `${firstAdminSeedEnvNames.firstName} must contain at least 2 characters.`,
    );
  }

  if (!lastName) {
    issues.push(
      `${firstAdminSeedEnvNames.lastName} must contain at least 2 characters.`,
    );
  }

  issues.push(...validateSeedAdminPassword(password));

  if (!secret || secret.length < 32) {
    issues.push(
      `${firstAdminSeedEnvNames.secret} must be at least 32 characters.`,
    );
  }

  if (issues.length > 0) {
    return {
      issues,
      ok: false,
    };
  }

  return {
    input: {
      databaseUrl: databaseUrl!,
      email: email!,
      firstName: firstName!,
      lastName: lastName!,
      password: password!,
      secret: secret!,
    },
    ok: true,
  };
}

export function getFirstAdminDisplayName(input: {
  firstName: string;
  lastName: string;
}) {
  return `${input.firstName} ${input.lastName}`;
}

export function classifyFirstAdminSeedState(
  user: ExistingFirstAdminUser | null,
): FirstAdminSeedState {
  if (!user) {
    return {
      action: "create",
    };
  }

  const reasons: string[] = [];

  if (user.role !== authRoles.admin) {
    reasons.push("an account already exists for this email without ADMIN role");
  }

  if (!user.emailVerified) {
    reasons.push("the existing account email is not verified");
  }

  if (!hasCredentialAccount(user)) {
    reasons.push("the existing account does not have a credential password");
  }

  if (reasons.length > 0) {
    return {
      action: "conflict",
      reasons,
    };
  }

  return {
    action: "already-configured",
  };
}

function hasCredentialAccount(user: ExistingFirstAdminUser) {
  return user.accounts.some(
    (account) =>
      account.providerId === "credential" &&
      typeof account.password === "string" &&
      account.password.length > 0,
  );
}

function validateSeedAdminPassword(password: string | null) {
  const issues: string[] = [];

  if (!password) {
    return [`${firstAdminSeedEnvNames.password} is required.`];
  }

  if (password.length < minSeedPasswordLength) {
    issues.push(
      `${firstAdminSeedEnvNames.password} must be at least ${minSeedPasswordLength} characters.`,
    );
  }

  if (!/[a-z]/.test(password)) {
    issues.push(
      `${firstAdminSeedEnvNames.password} must include a lowercase letter.`,
    );
  }

  if (!/[A-Z]/.test(password)) {
    issues.push(
      `${firstAdminSeedEnvNames.password} must include an uppercase letter.`,
    );
  }

  if (!/\d/.test(password)) {
    issues.push(`${firstAdminSeedEnvNames.password} must include a number.`);
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    issues.push(`${firstAdminSeedEnvNames.password} must include a symbol.`);
  }

  if (/\s/.test(password)) {
    issues.push(`${firstAdminSeedEnvNames.password} must not contain spaces.`);
  }

  return issues;
}

function readRequiredEnv(env: Record<string, string | undefined>, key: string) {
  const value = env[key]?.trim();

  return value || null;
}

function normalizeEmail(value: string | null) {
  if (!value) {
    return null;
  }

  const email = value.toLowerCase();

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function normalizeName(value: string | null) {
  if (!value) {
    return null;
  }

  const name = value.replace(/\s+/g, " ").trim();

  return name.length >= 2 ? name : null;
}
