export function isProtectedPath(pathname: string) {
  return /^\/(dashboard|project)(\/|$)/.test(pathname);
}

export function safeAuthDestination(value: unknown): string {
  const fallback = "/dashboard";
  if (typeof value !== "string" || !value.startsWith("/") || /[\\\s]|%5c/i.test(value)) {
    return fallback;
  }
  try {
    const url = new URL(value, "https://narra.invalid");
    if (url.origin !== "https://narra.invalid" || !isProtectedPath(url.pathname)) return fallback;
    return `${url.pathname}${url.search}`;
  } catch {
    return fallback;
  }
}
