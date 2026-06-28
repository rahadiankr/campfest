import type { Json } from "@/lib/database.types";

import type { ProfileRow, SocialMediaLinks } from "@/lib/profile/types";

type JsonObject = {
  readonly [key: string]: Json | undefined;
};

export const emptySocialMediaLinks: SocialMediaLinks = {
  instagram: "",
  tiktok: "",
};

const isJsonObject = (value: Json | null): value is JsonObject =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const readStringProperty = (
  value: Json | null,
  key: keyof SocialMediaLinks,
): string => {
  if (!isJsonObject(value)) {
    return "";
  }

  const property = value[key];

  if (typeof property !== "string") {
    return "";
  }

  return property.trim();
};

export const readSocialMediaLinks = (
  value: ProfileRow["social_media"],
): SocialMediaLinks => ({
  instagram: readStringProperty(value, "instagram"),
  tiktok: readStringProperty(value, "tiktok"),
});

export const buildSocialMediaJson = (
  links: SocialMediaLinks,
): Json | null => {
  const instagram = links.instagram.trim();
  const tiktok = links.tiktok.trim();

  if (instagram.length === 0 && tiktok.length === 0) {
    return null;
  }

  if (instagram.length > 0 && tiktok.length > 0) {
    return {
      instagram,
      tiktok,
    };
  }

  if (instagram.length > 0) {
    return {
      instagram,
    };
  }

  return {
    tiktok,
  };
};
