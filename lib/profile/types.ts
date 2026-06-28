import type { Database } from "@/lib/database.types";

export type ChurchRow = Database["public"]["Tables"]["churches"]["Row"];
export type GroupRow = Database["public"]["Tables"]["groups"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export interface SocialMediaLinks {
  readonly instagram: string;
  readonly tiktok: string;
}

export interface ProfilePageData {
  readonly church: ChurchRow | null;
  readonly group: GroupRow | null;
  readonly profile: ProfileRow;
}

export interface EditableProfileData extends ProfilePageData {
  readonly churches: readonly ChurchRow[];
}

export interface ProfileUpdateInput {
  readonly avatarUrl: string | null;
  readonly churchId: string | null;
  readonly churchOther: string | null;
  readonly fullName: string;
  readonly socialMedia: SocialMediaLinks;
}
