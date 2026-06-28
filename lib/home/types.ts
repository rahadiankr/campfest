import type { Database } from "@/lib/database.types";
import type { ProfilePageData } from "@/lib/profile/types";

export type DevotionalRow = Database["public"]["Tables"]["devotionals"]["Row"];
export type EventInfoRow = Database["public"]["Tables"]["event_info"]["Row"];
export type EventSettingsRow =
  Database["public"]["Tables"]["event_settings"]["Row"];
export type KirimSalamSettingsRow =
  Database["public"]["Tables"]["kirim_salam_settings"]["Row"];

export interface HomePageData {
  readonly contacts: readonly EventInfoRow[];
  readonly devotional: DevotionalRow | null;
  readonly eventSettings: EventSettingsRow;
  readonly kirimSalamSettings: KirimSalamSettingsRow;
  readonly profileData: ProfilePageData;
}

export type CountdownTone = "active" | "complete" | "pending" | "unconfigured";

export interface CountdownState {
  readonly detail: string;
  readonly metric: string;
  readonly tone: CountdownTone;
}
