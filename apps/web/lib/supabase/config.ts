import { z } from "zod";

function isPublicKey(value: string) {
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(value)) return true;
  // The local Supabase CLI may still provide a legacy anon JWT. Never accept an admin key.
  try {
    const payload = value.split(".")[1];
    if (!payload) return false;
    const decoded: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return z.object({ role: z.literal("anon") }).safeParse(decoded).success;
  } catch {
    return false;
  }
}

const configSchema = z.object({
  url: z.url().refine((value) => ["http:", "https:"].includes(new URL(value).protocol)),
  publishableKey: z.string().min(1).refine(isPublicKey),
});

export function getSupabaseConfig() {
  const result = configSchema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  return result.success ? result.data : null;
}

export class AuthConfigurationError extends Error {
  constructor() {
    super("Supabase authentication is not configured with a valid URL and public key.");
    this.name = "AuthConfigurationError";
  }
}
