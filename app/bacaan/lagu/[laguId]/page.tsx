"use client";

import { ArrowLeft01Icon, YoutubeIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { fetchSongById, type SongRow } from "@/lib/bacaan/bacaan-data";
import type { Database } from "@/lib/database.types";
import { getErrorMessage } from "@/lib/error-message";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type DetailState =
  | { readonly status: "loading" }
  | { readonly message: string; readonly status: "error" }
  | { readonly item: SongRow; readonly status: "ready" };

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

/**
 * Extracts a YouTube video ID from various URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 */
const extractYoutubeVideoId = (url: string): string | null => {
  try {
    const parsed = new URL(url.trim());
    const hostname = parsed.hostname.replace("www.", "");

    if (hostname === "youtube.com") {
      if (parsed.pathname.startsWith("/embed/")) {
        return parsed.pathname.split("/embed/")[1]?.split("/")[0] ?? null;
      }
      return parsed.searchParams.get("v");
    }

    if (hostname === "youtu.be") {
      const id = parsed.pathname.slice(1).split("/")[0];
      return id && id.length > 0 ? id : null;
    }

    return null;
  } catch {
    return null;
  }
};

interface LaguDetailPageProps {
  readonly params: Promise<{
    readonly laguId: string;
  }>;
}

export default function LaguDetailPage({ params }: LaguDetailPageProps) {
  const router = useRouter();
  const { laguId } = use(params);

  const [state, setState] = useState<DetailState>({ status: "loading" });

  const loadSong = useCallback(async (): Promise<void> => {
    try {
      const supabase = createSupabaseBrowserClient();
      const user = await getCurrentUser(supabase);

      if (user === null) {
        router.replace("/login");
        return;
      }

      const item = await fetchSongById(supabase, laguId);
      setState({ item, status: "ready" });
    } catch (error: unknown) {
      setState({ message: getErrorMessage(error), status: "error" });
    }
  }, [router, laguId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadSong();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadSong]);

  if (state.status === "loading") {
    return (
      <div className="mx-auto w-full max-w-2xl px-5 py-8">
        <div className="rounded-lg border border-cp-khaki bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground animate-pulse">
            Memuat lagu...
          </p>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mx-auto w-full max-w-2xl px-5 py-8">
        <section className="space-y-4 rounded-lg border border-destructive/30 bg-card p-6">
          <div>
            <h1 className="font-heading text-5xl leading-none tracking-normal text-cp-pine">
              Lagu Pujian
            </h1>
            <p className="mt-2 text-sm text-destructive">{state.message}</p>
          </div>
          <Button
            className="rounded-lg bg-cp-pine text-white hover:bg-cp-pine/95"
            onClick={() => {
              setState({ status: "loading" });
              void loadSong();
            }}
            type="button"
          >
            Coba Lagi
          </Button>
        </section>
      </div>
    );
  }

  const youtubeUrl = state.item.youtube_url?.trim() ?? null;
  const videoId =
    youtubeUrl !== null && youtubeUrl.length > 0
      ? extractYoutubeVideoId(youtubeUrl)
      : null;

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-8">
      <Link
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-cp-moss hover:text-cp-pine transition-colors"
        href="/bacaan/lagu"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={2.2} />
        Kembali
      </Link>

      <article className="rounded-lg border border-cp-khaki bg-card p-6 sm:p-8">
        <header className="mb-6 border-b border-cp-khaki pb-6">
          <p className="font-mono text-xs font-semibold uppercase text-cp-moss">
            Lagu Pujian
          </p>
          <h1 className="mt-2 font-heading text-5xl leading-none tracking-normal text-cp-pine sm:text-6xl">
            {state.item.title}
          </h1>
        </header>

        {videoId !== null ? (
          <div className="mb-6 overflow-hidden rounded-lg border border-cp-khaki">
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 size-full"
                src={`https://www.youtube.com/embed/${videoId}`}
                title={`${state.item.title} — YouTube`}
              />
            </div>
          </div>
        ) : youtubeUrl !== null && youtubeUrl.length > 0 ? (
          <div className="mb-6">
            <a
              className="inline-flex items-center gap-2 rounded-lg border border-cp-khaki bg-background px-4 py-3 text-sm font-semibold text-cp-pine hover:border-cp-moss/30 transition-colors"
              href={youtubeUrl}
              rel="noreferrer"
              target="_blank"
            >
              <HugeiconsIcon
                className="text-destructive"
                icon={YoutubeIcon}
                size={20}
                strokeWidth={1.8}
              />
              Tonton di YouTube
            </a>
          </div>
        ) : null}

        <div className="font-reader text-base leading-[1.8] text-cp-pine/90 whitespace-pre-line">
          {state.item.lyrics}
        </div>
      </article>
    </div>
  );
}
