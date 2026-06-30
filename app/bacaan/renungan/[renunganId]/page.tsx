"use client";

import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  fetchDevotionalById,
  type DevotionalRow,
} from "@/lib/bacaan/bacaan-data";
import type { Database } from "@/lib/database.types";
import { getErrorMessage } from "@/lib/error-message";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type DetailState =
  | { readonly status: "loading" }
  | { readonly message: string; readonly status: "error" }
  | { readonly item: DevotionalRow; readonly status: "ready" };

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

const formatDate = (dateStr: string | null): string => {
  if (dateStr === null) {
    return "Tanggal belum diisi";
  }

  try {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

interface RenunganDetailPageProps {
  readonly params: Promise<{
    readonly renunganId: string;
  }>;
}

export default function RenunganDetailPage({ params }: RenunganDetailPageProps) {
  const router = useRouter();
  const { renunganId } = use(params);

  const [state, setState] = useState<DetailState>({ status: "loading" });

  const loadDevotional = useCallback(async (): Promise<void> => {
    try {
      const supabase = createSupabaseBrowserClient();
      const user = await getCurrentUser(supabase);

      if (user === null) {
        router.replace("/login");
        return;
      }

      const item = await fetchDevotionalById(supabase, renunganId);
      setState({ item, status: "ready" });
    } catch (error: unknown) {
      setState({ message: getErrorMessage(error), status: "error" });
    }
  }, [router, renunganId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDevotional();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadDevotional]);

  if (state.status === "loading") {
    return (
      <div className="mx-auto w-full max-w-2xl px-5 py-8">
        <div className="rounded-lg border border-cp-khaki bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground animate-pulse">
            Memuat renungan...
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
              Renungan
            </h1>
            <p className="mt-2 text-sm text-destructive">{state.message}</p>
          </div>
          <Button
            className="rounded-lg bg-cp-pine text-white hover:bg-cp-pine/95"
            onClick={() => {
              setState({ status: "loading" });
              void loadDevotional();
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
    <div className="mx-auto w-full max-w-2xl px-5 py-8">
      <Link
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-cp-moss hover:text-cp-pine transition-colors"
        href="/bacaan/renungan"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={2.2} />
        Kembali
      </Link>

      <article className="rounded-lg border border-cp-khaki bg-card p-6 sm:p-8">
        <header className="mb-6 border-b border-cp-khaki pb-6">
          <p className="font-mono text-xs font-semibold text-cp-amber">
            {formatDate(state.item.date)}
          </p>
          <h1 className="mt-2 font-heading text-5xl leading-none tracking-normal text-cp-pine sm:text-6xl">
            {state.item.title}
          </h1>
        </header>

        <div className="font-reader text-base leading-[1.8] text-cp-pine/90 whitespace-pre-line">
          {state.item.content}
        </div>
      </article>
    </div>
  );
}
