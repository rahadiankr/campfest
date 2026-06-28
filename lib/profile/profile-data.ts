import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { buildSocialMediaJson } from "@/lib/profile/social-media";
import type {
  ChurchRow,
  EditableProfileData,
  GroupRow,
  ProfilePageData,
  ProfileRow,
  ProfileUpdateInput,
} from "@/lib/profile/types";
import type { CompressedAvatarImage } from "@/lib/profile/avatar-image";

type CampSupabaseClient = SupabaseClient<Database>;

interface SupabaseErrorLike {
  readonly code?: string;
  readonly details?: string;
  readonly hint?: string;
  readonly message: string;
}

export class ProfileDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProfileDataError";
  }
}

const avatarBucketName = "avatars";

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

const assertProfileRow = (profile: ProfileRow, userId: string): void => {
  if (profile.id !== userId) {
    throw new ProfileDataError(
      `Profile user mismatch. Expected user id ${userId}, received ${profile.id}.`,
    );
  }

  if (profile.full_name.trim().length === 0) {
    throw new ProfileDataError(`Profile ${userId} has empty full_name.`);
  }

  if (profile.qr_code.trim().length === 0) {
    throw new ProfileDataError(`Profile ${userId} has empty qr_code.`);
  }
};

export const fetchProfileByUserId = async (
  supabase: CampSupabaseClient,
  userId: string,
): Promise<ProfileRow> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error !== null) {
    throw new ProfileDataError(
      formatSupabaseError("Fetch profile", `table=profiles id=${userId}`, error),
    );
  }

  if (data === null) {
    throw new ProfileDataError(`Profile not found for user id ${userId}.`);
  }

  assertProfileRow(data, userId);

  return data;
};

const fetchChurchById = async (
  supabase: CampSupabaseClient,
  churchId: string | null,
): Promise<ChurchRow | null> => {
  if (churchId === null) {
    return null;
  }

  const { data, error } = await supabase
    .from("churches")
    .select("*")
    .eq("id", churchId)
    .maybeSingle();

  if (error !== null) {
    throw new ProfileDataError(
      formatSupabaseError("Fetch church", `table=churches id=${churchId}`, error),
    );
  }

  return data;
};

const fetchGroupById = async (
  supabase: CampSupabaseClient,
  groupId: string | null,
): Promise<GroupRow | null> => {
  if (groupId === null) {
    return null;
  }

  const { data, error } = await supabase
    .from("groups")
    .select("*")
    .eq("id", groupId)
    .maybeSingle();

  if (error !== null) {
    throw new ProfileDataError(
      formatSupabaseError("Fetch group", `table=groups id=${groupId}`, error),
    );
  }

  return data;
};

export const fetchChurches = async (
  supabase: CampSupabaseClient,
): Promise<readonly ChurchRow[]> => {
  const { data, error } = await supabase
    .from("churches")
    .select("*")
    .order("name", { ascending: true });

  if (error !== null) {
    throw new ProfileDataError(
      formatSupabaseError("Fetch churches", "table=churches order=name", error),
    );
  }

  return data;
};

export const fetchProfilePageData = async (
  supabase: CampSupabaseClient,
  userId: string,
): Promise<ProfilePageData> => {
  const profile = await fetchProfileByUserId(supabase, userId);
  const [church, group] = await Promise.all([
    fetchChurchById(supabase, profile.church_id),
    fetchGroupById(supabase, profile.group_id),
  ]);

  return {
    church,
    group,
    profile,
  };
};

export const fetchEditableProfileData = async (
  supabase: CampSupabaseClient,
  userId: string,
): Promise<EditableProfileData> => {
  const [profileData, churches] = await Promise.all([
    fetchProfilePageData(supabase, userId),
    fetchChurches(supabase),
  ]);

  return {
    ...profileData,
    churches,
  };
};

export const uploadProfileAvatar = async (
  supabase: CampSupabaseClient,
  userId: string,
  avatar: CompressedAvatarImage,
): Promise<string> => {
  const avatarPath = `${userId}/avatar.${avatar.extension}`;
  const { error } = await supabase.storage
    .from(avatarBucketName)
    .upload(avatarPath, avatar.blob, {
      contentType: avatar.contentType,
      upsert: true,
    });

  if (error !== null) {
    throw new ProfileDataError(
      `Upload avatar failed with params bucket=${avatarBucketName} path=${avatarPath} size=${avatar.blob.size}: ${error.message}`,
    );
  }

  const { data } = supabase.storage
    .from(avatarBucketName)
    .getPublicUrl(avatarPath);

  if (data.publicUrl.trim().length === 0) {
    throw new ProfileDataError(
      `Supabase returned empty public avatar URL for bucket=${avatarBucketName} path=${avatarPath}.`,
    );
  }

  return data.publicUrl;
};

export const updateProfile = async (
  supabase: CampSupabaseClient,
  userId: string,
  input: ProfileUpdateInput,
): Promise<void> => {
  const { error } = await supabase
    .from("profiles")
    .update({
      avatar_url: input.avatarUrl,
      church_id: input.churchId,
      church_other: input.churchOther,
      full_name: input.fullName,
      social_media: buildSocialMediaJson(input.socialMedia),
    })
    .eq("id", userId);

  if (error !== null) {
    throw new ProfileDataError(
      formatSupabaseError("Update profile", `table=profiles id=${userId}`, error),
    );
  }
};
