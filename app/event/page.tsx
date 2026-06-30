"use client";

import { CallIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import type { Database } from "@/lib/database.types";
import { getErrorMessage } from "@/lib/error-message";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type EventInfoRow = Database["public"]["Tables"]["event_info"]["Row"];

type ActiveTab = "rundown" | "rules" | "contact";

type EventState =
  | {
      readonly status: "loading";
    }
  | {
      readonly message: string;
      readonly status: "error";
    }
  | {
      readonly items: readonly EventInfoRow[];
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

export default function EventPage() {
  const router = useRouter();
  const [state, setState] = useState<EventState>({ status: "loading" });
  const [activeTab, setActiveTab] = useState<ActiveTab>("rundown");

  const loadEventInfo = useCallback(async (): Promise<void> => {
    try {
      const supabase = createSupabaseBrowserClient();
      const user = await getCurrentUser(supabase);

      if (user === null) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("event_info")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error !== null) {
        throw new Error(error.message);
      }

      setState({
        items: data || [],
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
      void loadEventInfo();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadEventInfo]);

  if (state.status === "loading") {
    return (
      <div className="mx-auto w-full max-w-md px-5 py-8">
        <div className="rounded-lg border border-cp-khaki bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground animate-pulse">
            Memuat informasi acara...
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
              Informasi Acara
            </h1>
            <p className="mt-2 text-sm text-destructive">{state.message}</p>
          </div>
          <Button
            className="rounded-lg bg-cp-pine text-white hover:bg-cp-pine/95"
            onClick={() => {
              setState({ status: "loading" });
              void loadEventInfo();
            }}
            type="button"
          >
            Coba Lagi
          </Button>
        </section>
      </div>
    );
  }

  const rundownItems = state.items.filter((item) => item.type === "rundown");
  const rulesItems = state.items.filter((item) => item.type === "rules");
  const contactItems = state.items.filter((item) => item.type === "contact");

  return (
    <div className="mx-auto w-full max-w-md px-5 py-8">
      {/* Header */}
      <header className="mb-6">
        <p className="font-mono text-xs font-medium uppercase tracking-normal text-cp-moss">
          Informasi Utama
        </p>
        <h1 className="mt-1 font-heading text-5xl leading-none tracking-normal text-cp-pine">
          Acara Camp
        </h1>
      </header>

      {/* Tab Switcher */}
      <div className="mb-6 flex border-b border-cp-khaki bg-card/50 rounded-t-lg p-1">
        {(["rundown", "rules", "contact"] as const).map((tab) => {
          const isActive = activeTab === tab;
          let label = "Rundown";
          if (tab === "rules") {
            label = "Peraturan";
          } else if (tab === "contact") {
            label = "Kontak Panitia";
          }

          return (
            <button
              className={`flex-1 py-3 text-xs font-semibold rounded-md transition-all ${
                isActive
                  ? "bg-card text-cp-amber shadow-sm"
                  : "text-muted-foreground hover:text-cp-pine"
              }`}
              key={tab}
              onClick={() => setActiveTab(tab)}
              type="button"
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === "rundown" && (
          <div className="space-y-4">
            {rundownItems.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                Rundown belum tersedia.
              </p>
            ) : (
              rundownItems.map((item) => (
                <div
                  className="rounded-lg border border-cp-khaki bg-card p-4 border-l-4 border-l-cp-moss transition-colors hover:border-cp-moss/40 hover:border-l-cp-moss"
                  key={item.id}
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[11px] font-bold text-cp-amber">
                      {item.title || "Waktu belum diatur"}
                    </span>
                    <h3 className="text-base font-semibold text-cp-pine leading-tight">
                      {item.content || "Nama sesi belum diatur"}
                    </h3>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "rules" && (
          <div className="space-y-4">
            {rulesItems.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                Peraturan belum tersedia.
              </p>
            ) : (
              rulesItems.map((item, idx) => (
                <div
                  className="rounded-lg border border-cp-khaki bg-card p-4 transition-colors hover:border-cp-moss/30"
                  key={item.id}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-cp-moss/10 font-mono text-xs font-bold text-cp-moss">
                      {idx + 1}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-cp-pine">
                        {item.title || "Peraturan"}
                      </h3>
                      {item.content && (
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground whitespace-pre-line">
                          {item.content}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "contact" && (
          <div className="space-y-4">
            {contactItems.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                Belum ada kontak panitia terdaftar.
              </p>
            ) : (
              contactItems.map((item) => {
                const phone = item.content?.trim() || "";
                const cleanPhone = phone.replace(/\D/g, "");
                const waNumber = cleanPhone.startsWith("0")
                  ? `62${cleanPhone.slice(1)}`
                  : cleanPhone;
                const waUrl = waNumber ? `https://wa.me/${waNumber}` : null;

                return (
                  <div
                    className="rounded-lg border border-cp-khaki bg-card p-4 transition-colors hover:border-cp-moss/30"
                    key={item.id}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cp-pine/10 text-cp-pine">
                          <HugeiconsIcon icon={CallIcon} size={20} strokeWidth={1.8} />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-cp-pine">
                            {item.title || "Panitia"}
                          </h3>
                          <p className="font-mono text-xs text-muted-foreground mt-0.5">
                            {phone || "Nomor telepon belum diisi"}
                          </p>
                        </div>
                      </div>
                      {waUrl && (
                        <Button
                          asChild
                          className="h-9 px-3 rounded-lg border-cp-moss bg-transparent hover:bg-cp-moss/10 text-cp-moss"
                          variant="outline"
                        >
                          <a href={waUrl} rel="noreferrer" target="_blank">
                            WhatsApp
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
