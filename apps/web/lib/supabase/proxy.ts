import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isProtectedPath } from "@/features/auth/redirects";
import { getSupabaseConfig } from "@/lib/supabase/config";
import type { Database } from "@/types/database";

export async function updateSession(request: NextRequest) {
  const config = getSupabaseConfig();
  const protectedPath = isProtectedPath(request.nextUrl.pathname);
  const pendingCookies = new Map<string, { name: string; value: string; options: CookieOptions }>();

  function finish(response: NextResponse) {
    pendingCookies.forEach(({ name, value, options }) =>
      response.cookies.set(name, value, options),
    );
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }

  function loginRedirect(unavailable = false) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    if (unavailable) url.searchParams.set("notice", "unavailable");
    return finish(NextResponse.redirect(url));
  }

  if (!config) {
    return protectedPath ? loginRedirect(true) : finish(NextResponse.next({ request }));
  }

  const supabase = createServerClient<Database>(config.url, config.publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach((cookie) => {
          request.cookies.set(cookie.name, cookie.value);
          pendingCookies.set(cookie.name, cookie);
        });
      },
    },
  });

  try {
    // Verify signatures and refresh expired credentials; never authorize from getSession().
    const { data, error } = await supabase.auth.getClaims();
    if (protectedPath && (error || !data?.claims?.sub)) return loginRedirect();
  } catch {
    if (protectedPath) return loginRedirect(true);
  }
  // Updated request cookies go to server components, and response cookies go to the browser.
  return finish(NextResponse.next({ request }));
}
