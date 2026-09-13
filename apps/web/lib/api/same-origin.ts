/** Compare the browser origin with the HTTP Host, not Next's internal URL hostname.
 * Reverse proxies must preserve Host and reject unrecognized public hostnames.
 * Never trust a caller-supplied X-Forwarded-Host here.
 */
export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const parsed = new URL(origin);
    const host = request.headers.get("host") ?? new URL(request.url).host;
    return (
      ["http:", "https:"].includes(parsed.protocol) &&
      parsed.origin === origin &&
      parsed.host.toLowerCase() === host.toLowerCase()
    );
  } catch {
    return false;
  }
}
