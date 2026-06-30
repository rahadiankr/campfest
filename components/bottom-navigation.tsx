"use client";

import {
  BookOpen01Icon,
  Calendar03Icon,
  Home01Icon,
  UserIcon,
  UserMultipleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import type { Database } from "@/lib/database.types";
import { buildCountdownState } from "@/lib/home/countdown";
import { fetchEventSettings } from "@/lib/home/home-data";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface BottomNavigationItem {
  readonly activePrefix: string;
  readonly href: string;
  readonly icon: IconSvgElement;
  readonly label: string;
  readonly locksWhilePending: boolean;
}

type BottomNavigationState =
  | {
      readonly status: "loading";
    }
  | {
      readonly isEventPending: boolean;
      readonly status: "ready";
    }
  | {
      readonly message: string;
      readonly status: "error";
    };

const navigationItems: readonly BottomNavigationItem[] = [
  {
    activePrefix: "/",
    href: "/",
    icon: Home01Icon,
    label: "Home",
    locksWhilePending: false,
  },
  {
    activePrefix: "/event",
    href: "/event",
    icon: Calendar03Icon,
    label: "Acara",
    locksWhilePending: true,
  },
  {
    activePrefix: "/connect",
    href: "/connect",
    icon: UserMultipleIcon,
    label: "Connect",
    locksWhilePending: true,
  },
  {
    activePrefix: "/bacaan",
    href: "/bacaan/renungan",
    icon: BookOpen01Icon,
    label: "Bacaan",
    locksWhilePending: false,
  },
  {
    activePrefix: "/profile",
    href: "/profile",
    icon: UserIcon,
    label: "Profile",
    locksWhilePending: false,
  },
];

const pendingMenuLockedMessage = "Aktif saat acara dimulai.";

const isActivePath = (pathname: string, activePrefix: string): boolean => {
  if (activePrefix === "/") {
    return pathname === "/";
  }

  return pathname === activePrefix || pathname.startsWith(`${activePrefix}/`);
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

const readIsEventPending = async (
  supabase: SupabaseClient<Database>,
): Promise<boolean> => {
  const user = await getCurrentUser(supabase);

  if (user === null) {
    return false;
  }

  const eventSettings = await fetchEventSettings(supabase);
  const countdown = buildCountdownState(eventSettings, new Date());

  return countdown.tone === "pending";
};

const getDisabledReason = (
  item: BottomNavigationItem,
  state: BottomNavigationState,
): string | null => {
  if (!item.locksWhilePending) {
    return null;
  }

  if (state.status === "ready" && state.isEventPending) {
    return pendingMenuLockedMessage;
  }

  return null;
};

export function BottomNavigation() {
  const pathname = usePathname();
  const [state, setState] = useState<BottomNavigationState>({
    status: "loading",
  });

  const loadNavigationState = useCallback(async (): Promise<void> => {
    try {
      const supabase = createSupabaseBrowserClient();
      const isEventPending = await readIsEventPending(supabase);

      setState({
        isEventPending,
        status: "ready",
      });
    } catch (error: unknown) {
      setState({
        message:
          error instanceof Error
            ? error.message
            : "Unknown navigation state error.",
        status: "error",
      });
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadNavigationState();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadNavigationState]);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2">
      <div className="mx-auto grid max-w-lg grid-cols-5 gap-1 rounded-lg border border-cp-khaki bg-card/95 p-1.5 backdrop-blur">
        {navigationItems.map((item) => {
          const isActive = isActivePath(pathname, item.activePrefix);
          const disabledReason = getDisabledReason(item, state);
          const itemClassName = cn(
            "flex min-h-14 flex-col items-center justify-center gap-1 rounded-md px-1 text-xs font-semibold transition-colors",
            disabledReason !== null
              ? "cursor-not-allowed text-muted-foreground/60"
              : isActive
                ? "bg-cp-pine text-cp-amber"
                : "text-muted-foreground hover:bg-secondary hover:text-cp-pine",
          );

          if (disabledReason !== null) {
            return (
              <div
                aria-disabled="true"
                className={itemClassName}
                key={item.href}
                title={disabledReason}
              >
                <HugeiconsIcon icon={item.icon} size={22} strokeWidth={1.8} />
                <span>{item.label}</span>
              </div>
            );
          }

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={itemClassName}
              href={item.href}
              key={item.href}
              title={state.status === "error" ? state.message : undefined}
            >
              <HugeiconsIcon icon={item.icon} size={22} strokeWidth={1.8} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
