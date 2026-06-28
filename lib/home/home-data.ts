import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { formatLocalDate } from "@/lib/home/date";
import type {
  DevotionalRow,
  EventInfoRow,
  EventSettingsRow,
  HomePageData,
  KirimSalamSettingsRow,
} from "@/lib/home/types";
import { fetchProfilePageData } from "@/lib/profile/profile-data";

type CampSupabaseClient = SupabaseClient<Database>;

interface SupabaseErrorLike {
  readonly code?: string;
  readonly details?: string;
  readonly hint?: string;
  readonly message: string;
}

export class HomeDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HomeDataError";
  }
}

const formatSupabaseError = (
  action: string,
  params: string,
  error: SupabaseErrorLike,
): string =>
  `${action} failed with params ${params}: ${error.message}${
    error.code === undefined ? "" : ` (code: ${error.code})`
  }${error.details === undefined ? "" : ` details: ${error.details}`}${
    error.hint === undefined ? "" : ` hint: ${error.hint}`
  }`;

export const fetchEventSettings = async (
  supabase: CampSupabaseClient,
): Promise<EventSettingsRow> => {
  const { data, error } = await supabase
    .from("event_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error !== null) {
    throw new HomeDataError(
      formatSupabaseError("Fetch event settings", "table=event_settings id=1", error),
    );
  }

  if (data === null) {
    throw new HomeDataError(
      "Event settings row not found. Run migration 0002_home_event_settings.sql or insert row id=1 in public.event_settings.",
    );
  }

  if (data.event_name.trim().length === 0) {
    throw new HomeDataError("Event settings event_name cannot be empty.");
  }

  return data;
};

const fetchTodayDevotional = async (
  supabase: CampSupabaseClient,
  today: Date,
): Promise<DevotionalRow | null> => {
  const todayValue = formatLocalDate(today);
  const { data, error } = await supabase
    .from("devotionals")
    .select("*")
    .eq("date", todayValue)
    .order("title", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error !== null) {
    throw new HomeDataError(
      formatSupabaseError(
        "Fetch today devotional",
        `table=devotionals date=${todayValue}`,
        error,
      ),
    );
  }

  return data;
};

const fetchCommitteeContacts = async (
  supabase: CampSupabaseClient,
): Promise<readonly EventInfoRow[]> => {
  const { data, error } = await supabase
    .from("event_info")
    .select("*")
    .eq("type", "contact")
    .order("sort_order", { ascending: true })
    .limit(2);

  if (error !== null) {
    throw new HomeDataError(
      formatSupabaseError(
        "Fetch committee contacts",
        "table=event_info type=contact limit=2",
        error,
      ),
    );
  }

  return data;
};

const fetchKirimSalamSettings = async (
  supabase: CampSupabaseClient,
): Promise<KirimSalamSettingsRow> => {
  const { data, error } = await supabase
    .from("kirim_salam_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error !== null) {
    throw new HomeDataError(
      formatSupabaseError(
        "Fetch kirim salam settings",
        "table=kirim_salam_settings id=1",
        error,
      ),
    );
  }

  if (data === null) {
    throw new HomeDataError(
      "Kirim salam settings row not found. Run migration 0003_kirim_salam_settings.sql or insert row id=1 in public.kirim_salam_settings.",
    );
  }

  return data;
};

export const fetchHomePageData = async (
  supabase: CampSupabaseClient,
  userId: string,
  today: Date,
): Promise<HomePageData> => {
  const [
    profileData,
    eventSettings,
    devotional,
    contacts,
    kirimSalamSettings,
  ] = await Promise.all([
    fetchProfilePageData(supabase, userId),
    fetchEventSettings(supabase),
    fetchTodayDevotional(supabase, today),
    fetchCommitteeContacts(supabase),
    fetchKirimSalamSettings(supabase),
  ]);

  return {
    contacts,
    devotional,
    eventSettings,
    kirimSalamSettings,
    profileData,
  };
};
