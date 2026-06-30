import type { QueryData, SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { ProfileDataError } from "@/lib/profile/profile-data";
import type { ProfilePageData } from "@/lib/profile/types";

type CampSupabaseClient = SupabaseClient<Database>;

export interface FriendProfile {
  readonly id: string;
  readonly fullName: string;
  readonly avatarUrl: string | null;
  readonly churchName: string | null;
  readonly groupName: string | null;
  readonly groupColor: string | null;
}

interface AddFriendResult {
  readonly friend_id: string;
  readonly full_name: string;
  readonly success: true;
}

interface SupabaseErrorLike {
  readonly code?: string;
  readonly details?: string;
  readonly hint?: string;
  readonly message: string;
}

export class ConnectDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConnectDataError";
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

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null;

const isAddFriendResult = (value: unknown): value is AddFriendResult => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.success === true &&
    typeof value.friend_id === "string" &&
    value.friend_id.length > 0 &&
    typeof value.full_name === "string" &&
    value.full_name.length > 0
  );
};

export const fetchFriendsList = async (
  supabase: CampSupabaseClient,
  userId: string,
): Promise<readonly FriendProfile[]> => {
  const query = supabase
    .from("friendships")
    .select(`
      friend:profiles!friendships_friend_id_fkey (
        id,
        full_name,
        avatar_url,
        church_other,
        church:churches (
          id,
          name
        ),
        group:groups (
          id,
          name,
          color
        )
      )
    `)
    .eq("user_id", userId);
  type FriendsListRows = QueryData<typeof query>;

  const { data, error } = await query;

  if (error !== null) {
    throw new ConnectDataError(
      formatSupabaseError("Fetch friends list", `user_id=${userId}`, error),
    );
  }

  if (data === null) {
    return [];
  }

  const rows: FriendsListRows = data;

  return rows
    .map((row) => {
      const friend = row.friend;
      if (friend === null) {
        return null;
      }

      const churchOther = friend.church_other?.trim() ?? "";
      const churchName =
        friend.church === null
          ? churchOther.length > 0
            ? churchOther
            : null
          : friend.church.name;

      return {
        avatarUrl: friend.avatar_url,
        churchName,
        fullName: friend.full_name,
        groupColor: friend.group?.color ?? null,
        groupName: friend.group?.name ?? null,
        id: friend.id,
      };
    })
    .filter((friend): friend is FriendProfile => friend !== null);
};

export const addFriendByQrCode = async (
  supabase: CampSupabaseClient,
  qrCode: string,
): Promise<{ readonly friendId: string; readonly fullName: string }> => {
  const { data, error } = await supabase.rpc("add_friend_by_qr", {
    friend_qr_code: qrCode,
  });

  if (error !== null) {
    throw new ConnectDataError(
      formatSupabaseError("Add friend by QR code", `qr_code=${qrCode}`, error),
    );
  }

  if (!isAddFriendResult(data)) {
    throw new ConnectDataError(
      `Invalid add_friend_by_qr response for qr_code=${qrCode}.`,
    );
  }

  return {
    friendId: data.friend_id,
    fullName: data.full_name,
  };
};

const deleteFriendship = async (
  supabase: CampSupabaseClient,
  action: string,
  userId: string,
  friendId: string,
): Promise<void> => {
  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("user_id", userId)
    .eq("friend_id", friendId);

  if (error !== null) {
    throw new ConnectDataError(
      formatSupabaseError(action, `user_id=${userId} friend_id=${friendId}`, error),
    );
  }
};

export const unfriendUser = async (
  supabase: CampSupabaseClient,
  userId: string,
  friendId: string,
): Promise<void> => {
  await deleteFriendship(supabase, "Unfriend primary friendship", userId, friendId);
  await deleteFriendship(
    supabase,
    "Unfriend reciprocal friendship",
    friendId,
    userId,
  );
};

export const fetchFriendProfile = async (
  supabase: CampSupabaseClient,
  friendId: string,
): Promise<ProfilePageData> => {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", friendId)
    .maybeSingle();

  if (profileError !== null) {
    throw new ProfileDataError(
      formatSupabaseError("Fetch friend profile", `friend_id=${friendId}`, profileError),
    );
  }

  if (profile === null) {
    throw new ProfileDataError("Profil teman tidak ditemukan.");
  }

  let church = null;
  if (profile.church_id !== null) {
    const { data: churchData, error: churchError } = await supabase
      .from("churches")
      .select("*")
      .eq("id", profile.church_id)
      .maybeSingle();

    if (churchError !== null) {
      throw new ProfileDataError(
        formatSupabaseError(
          "Fetch friend church",
          `friend_id=${friendId} church_id=${profile.church_id}`,
          churchError,
        ),
      );
    }

    if (churchData === null) {
      throw new ProfileDataError(
        `Gereja untuk profil teman ${friendId} tidak ditemukan: church_id=${profile.church_id}.`,
      );
    }

    church = churchData;
  }

  let group = null;
  if (profile.group_id !== null) {
    const { data: groupData, error: groupError } = await supabase
      .from("groups")
      .select("*")
      .eq("id", profile.group_id)
      .maybeSingle();

    if (groupError !== null) {
      throw new ProfileDataError(
        formatSupabaseError(
          "Fetch friend group",
          `friend_id=${friendId} group_id=${profile.group_id}`,
          groupError,
        ),
      );
    }

    if (groupData === null) {
      throw new ProfileDataError(
        `Kelompok untuk profil teman ${friendId} tidak ditemukan: group_id=${profile.group_id}.`,
      );
    }

    group = groupData;
  }

  return {
    church,
    group,
    profile,
  };
};
