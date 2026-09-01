type SessionUser = {
  email?: string | null;
  name?: string | null;
};

export function getSessionDisplayName(user: SessionUser | null | undefined) {
  return normalizeDisplayValue(user?.name) ?? "Client account";
}

export function getSessionSubtitle(user: SessionUser | null | undefined) {
  return normalizeDisplayValue(user?.email) ?? "Signed in";
}

export function getInitials(value: string) {
  const parts = value
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

  if (parts.length === 0) {
    return "KA";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function normalizeDisplayValue(value: string | null | undefined) {
  const normalized = value?.replace(/\s+/g, " ").trim();

  return normalized || null;
}
