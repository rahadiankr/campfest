"use client";

import {
  Camera01Icon,
  Delete02Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  fetchFriendsList,
  type FriendProfile,
  unfriendUser,
} from "@/lib/connect/connect-data";
import type { Database } from "@/lib/database.types";
import { getErrorMessage } from "@/lib/error-message";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type ConnectState =
  | {
      readonly status: "loading";
    }
  | {
      readonly message: string;
      readonly status: "error";
    }
  | {
      readonly friends: readonly FriendProfile[];
      readonly status: "ready";
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

const getInitials = (fullName: string): string => {
  const words = fullName.trim().split(/\s+/);
  const firstWord = words[0];

  if (firstWord === undefined || firstWord.length === 0) {
    return "CP";
  }

  const secondWord = words[1];
  const firstInitial = firstWord.charAt(0);

  if (secondWord === undefined || secondWord.length === 0) {
    return firstInitial.toUpperCase();
  }

  return `${firstInitial}${secondWord.charAt(0)}`.toUpperCase();
};

export default function ConnectPage() {
  const router = useRouter();
  const [state, setState] = useState<ConnectState>({ status: "loading" });
  const [searchQuery, setSearchQuery] = useState("");
  const [unfriendingId, setUnfriendingId] = useState<string | null>(null);

  const loadConnectData = useCallback(async (): Promise<void> => {
    try {
      const supabase = createSupabaseBrowserClient();
      const user = await getCurrentUser(supabase);

      if (user === null) {
        router.replace("/login");
        return;
      }

      const friends = await fetchFriendsList(supabase, user.id);
      setState({
        friends,
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
      void loadConnectData();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadConnectData]);

  const handleUnfriend = async (friendId: string, friendName: string) => {
    const confirmed = window.confirm(`Hapus ${friendName} dari daftar teman?`);
    if (!confirmed) {
      return;
    }

    try {
      setUnfriendingId(friendId);
      const supabase = createSupabaseBrowserClient();
      const user = await getCurrentUser(supabase);

      if (user === null) {
        router.replace("/login");
        return;
      }

      await unfriendUser(supabase, user.id, friendId);

      // Update local state
      if (state.status === "ready") {
        setState({
          ...state,
          friends: state.friends.filter((f) => f.id !== friendId),
        });
      }
    } catch (error: unknown) {
      alert(`Gagal menghapus teman: ${getErrorMessage(error)}`);
    } finally {
      setUnfriendingId(null);
    }
  };

  if (state.status === "loading") {
    return (
      <div className="mx-auto w-full max-w-md px-5 py-8">
        <div className="rounded-lg border border-cp-khaki bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground animate-pulse">
            Memuat daftar teman...
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
              Connect
            </h1>
            <p className="mt-2 text-sm text-destructive">{state.message}</p>
          </div>
          <Button
            className="rounded-lg bg-cp-pine text-white hover:bg-cp-pine/95"
            onClick={() => {
              setState({ status: "loading" });
              void loadConnectData();
            }}
            type="button"
          >
            Coba Lagi
          </Button>
        </section>
      </div>
    );
  }

  const filteredFriends = state.friends.filter((friend) => {
    const query = searchQuery.toLowerCase().trim();
    if (query.length === 0) {
      return true;
    }

    const nameMatch = friend.fullName.toLowerCase().includes(query);
    const churchMatch = friend.churchName
      ? friend.churchName.toLowerCase().includes(query)
      : false;

    return nameMatch || churchMatch;
  });

  return (
    <div className="mx-auto w-full max-w-md px-5 py-8 relative min-h-[calc(100vh-6rem)]">
      <header className="mb-6">
        <p className="font-mono text-xs font-medium uppercase tracking-normal text-cp-moss">
          Koneksi Camp
        </p>
        <h1 className="mt-1 font-heading text-5xl leading-none tracking-normal text-cp-pine">
          Teman Camp
        </h1>
      </header>

      <div className="relative mb-6">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <HugeiconsIcon
            className="text-muted-foreground"
            icon={Search01Icon}
            size={20}
            strokeWidth={2}
          />
        </div>
        <input
          className="block w-full rounded-lg border border-cp-khaki bg-card py-2.5 pl-10 pr-4 text-sm text-cp-pine placeholder:text-muted-foreground/60 focus:border-cp-moss focus:outline-none focus:ring-1 focus:ring-cp-moss"
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari teman berdasarkan nama / gereja..."
          type="text"
          value={searchQuery}
        />
      </div>

      <div className="space-y-3">
        {state.friends.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-cp-khaki p-8 text-center bg-card/40">
            <p className="text-sm font-medium text-muted-foreground">
              Belum ada teman terhubung.
            </p>
            <p className="mt-1 text-xs text-muted-foreground/80">
              Gunakan tombol di pojok kanan bawah untuk scan QR code teman camp!
            </p>
          </div>
        ) : filteredFriends.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            Teman tidak ditemukan.
          </p>
        ) : (
          filteredFriends.map((friend) => {
            const initials = getInitials(friend.fullName);
            const hasAvatar =
              friend.avatarUrl !== null && friend.avatarUrl.trim().length > 0;

            return (
              <div
                className="flex items-center justify-between gap-3 rounded-lg border border-cp-khaki bg-card p-4 transition-colors hover:border-cp-moss/30"
                key={friend.id}
              >
                <Link
                  className="flex flex-1 items-center gap-3 min-w-0"
                  href={`/connect/${friend.id}`}
                >
                  <div
                    className="flex size-11 shrink-0 items-center justify-center rounded-full border border-cp-khaki bg-cp-moss bg-cover bg-center font-heading text-lg leading-none text-white"
                    style={
                      hasAvatar
                        ? { backgroundImage: `url("${friend.avatarUrl}")` }
                        : undefined
                    }
                  >
                    {hasAvatar ? null : initials}
                  </div>

                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-cp-pine">
                      {friend.fullName}
                    </h3>
                    <p className="truncate text-xs text-muted-foreground mt-0.5">
                      {friend.churchName || "Gereja belum diisi"}
                    </p>
                    {friend.groupName && (
                      <span
                        className="inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white mt-1.5"
                        style={{
                          backgroundColor: friend.groupColor || "var(--cp-moss)",
                        }}
                      >
                        {friend.groupName}
                      </span>
                    )}
                  </div>
                </Link>

                <button
                  className="p-2 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                  disabled={unfriendingId === friend.id}
                  onClick={() => handleUnfriend(friend.id, friend.fullName)}
                  title="Hapus Pertemanan"
                  type="button"
                >
                  <HugeiconsIcon icon={Delete02Icon} size={20} strokeWidth={2} />
                </button>
              </div>
            );
          })
        )}
      </div>

      <Link
        className="fixed bottom-24 right-5 z-40 flex size-14 items-center justify-center rounded-full bg-cp-amber text-cp-pine shadow-lg hover:bg-cp-amber/90 transition-all hover:scale-105"
        href="/connect/scan"
        title="Scan QR Code Teman"
      >
        <HugeiconsIcon icon={Camera01Icon} size={24} strokeWidth={2} />
      </Link>
    </div>
  );
}
