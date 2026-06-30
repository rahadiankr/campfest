"use client";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import type { Database } from "@/lib/database.types";
import { getErrorMessage } from "@/lib/error-message";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import {
  fetchDevotionals,
  type DevotionalRow,
} from "@/lib/bacaan/bacaan-data";

type RenunganListState =
  | { readonly status: "loading" }
  | { readonly message: string; readonly status: "error" }
  | { readonly items: readonly DevotionalRow[]; readonly status: "ready" };

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
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

export default function RenunganListPage() {
  const router = useRouter();
  const [state, setState] = useState<RenunganListState>({ status: "loading" });

  const loadDevotionals = useCallback(async (): Promise<void> => {
    try {
      const supabase = createSupabaseBrowserClient();
      const user = await getCurrentUser(supabase);

      if (user === null) {
        router.replace("/login");
        return;
      }

      const items = await fetchDevotionals(supabase);
      setState({ items, status: "ready" });
    } catch (error: unknown) {
      setState({ message: getErrorMessage(error), status: "error" });
    }
  }, [router]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDevotionals();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadDevotionals]);

  if (state.status === "loading") {
    return (
      <div className="mx-auto w-full max-w-md px-5 py-8">
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
      <div className="mx-auto w-full max-w-md px-5 py-8">
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
              void loadDevotionals();
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
      {/* Header */}
      <header className="mb-6">
        <p className="font-mono text-xs font-medium uppercase tracking-normal text-cp-moss">
          Bacaan Camp
        </p>
        <h1 className="mt-1 font-heading text-5xl leading-none tracking-normal text-cp-pine">
          Renungan
        </h1>
      </header>

      {/* Tab switcher */}
      <div className="mb-6 flex rounded-lg border border-cp-khaki bg-card/50 p-1">
        <span className="flex-1 rounded-md bg-card py-2.5 text-center text-xs font-semibold text-cp-amber shadow-sm">
          Renungan
        </span>
        <Link
          className="flex-1 rounded-md py-2.5 text-center text-xs font-semibold text-muted-foreground hover:text-cp-pine transition-colors"
          href="/bacaan/lagu"
        >
          Lagu Pujian
        </Link>
      </div>

      {/* List */}
      <div className="space-y-3">
        {state.items.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-cp-khaki bg-card/40 p-8 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              Belum ada renungan tersedia.
            </p>
          </div>
        ) : (
          state.items.map((item) => (
            <Link
              className="block rounded-lg border border-cp-khaki bg-card p-4 transition-colors hover:border-cp-moss/30"
              href={`/bacaan/renungan/${item.id}`}
              key={item.id}
            >
              <p className="font-mono text-[11px] font-semibold text-cp-amber">
                {formatDate(item.date)}
              </p>
              <h2 className="mt-1 text-base font-semibold leading-tight text-cp-pine">
                {item.title}
              </h2>
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {item.content}
              </p>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
