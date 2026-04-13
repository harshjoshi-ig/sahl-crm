import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonOrPublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !anonOrPublishableKey) {
    throw new Error("Supabase environment variables are missing");
  }

  return createBrowserClient(
    url,
    anonOrPublishableKey,
  );
}
