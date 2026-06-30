"use client";

import {
  AlertCircleIcon,
  ArrowLeft01Icon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { Html5Qrcode } from "html5-qrcode";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { addFriendByQrCode } from "@/lib/connect/connect-data";
import type { Database } from "@/lib/database.types";
import { getErrorMessage } from "@/lib/error-message";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type ScanStatus =
  | "initializing"
  | "scanning"
  | "processing"
  | "success"
  | "error";

interface ScannerState {
  readonly status: ScanStatus;
  readonly message: string | null;
  readonly friendName: string | null;
}

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

export default function ScanPage() {
  const router = useRouter();
  const [state, setState] = useState<ScannerState>({
    friendName: null,
    message: "Menyiapkan kamera...",
    status: "initializing",
  });

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isStoppingRef = useRef<boolean>(false);
  const scanContainerId = "qr-reader-viewport";

  const handleScanSuccess = useCallback(
    async (decodedText: string) => {
      setState((prev) => {
        if (prev.status === "processing" || prev.status === "success") {
          return prev;
        }
        return {
          friendName: null,
          message: "Menghubungkan pertemanan...",
          status: "processing",
        };
      });

      if (scannerRef.current && scannerRef.current.isScanning) {
        isStoppingRef.current = true;
        try {
          await scannerRef.current.stop();
        } catch (stopError) {
          console.error("Failed to stop scanner on success:", stopError);
        }
        isStoppingRef.current = false;
      }

      try {
        const supabase = createSupabaseBrowserClient();
        const user = await getCurrentUser(supabase);

        if (user === null) {
          router.replace("/login");
          return;
        }

        const result = await addFriendByQrCode(supabase, decodedText.trim());

        setState({
          friendName: result.fullName,
          message: `Berhasil terhubung dengan ${result.fullName}!`,
          status: "success",
        });

        window.setTimeout(() => {
          router.push("/connect");
        }, 2200);
      } catch (error: unknown) {
        setState({
          friendName: null,
          message: getErrorMessage(error),
          status: "error",
        });
      }
    },
    [router],
  );

  const startScanner = useCallback(async () => {
    try {
      setState({
        friendName: null,
        message: "Meminta izin kamera...",
        status: "initializing",
      });

      // Ensure browser environment
      if (typeof window === "undefined") {
        return;
      }

      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        throw new Error("Kamera tidak terdeteksi pada perangkat ini.");
      }

      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current = null;
      }

      const html5QrCode = new Html5Qrcode(scanContainerId);
      scannerRef.current = html5QrCode;

      setState({
        friendName: null,
        message: "Memulai kamera...",
        status: "initializing",
      });

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: (width, height) => {
            const size = Math.min(width, height) * 0.7;
            return {
              height: size,
              width: size,
            };
          },
        },
        handleScanSuccess,
        () => undefined,
      );

      setState({
        friendName: null,
        message: null,
        status: "scanning",
      });
    } catch (error: unknown) {
      setState({
        friendName: null,
        message: getErrorMessage(error),
        status: "error",
      });
    }
  }, [handleScanSuccess]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void startScanner();
    }, 100);

    return () => {
      window.clearTimeout(timeoutId);
      const scanner = scannerRef.current;
      if (scanner && scanner.isScanning && !isStoppingRef.current) {
        isStoppingRef.current = true;
        scanner
          .stop()
          .then(() => {
            isStoppingRef.current = false;
          })
          .catch((err) => {
            console.error("Cleanup stop scanner error:", err);
            isStoppingRef.current = false;
          });
      }
    };
  }, [startScanner]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col min-h-screen bg-cp-pine text-white">
      <header className="flex items-center gap-4 px-5 py-4 border-b border-white/10 bg-cp-pine">
        <Link
          className="flex p-2 rounded-full hover:bg-white/10 transition-colors"
          href="/connect"
          title="Kembali ke Teman Camp"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={24} strokeWidth={2.2} />
        </Link>
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-cp-khaki">
            Connect
          </p>
          <h1 className="font-heading text-2xl tracking-normal text-white">
            Scan QR Code
          </h1>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center p-6 relative">
        <div className="relative w-full aspect-square max-w-[320px] rounded-2xl overflow-hidden border border-white/20 bg-black/40">
          <div className="size-full" id={scanContainerId} />

          {state.status === "scanning" && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="absolute top-6 left-6 size-8 border-t-4 border-l-4 border-cp-amber rounded-tl-md" />
              <div className="absolute top-6 right-6 size-8 border-t-4 border-r-4 border-cp-amber rounded-tr-md" />
              <div className="absolute bottom-6 left-6 size-8 border-b-4 border-l-4 border-cp-amber rounded-bl-md" />
              <div className="absolute bottom-6 right-6 size-8 border-b-4 border-r-4 border-cp-amber rounded-br-md" />

              <div className="absolute w-[80%] h-0.5 bg-cp-amber/80 shadow-[0_0_8px_rgba(224,140,60,0.8)] animate-bounce" />
            </div>
          )}
        </div>

        <div className="mt-8 text-center px-4 max-w-sm">
          {state.status === "scanning" && (
            <>
              <p className="text-sm font-semibold text-cp-khaki">
                Arahkan kamera ke QR Code peserta lain
              </p>
              <p className="mt-2 text-xs text-white/60 leading-relaxed">
                Posisikan QR Code tepat di tengah layar. Koneksi pertemanan akan
                terjalin secara otomatis.
              </p>
            </>
          )}

          {state.status === "initializing" && (
            <div className="flex flex-col items-center gap-3">
              <div className="size-8 rounded-full border-2 border-cp-khaki border-t-transparent animate-spin" />
              <p className="text-sm text-cp-khaki">{state.message}</p>
            </div>
          )}

          {state.status === "processing" && (
            <div className="flex flex-col items-center gap-3">
              <div className="size-8 rounded-full border-2 border-cp-amber border-t-transparent animate-spin" />
              <p className="text-sm font-semibold text-cp-amber">
                {state.message}
              </p>
            </div>
          )}

          {state.status === "success" && (
            <div className="rounded-xl bg-cp-moss/20 border border-cp-moss p-4 text-center">
              <HugeiconsIcon
                className="mx-auto mb-2 text-cp-moss"
                icon={CheckmarkCircle02Icon}
                size={40}
                strokeWidth={2}
              />
              <p className="text-sm font-bold text-white">{state.message}</p>
              <p className="text-xs text-white/70 mt-1">Mengalihkan halaman...</p>
            </div>
          )}

          {state.status === "error" && (
            <div className="rounded-xl bg-destructive/20 border border-destructive p-4 text-center">
              <HugeiconsIcon
                className="mx-auto mb-2 text-destructive"
                icon={AlertCircleIcon}
                size={40}
                strokeWidth={2}
              />
              <p className="text-sm font-bold text-white">Gagal Menghubungkan</p>
              <p className="text-xs text-white/80 mt-1 leading-relaxed break-words">
                {state.message}
              </p>
              <Button
                className="mt-4 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold text-xs px-4"
                onClick={startScanner}
                type="button"
              >
                Coba Lagi
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
