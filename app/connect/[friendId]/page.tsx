"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";

import { CampIdBadge } from "@/components/camp-id-badge";
import { Button } from "@/components/ui/button";
import type { Database } from "@/lib/database.types";
import { getErrorMessage } from "@/lib/error-message";
import { fetchFriendProfile } from "@/lib/connect/connect-data";
import { readSocialMediaLinks } from "@/lib/profile/social-media";
import type { ProfilePageData } from "@/lib/profile/types";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type FriendProfileState =
  | {
      readonly status: "loading";
    }
  | {
      readonly message: string;
      readonly status: "error";
    }
  | {
      readonly data: ProfilePageData;
      readonly status: "ready";
    };

interface SocialMediaItem {
  readonly label: string;
  readonly value: string;
}

const getChurchName = (data: ProfilePageData): string | null => {
  if (data.church !== null) {
    return data.church.name;
  }

  if (
    data.profile.church_other !== null &&
    data.profile.church_other.trim().length > 0
  ) {
    return data.profile.church_other.trim();
  }

  return null;
};

const buildSocialMediaItems = (
  links: ReturnType<typeof readSocialMediaLinks>,
): readonly SocialMediaItem[] => {
  const instagram = links.instagram.trim();
  const tiktok = links.tiktok.trim();

  const items: SocialMediaItem[] = [];
  if (instagram.length > 0) {
    items.push({
      label: "Instagram",
      value: instagram,
    });
  }
  if (tiktok.length > 0) {
    items.push({
      label: "TikTok",
      value: tiktok,
    });
  }

  return items;
};

const getCurrentUser = async (
  supabase: SupabaseClient<Database>,
): Promise<User | null> => {
  const { data, error } = await supabase.auth.getUser();

  if (error !== null) {
    if (error.message === "Auth session missing!") {
      return null;
    }

    throw new Error(`Failed to read current auth user: ${error.message}`);
  }

  return data.user;
};

interface FriendPageProps {
  readonly params: Promise<{
    readonly friendId: string;
  }>;
}

export default function FriendPage({ params }: FriendPageProps) {
  const router = useRouter();
  const { friendId } = use(params);

  const [state, setState] = useState<FriendProfileState>({
    status: "loading",
  });

  const loadFriendProfile = useCallback(async (): Promise<void> => {
    try {
      const supabase = createSupabaseBrowserClient();
      const user = await getCurrentUser(supabase);

      if (user === null) {
        router.replace("/login");
        return;
      }

      // Fetch the friend's profile
      const data = await fetchFriendProfile(supabase, friendId);

      setState({
        data,
        status: "ready",
      });
    } catch (error: unknown) {
      setState({
        message: getErrorMessage(error),
        status: "error",
      });
    }
  }, [router, friendId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadFriendProfile();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadFriendProfile]);

  if (state.status === "loading") {
    return (
      <div className="mx-auto w-full max-w-5xl px-5 py-8">
        <div className="rounded-lg border border-cp-khaki bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground animate-pulse">
            Memuat profil teman...
          </p>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mx-auto w-full max-w-5xl px-5 py-8">
        <section className="space-y-4 rounded-lg border border-destructive/30 bg-card p-6">
          <div>
            <h1 className="font-heading text-5xl leading-none tracking-normal text-cp-pine">
              Profil Teman
            </h1>
            <p className="mt-2 text-sm text-destructive">{state.message}</p>
          </div>
          <Button
            className="rounded-lg bg-cp-pine text-white hover:bg-cp-pine/95"
            onClick={() => {
              setState({ status: "loading" });
              void loadFriendProfile();
            }}
            type="button"
          >
            Coba Lagi
          </Button>
        </section>
      </div>
    );
  }

  const churchName = getChurchName(state.data);
  const socialMedia = readSocialMediaLinks(state.data.profile.social_media);
  const socialItems = buildSocialMediaItems(socialMedia);

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-5 px-5 py-8 lg:grid-cols-[minmax(0,24rem)_1fr]">
      {/* Camp ID Badge (Read-Only) */}
      <CampIdBadge
        avatarUrl={state.data.profile.avatar_url}
        churchName={churchName}
        fullName={state.data.profile.full_name}
        groupColor={state.data.group?.color ?? null}
        groupName={state.data.group?.name ?? null}
        qrCode={state.data.profile.qr_code}
      />

      {/* Profile Details */}
      <section className="space-y-5 rounded-lg border border-cp-khaki bg-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-mono text-xs font-medium uppercase tracking-normal text-cp-moss">
              Koneksi Camp
            </p>
            <h1 className="mt-1 font-heading text-5xl leading-none tracking-normal text-cp-pine">
              Profil Teman
            </h1>
          </div>
          <Button
            asChild
            className="h-11 rounded-lg bg-cp-pine hover:bg-cp-pine/90 text-white"
          >
            <Link href="/connect">Kembali ke List</Link>
          </Button>
        </div>

        <dl className="grid gap-3">
          <div className="rounded-lg border border-cp-khaki bg-background p-4">
            <dt className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
              Nama Lengkap
            </dt>
            <dd className="mt-1 text-base font-semibold text-cp-pine">
              {state.data.profile.full_name}
            </dd>
          </div>
          <div className="rounded-lg border border-cp-khaki bg-background p-4">
            <dt className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
              Gereja Asal
            </dt>
            <dd className="mt-1 text-base font-semibold text-cp-pine">
              {churchName === null ? "Gereja belum diisi" : churchName}
            </dd>
          </div>
          <div className="rounded-lg border border-cp-khaki bg-background p-4">
            <dt className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
              Kelompok
            </dt>
            <dd className="mt-1 text-base font-semibold text-cp-pine">
              {state.data.group === null
                ? "Kelompok belum tersedia"
                : state.data.group.name}
            </dd>
          </div>
        </dl>

        <section className="rounded-lg border border-cp-khaki bg-background p-4">
          <h2 className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
            Social Media
          </h2>
          {socialItems.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Belum mencantumkan social media
            </p>
          ) : (
            <ul className="mt-2 grid gap-2">
              {socialItems.map((item) => (
                <li
                  className="flex items-center justify-between gap-4 text-sm"
                  key={item.label}
                >
                  <span className="font-medium text-cp-pine">{item.label}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {item.value}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>
    </div>
  );
}
