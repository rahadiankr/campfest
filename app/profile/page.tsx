"use client";

import { Logout03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { CampIdBadge } from "@/components/camp-id-badge";
import { Button } from "@/components/ui/button";
import type { Database } from "@/lib/database.types";
import { getErrorMessage } from "@/lib/error-message";
import { fetchProfilePageData } from "@/lib/profile/profile-data";
import { readSocialMediaLinks } from "@/lib/profile/social-media";
import type { ProfilePageData, SocialMediaLinks } from "@/lib/profile/types";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type ProfileState =
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

type SignOutState =
  | {
      readonly status: "idle";
    }
  | {
      readonly status: "submitting";
    }
  | {
      readonly message: string;
      readonly status: "error";
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
  links: SocialMediaLinks,
): readonly SocialMediaItem[] => {
  const instagram = links.instagram.trim();
  const tiktok = links.tiktok.trim();

  if (instagram.length > 0 && tiktok.length > 0) {
    return [
      {
        label: "Instagram",
        value: instagram,
      },
      {
        label: "TikTok",
        value: tiktok,
      },
    ];
  }

  if (instagram.length > 0) {
    return [
      {
        label: "Instagram",
        value: instagram,
      },
    ];
  }

  if (tiktok.length > 0) {
    return [
      {
        label: "TikTok",
        value: tiktok,
      },
    ];
  }

  return [];
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

const signOutCurrentUser = async (
  supabase: SupabaseClient<Database>,
): Promise<void> => {
  const { error } = await supabase.auth.signOut();

  if (error !== null) {
    throw new Error(`Failed to sign out current user: ${error.message}`);
  }
};

export default function ProfilePage() {
  const router = useRouter();
  const [state, setState] = useState<ProfileState>({ status: "loading" });
  const [signOutState, setSignOutState] = useState<SignOutState>({
    status: "idle",
  });

  const loadProfile = useCallback(async (): Promise<void> => {
    let supabase: SupabaseClient<Database>;

    try {
      supabase = createSupabaseBrowserClient();
      const user = await getCurrentUser(supabase);

      if (user === null) {
        router.replace("/login");
        return;
      }

      const data = await fetchProfilePageData(supabase, user.id);
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
  }, [router]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadProfile();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadProfile]);

  const handleSignOut = useCallback(async (): Promise<void> => {
    setSignOutState({ status: "submitting" });

    try {
      const supabase = createSupabaseBrowserClient();
      await signOutCurrentUser(supabase);
      router.replace("/login");
    } catch (error: unknown) {
      setSignOutState({
        message: getErrorMessage(error),
        status: "error",
      });
    }
  }, [router]);

  if (state.status === "loading") {
    return (
      <div className="mx-auto w-full max-w-5xl px-5 py-8">
        <div className="rounded-lg border border-cp-khaki bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">
            Memuat profile...
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
              Profile
            </h1>
            <p className="mt-2 text-sm text-destructive">{state.message}</p>
          </div>
          <Button
            className="rounded-lg"
            onClick={() => {
              setState({ status: "loading" });
              void loadProfile();
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
      <CampIdBadge
        avatarUrl={state.data.profile.avatar_url}
        churchName={churchName}
        fullName={state.data.profile.full_name}
        groupColor={state.data.group?.color ?? null}
        groupName={state.data.group?.name ?? null}
        qrCode={state.data.profile.qr_code}
      />

      <section className="space-y-5 rounded-lg border border-cp-khaki border-l-4 border-l-cp-moss bg-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-mono text-xs font-medium uppercase tracking-normal text-cp-moss">
              Profile Peserta
            </p>
            <h1 className="mt-1 font-heading text-5xl leading-none tracking-normal text-cp-pine">
              Data Saya
            </h1>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              asChild
              className="h-11 rounded-lg bg-cp-amber text-cp-pine hover:bg-cp-amber/90"
            >
              <Link href="/profile/edit">Edit Profile</Link>
            </Button>
            <Button
              className="h-11 gap-2 rounded-lg border-destructive/40 bg-transparent text-destructive hover:bg-destructive/10"
              disabled={signOutState.status === "submitting"}
              onClick={() => {
                void handleSignOut();
              }}
              type="button"
              variant="outline"
            >
              <HugeiconsIcon icon={Logout03Icon} size={18} strokeWidth={1.8} />
              {signOutState.status === "submitting" ? "Keluar..." : "Keluar"}
            </Button>
          </div>
        </div>

        {signOutState.status === "error" ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {signOutState.message}
          </p>
        ) : null}

        <dl className="grid gap-3">
          <div className="rounded-lg border border-cp-khaki bg-background/80 p-4">
            <dt className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
              Nama
            </dt>
            <dd className="mt-1 text-base font-semibold text-cp-pine">
              {state.data.profile.full_name}
            </dd>
          </div>
          <div className="rounded-lg border border-cp-khaki bg-background/80 p-4">
            <dt className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
              Gereja
            </dt>
            <dd className="mt-1 text-base font-semibold text-cp-pine">
              {churchName === null ? "Belum diisi" : churchName}
            </dd>
          </div>
          <div className="rounded-lg border border-cp-khaki bg-background/80 p-4">
            <dt className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
              Kelompok
            </dt>
            <dd className="mt-1 text-base font-semibold text-cp-pine">
              {state.data.group === null
                ? "Belum tersedia"
                : state.data.group.name}
            </dd>
          </div>
        </dl>

        <section className="rounded-lg border border-cp-khaki bg-background/80 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
            Social Media
          </h2>
          {socialItems.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Belum diisi</p>
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
