import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { AuthConfigurationError, getSupabaseConfig } from "@/lib/supabase/config";
import type { Database } from "@/types/database";

export async function createSupabaseServerClient(writable = false) {
  const config = getSupabaseConfig();
  if (!config) throw new AuthConfigurationError();
  const cookieStore = await cookies();

  return createServerClient<Database>(config.url, config.publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(values) {
        // Proxy refreshes cookies for server components. Actions/handlers must persist writes.
        if (!writable) return;
        values.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      },
    },
  });
}
