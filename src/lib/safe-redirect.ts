const FALLBACK = "/admin";

// Only same-site paths inside the dashboard are accepted as post-login targets.
export function getSafeReturnPath(value: string | null | undefined) {
  if (!value || value.length > 500) return FALLBACK;
  if (!value.startsWith("/admin")) return FALLBACK;
  if (value !== "/admin" && !/^\/admin[/?#]/.test(value)) return FALLBACK;
  if (value.includes("\\") || value.includes("..") || /[\u0000-\u001f]/.test(value)) {
    return FALLBACK;
  }
  if (value.startsWith("//")) return FALLBACK;

  return value;
}
