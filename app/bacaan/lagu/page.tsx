"use client";

import { ArrowRight01Icon, YoutubeIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { fetchSongs, type SongRow } from "@/lib/bacaan/bacaan-data";
import type { Database } from "@/lib/database.types";
import { getErrorMessage } from "@/lib/error-message";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type LaguListState =
  | { readonly status: "loading" }
  | { readonly message: string; readonly status: "error" }
  | { readonly items: readonly SongRow[]; readonly status: "ready" };

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

export default function LaguListPage() {
  const router = useRouter();
  const [state, setState] = useState<LaguListState>({ status: "loading" });

  const loadSongs = useCallback(async (): Promise<void> => {
    try {
      const supabase = createSupabaseBrowserClient();
      const user = await getCurrentUser(supabase);

      if (user === null) {
        router.replace("/login");
        return;
      }

      const items = await fetchSongs(supabase);
      setState({ items, status: "ready" });
    } catch (error: unknown) {
      setState({ message: getErrorMessage(error), status: "error" });
    }
  }, [router]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadSongs();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadSongs]);

  if (state.status === "loading") {
    return (
      <div className="mx-auto w-full max-w-md px-5 py-8">
        <div className="rounded-lg border border-cp-khaki bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground animate-pulse">
            Memuat lagu pujian...
          </p>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mx-auto w-full max-w-md px-5 py-8">
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
              void loadSongs();
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
    <div className="mx-auto w-full max-w-md px-5 py-8">
      <header className="mb-6">
        <p className="font-mono text-xs font-medium uppercase tracking-normal text-cp-moss">
          Bacaan Camp
        </p>
        <h1 className="mt-1 font-heading text-5xl leading-none tracking-normal text-cp-pine">
          Lagu Pujian
        </h1>
      </header>

      <div className="mb-6 flex rounded-lg border border-cp-khaki bg-card/50 p-1">
        <Link
          className="flex-1 rounded-md py-2.5 text-center text-xs font-semibold text-muted-foreground hover:text-cp-pine transition-colors"
          href="/bacaan/renungan"
        >
          Renungan
        </Link>
        <span className="flex-1 rounded-md bg-card py-2.5 text-center text-xs font-semibold text-cp-amber shadow-sm">
          Lagu Pujian
        </span>
      </div>

      <div className="space-y-3">
        {state.items.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-cp-khaki bg-card/40 p-8 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              Belum ada lagu pujian tersedia.
            </p>
          </div>
        ) : (
          state.items.map((item) => (
            <Link
              className="flex items-center justify-between gap-3 rounded-lg border border-cp-khaki bg-card p-4 transition-colors hover:border-cp-moss/30"
              href={`/bacaan/lagu/${item.id}`}
              key={item.id}
            >
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-cp-pine">
                  {item.title}
                </h2>
                {item.youtube_url !== null &&
                  item.youtube_url.trim().length > 0 && (
                    <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-cp-amber">
                      <HugeiconsIcon
                        icon={YoutubeIcon}
                        size={14}
                        strokeWidth={1.8}
                      />
                      Ada video
                    </p>
                  )}
              </div>
              <HugeiconsIcon
                className="shrink-0 text-muted-foreground"
                icon={ArrowRight01Icon}
                size={20}
                strokeWidth={2}
              />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
