import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

type CampSupabaseClient = SupabaseClient<Database>;

export type DevotionalRow = Database["public"]["Tables"]["devotionals"]["Row"];
export type SongRow = Database["public"]["Tables"]["songs"]["Row"];

interface SupabaseErrorLike {
  readonly code?: string;
  readonly details?: string;
  readonly hint?: string;
  readonly message: string;
}

export class BacaanDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BacaanDataError";
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

export const fetchDevotionals = async (
  supabase: CampSupabaseClient,
): Promise<readonly DevotionalRow[]> => {
  const { data, error } = await supabase
    .from("devotionals")
    .select("*")
    .order("date", { ascending: false, nullsFirst: false });

  if (error !== null) {
    throw new BacaanDataError(
      formatSupabaseError("Fetch devotionals", "table=devotionals order=date desc", error),
    );
  }

  return data;
};

export const fetchDevotionalById = async (
  supabase: CampSupabaseClient,
  id: string,
): Promise<DevotionalRow> => {
  const { data, error } = await supabase
    .from("devotionals")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error !== null) {
    throw new BacaanDataError(
      formatSupabaseError("Fetch devotional", `table=devotionals id=${id}`, error),
    );
  }

  if (data === null) {
    throw new BacaanDataError(`Renungan dengan id ${id} tidak ditemukan.`);
  }

  return data;
};

export const fetchSongs = async (
  supabase: CampSupabaseClient,
): Promise<readonly SongRow[]> => {
  const { data, error } = await supabase
    .from("songs")
    .select("*")
    .order("title", { ascending: true });

  if (error !== null) {
    throw new BacaanDataError(
      formatSupabaseError("Fetch songs", "table=songs order=title asc", error),
    );
  }

  return data;
};

export const fetchSongById = async (
  supabase: CampSupabaseClient,
  id: string,
): Promise<SongRow> => {
  const { data, error } = await supabase
    .from("songs")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error !== null) {
    throw new BacaanDataError(
      formatSupabaseError("Fetch song", `table=songs id=${id}`, error),
    );
  }

  if (data === null) {
    throw new BacaanDataError(`Lagu dengan id ${id} tidak ditemukan.`);
  }

  return data;
};
