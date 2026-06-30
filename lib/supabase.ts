import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type PublicEnvKey =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY";

interface PublicEnvValues {
  readonly NEXT_PUBLIC_SUPABASE_URL: string | undefined;
  readonly NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string | undefined;
}

const publicEnvValues: PublicEnvValues = {
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
};

let browserSupabaseClient: SupabaseClient<Database> | null = null;

export class PublicEnvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicEnvError";
  }
}

const readRequiredPublicEnv = (key: PublicEnvKey): string => {
  const value = publicEnvValues[key];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new PublicEnvError(`Missing required public environment variable: ${key}`);
  }

  return value.trim();
};

const readSupabaseUrl = (): string => {
  const url = readRequiredPublicEnv("NEXT_PUBLIC_SUPABASE_URL");

  try {
    new URL(url);
  } catch {
    throw new PublicEnvError(
      `Invalid NEXT_PUBLIC_SUPABASE_URL value: ${url}. Expected an absolute Supabase project URL.`,
    );
  }

  return url;
};

const createConfiguredSupabaseClient = (): SupabaseClient<Database> => {
  const supabaseUrl = readSupabaseUrl();
  const supabasePublishableKey = readRequiredPublicEnv(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  );

  return createClient<Database>(supabaseUrl, supabasePublishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  });
};

export const createSupabaseBrowserClient = (): SupabaseClient<Database> => {
  if (browserSupabaseClient !== null) {
    return browserSupabaseClient;
  }

  browserSupabaseClient = createConfiguredSupabaseClient();
  return browserSupabaseClient;
};
