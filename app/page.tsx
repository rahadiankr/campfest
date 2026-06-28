"use client";

import {
  BookOpen01Icon,
  CallIcon,
  Calendar03Icon,
  ExternalLinkIcon,
  GalleryHorizontalIcon,
  UserEdit01Icon,
  UserMultipleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import type { Database } from "@/lib/database.types";
import { getErrorMessage } from "@/lib/error-message";
import { buildCountdownState } from "@/lib/home/countdown";
import { fetchHomePageData } from "@/lib/home/home-data";
import type {
  CountdownState,
  EventInfoRow,
  HomePageData,
} from "@/lib/home/types";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase";

const socialBuzzUrl = process.env.NEXT_PUBLIC_SOCIAL_BUZZ_URL;
const galeryUrl = process.env.NEXT_PUBLIC_GALERY_URL;

type HomeState =
  | {
      readonly status: "loading";
    }
  | {
      readonly message: string;
      readonly status: "error";
    }
  | {
      readonly data: HomePageData;
      readonly socialBuzzHref: string | null;
      readonly galeryHref: string | null;
      readonly status: "ready";
    };

interface ShortcutItem {
  readonly description: string;
  readonly href: string;
  readonly icon: IconSvgElement;
  readonly label: string;
  readonly locksWhilePending: boolean;
}

interface ContactItem {
  readonly href: string | null;
  readonly label: string;
  readonly phone: string;
}

const internalShortcuts: readonly ShortcutItem[] = [
  {
    description: "Rundown, peraturan, dan kontak panitia.",
    href: "/event",
    icon: Calendar03Icon,
    label: "Acara",
    locksWhilePending: true,
  },
  {
    description: "Scan QR dan lihat daftar teman camp.",
    href: "/connect",
    icon: UserMultipleIcon,
    label: "Connect",
    locksWhilePending: true,
  },
  {
    description: "Renungan harian dan lagu pujian.",
    href: "/bacaan/renungan",
    icon: BookOpen01Icon,
    label: "Bacaan",
    locksWhilePending: false,
  },
  {
    description: "Lengkapi nama, gereja, foto, dan social media.",
    href: "/profile/edit",
    icon: UserEdit01Icon,
    label: "Edit Profile",
    locksWhilePending: false,
  },
];

const pendingMenuLockedMessage = "Aktif saat acara dimulai.";

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

const readExternalUrl = (url: string | undefined): string | null => {
  if (typeof url !== "string" || url.trim().length === 0) {
    return null;
  }
  const trimmedUrl = url.trim();
  try {
    new URL(trimmedUrl);
  } catch {
    throw new Error(
      `Invalid URL value: ${trimmedUrl}. Expected an absolute URL.`,
    );
  }

  return trimmedUrl;
};

const getGroupBadgeStyle = (
  groupColor: string | null,
): CSSProperties | undefined => {
  if (groupColor === null || groupColor.trim().length === 0) {
    return undefined;
  }

  return {
    backgroundColor: groupColor,
  };
};

const getCountdownMetricLabel = (countdown: CountdownState): string => {
  if (countdown.tone === "pending") {
    return "hari lagi";
  }

  if (countdown.tone === "active") {
    return "hari ini";
  }

  return "";
};

const buildPhoneHref = (phone: string): string | null => {
  const digits = phone.replace(/\D/g, "");
  const whatsappNumber = digits.startsWith("0")
    ? `62${digits.slice(1)}`
    : digits;

  if (whatsappNumber.length < 8) {
    return null;
  }

  return `https://wa.me/${whatsappNumber}`;
};

const buildContactItems = (
  contacts: readonly EventInfoRow[],
): readonly ContactItem[] =>
  contacts.map((contact, index) => {
    const label = contact.title?.trim();
    const phone = contact.content?.trim() ?? "";

    return {
      href: buildPhoneHref(phone),
      label:
        label === undefined || label.length === 0
          ? `Kontak ${index + 1}`
          : label,
      phone,
    };
  });

export default function Home() {
  const router = useRouter();
  const [state, setState] = useState<HomeState>({ status: "loading" });

  const loadHome = useCallback(async (): Promise<void> => {
    try {
      const supabase = createSupabaseBrowserClient();
      const user = await getCurrentUser(supabase);

      if (user === null) {
        router.replace("/login");
        return;
      }

      const socialBuzzHref = readExternalUrl(socialBuzzUrl);
      const galeryHref = readExternalUrl(galeryUrl);

      const data = await fetchHomePageData(supabase, user.id, new Date());
      setState({
        data,
        socialBuzzHref,
        galeryHref,
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
      void loadHome();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadHome]);

  if (state.status === "loading") {
    return (
      <div className="mx-auto w-full max-w-5xl px-5 py-8">
        <div className="rounded-lg border border-cp-khaki bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">
            Memuat home...
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
              Home
            </h1>
            <p className="mt-2 text-sm text-destructive">{state.message}</p>
          </div>
          <Button
            className="rounded-lg"
            onClick={() => {
              setState({ status: "loading" });
              void loadHome();
            }}
            type="button"
          >
            Coba Lagi
          </Button>
        </section>
      </div>
    );
  }

  return (
    <HomeContent
      data={state.data}
      socialBuzzHref={state.socialBuzzHref}
      galeryHref={state.galeryHref}
    />
  );
}

function HomeContent({
  data,
  socialBuzzHref,
  galeryHref,
}: {
  readonly data: HomePageData;
  readonly socialBuzzHref: string | null;
  readonly galeryHref: string | null;
}) {
  const countdown = useMemo(
    () => buildCountdownState(data.eventSettings, new Date()),
    [data.eventSettings],
  );
  const group = data.profileData.group;
  const groupColor = group?.color ?? null;
  const isPending = countdown.tone === "pending";
  const kirimSalamDisabledReason = getKirimSalamDisabledReason(
    isPending,
    data.kirimSalamSettings.is_enabled,
    socialBuzzHref,
  );
  const galeryDisabledReason = getExternalMenuDisabledReason(
    isPending,
    galeryHref,
  );

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-5 px-5 py-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-xs font-medium uppercase tracking-normal text-cp-moss">
            {data.eventSettings.event_name}
          </p>
          <h1 className="mt-1 font-heading text-5xl leading-none tracking-normal text-cp-pine sm:text-6xl">
            Halo, {data.profileData.profile.full_name}!
          </h1>
        </div>

        <div
          className="inline-flex min-h-10 w-fit items-center rounded-full border border-cp-khaki bg-card px-4 py-2 text-sm font-semibold text-cp-pine"
          style={getGroupBadgeStyle(groupColor)}
        >
          <span className={groupColor === null ? "" : "text-white"}>
            {group === null ? "Kelompok belum tersedia" : group.name}
          </span>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
        <CountdownCard
          countdown={countdown}
          eventName={data.eventSettings.event_name}
        />

        <div className="grid grid-cols-2 gap-3">
          {internalShortcuts.map((shortcut) => (
            <ShortcutCard
              description={shortcut.description}
              disabledReason={
                isPending && shortcut.locksWhilePending
                  ? pendingMenuLockedMessage
                  : null
              }
              href={shortcut.href}
              icon={shortcut.icon}
              isExternal={false}
              key={shortcut.href}
              label={shortcut.label}
              tone="default"
            />
          ))}

          <ShortcutCard
            description="Buka halaman SocialBuzz."
            disabledReason={kirimSalamDisabledReason}
            href={socialBuzzHref}
            icon={ExternalLinkIcon}
            isExternal={true}
            label="Kirim Salam"
            tone="highlight"
          />

          <ShortcutCard
            description="Buka halaman Galeri Foto."
            disabledReason={galeryDisabledReason}
            href={galeryHref}
            icon={GalleryHorizontalIcon}
            isExternal={true}
            label="Galeri Foto"
            tone="default"
          />
        </div>
      </section>

      {data.devotional === null ? null : (
        <section className="rounded-lg border border-cp-khaki bg-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-xs font-medium uppercase tracking-normal text-cp-moss">
                Sorotan Hari Ini
              </p>
              <h2 className="mt-1 text-xl font-semibold text-cp-pine">
                {data.devotional.title}
              </h2>
            </div>
            <Button
              asChild
              className="h-10 rounded-lg border-cp-moss"
              variant="outline"
            >
              <Link href="/bacaan/renungan">Baca</Link>
            </Button>
          </div>

          <p className="mt-4 line-clamp-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            {data.devotional.content}
          </p>
        </section>
      )}

      <CommitteeContactCard contacts={buildContactItems(data.contacts)} />
    </div>
  );
}

const getExternalMenuDisabledReason = (
  isPending: boolean,
  href: string | null,
): string | null => {
  if (isPending) {
    return pendingMenuLockedMessage;
  }

  if (href === null) {
    return "Foto sedang proses upload.";
  }

  return null;
};

const getKirimSalamDisabledReason = (
  isPending: boolean,
  isEnabledByAdmin: boolean,
  href: string | null,
): string | null => {
  if (isPending) {
    return pendingMenuLockedMessage;
  }

  if (!isEnabledByAdmin) {
    return "Dinonaktifkan panitia.";
  }

  if (href === null) {
    return "URL belum diatur.";
  }

  return null;
};

function ShortcutCard({
  description,
  disabledReason,
  href,
  icon,
  isExternal,
  label,
  tone,
}: {
  readonly description: string;
  readonly disabledReason: string | null;
  readonly href: string | null;
  readonly icon: IconSvgElement;
  readonly isExternal: boolean;
  readonly label: string;
  readonly tone: "default" | "highlight";
}) {
  const isDisabled = disabledReason !== null || href === null;
  const iconClassName = tone === "highlight" ? "text-cp-amber" : "text-cp-moss";
  const cardClassName = cn(
    "group flex min-h-32 flex-col justify-between rounded-lg bg-card p-4 transition-colors",
    tone === "highlight"
      ? "border-2 border-cp-amber"
      : "border border-cp-khaki",
    isDisabled
      ? "cursor-not-allowed opacity-60"
      : "hover:border-cp-moss hover:bg-white",
  );
  const content = (
    <>
      <HugeiconsIcon
        className={iconClassName}
        icon={icon}
        size={28}
        strokeWidth={1.8}
      />
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-cp-pine">{label}</h2>
        <p className="text-xs leading-5 text-muted-foreground">
          {disabledReason ?? description}
        </p>
      </div>
    </>
  );

  if (isDisabled) {
    return (
      <div aria-disabled="true" className={cardClassName}>
        {content}
      </div>
    );
  }

  if (isExternal === true) {
    return (
      <a className={cardClassName} href={href} rel="noreferrer" target="_blank">
        {content}
      </a>
    );
  }

  return (
    <Link className={cardClassName} href={href}>
      {content}
    </Link>
  );
}

function CommitteeContactCard({
  contacts,
}: {
  readonly contacts: readonly ContactItem[];
}) {
  return (
    <section
      className="rounded-lg border border-cp-khaki bg-card p-5"
      id="kontak-panitia"
    >
      <div className="space-y-1">
        <p className="font-mono text-xs font-medium uppercase tracking-normal text-cp-moss">
          Kontak Panitia
        </p>
        <h2 className="text-xl font-semibold text-cp-pine">
          Butuh bantuan cepat?
        </h2>
      </div>

      {contacts.length === 0 ? (
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Belum ada nomor panitia. Isi 2 row `event_info` dengan `type =
          contact`.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {contacts.map((contact) => (
            <div
              className="rounded-lg border border-cp-khaki bg-background p-4"
              key={`${contact.label}-${contact.phone}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cp-moss/10 text-cp-moss">
                  <HugeiconsIcon icon={CallIcon} size={22} strokeWidth={1.8} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-cp-pine">
                    {contact.label}
                  </p>
                  {contact.href === null ? (
                    <p className="mt-1 break-words font-mono text-sm text-muted-foreground">
                      {contact.phone.length === 0
                        ? "Nomor belum diisi"
                        : contact.phone}
                    </p>
                  ) : (
                    <a
                      className="mt-1 block break-words font-mono text-sm font-semibold text-cp-moss underline-offset-4 hover:underline"
                      href={contact.href}
                    >
                      {contact.phone}
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function CountdownCard({
  countdown,
  eventName,
}: {
  readonly countdown: CountdownState;
  readonly eventName: string;
}) {
  const metricLabel = getCountdownMetricLabel(countdown);

  return (
    <section className="flex min-h-64 flex-col justify-between rounded-lg bg-cp-pine p-6 text-white">
      <div className="space-y-2">
        <p className="font-mono text-xs font-medium uppercase tracking-normal text-cp-khaki">
          Countdown
        </p>
        <h2 className="text-xl font-semibold">{eventName}</h2>
      </div>

      <div>
        <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
          <span
            className={cn(
              "font-heading text-7xl leading-none tracking-normal text-cp-amber",
              countdown.tone === "complete" || countdown.tone === "unconfigured"
                ? "text-5xl"
                : "sm:text-8xl",
            )}
          >
            {countdown.metric}
          </span>
          {metricLabel.length === 0 ? null : (
            <span className="pb-2 text-sm font-semibold uppercase tracking-normal text-cp-khaki">
              {metricLabel}
            </span>
          )}
        </div>
        <p className="mt-3 text-base font-medium text-cp-parchment">
          {countdown.detail}
        </p>
        {countdown.tone === "unconfigured" ? (
          <p className="mt-2 text-xs leading-5 text-cp-khaki">
            Isi `start_date` dan `end_date` pada row `id = 1`.
          </p>
        ) : null}
      </div>
    </section>
  );
}
