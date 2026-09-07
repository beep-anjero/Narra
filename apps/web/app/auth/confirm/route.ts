import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { safeAuthDestination } from "@/features/auth/redirects";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const confirmationSchema = z.object({
  token_hash: z.string().min(1).max(2048),
  type: z.literal("email"),
});

export async function GET(request: NextRequest) {
  const parameters = request.nextUrl.searchParams;
  const parsed = confirmationSchema.safeParse({
    token_hash: parameters.get("token_hash"),
    type: parameters.get("type"),
  });
  let destination = "/login?notice=confirmation_failed";
  if (parsed.success) {
    try {
      const supabase = await createSupabaseServerClient(true);
      const { error } = await supabase.auth.verifyOtp(parsed.data);
      if (!error) destination = safeAuthDestination(parameters.get("next"));
    } catch {
      destination = "/login?notice=unavailable";
    }
  }
  const response = NextResponse.redirect(new URL(destination, request.url));
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
