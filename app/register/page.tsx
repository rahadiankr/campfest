"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { validateRegisterFormInput } from "@/lib/auth-validation";
import type { Database } from "@/lib/database.types";
import { getErrorMessage } from "@/lib/error-message";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type FormMessage =
  | {
      readonly kind: "error";
      readonly text: string;
    }
  | {
      readonly kind: "success";
      readonly text: string;
    };

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<FormMessage | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    setMessage(null);

    const validationError = validateRegisterFormInput({
      email,
      fullName,
      password,
    });

    if (validationError !== null) {
      setMessage({ kind: "error", text: validationError });
      return;
    }

    setIsSubmitting(true);

    let supabase: SupabaseClient<Database>;

    try {
      supabase = createSupabaseBrowserClient();
    } catch (error: unknown) {
      setIsSubmitting(false);
      setMessage({
        kind: "error",
        text: getErrorMessage(error),
      });
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      options: {
        data: {
          full_name: fullName.trim(),
        },
      },
      password,
    });

    setIsSubmitting(false);

    if (error !== null) {
      setMessage({
        kind: "error",
        text: `Gagal daftar: ${error.message}`,
      });
      return;
    }

    if (data.session !== null) {
      router.push("/profile");
      return;
    }

    setMessage({
      kind: "success",
      text: "Registrasi berhasil. Cek email jika konfirmasi akun aktif, lalu masuk.",
    });
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-md items-center px-5 py-8">
      <section className="w-full rounded-lg border border-cp-khaki bg-card p-6">
        <div className="space-y-2">
          <p className="font-mono text-xs font-medium uppercase tracking-normal text-cp-moss">
            Peserta Baru
          </p>
          <h1 className="font-heading text-5xl leading-none tracking-normal text-cp-pine">
            Daftar
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Buat akun peserta dengan nama lengkap yang akan tampil di camp ID.
          </p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-cp-pine">
              Nama Lengkap
            </span>
            <input
              autoComplete="name"
              className="h-12 w-full rounded-lg border border-input bg-background px-3 text-base outline-none transition focus:border-cp-amber focus:ring-2 focus:ring-cp-amber/30"
              onChange={(event) => setFullName(event.currentTarget.value)}
              required
              type="text"
              value={fullName}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-cp-pine">Email</span>
            <input
              autoComplete="email"
              className="h-12 w-full rounded-lg border border-input bg-background px-3 text-base outline-none transition focus:border-cp-amber focus:ring-2 focus:ring-cp-amber/30"
              inputMode="email"
              onChange={(event) => setEmail(event.currentTarget.value)}
              required
              type="email"
              value={email}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-cp-pine">Password</span>
            <input
              autoComplete="new-password"
              className="h-12 w-full rounded-lg border border-input bg-background px-3 text-base outline-none transition focus:border-cp-amber focus:ring-2 focus:ring-cp-amber/30"
              minLength={8}
              onChange={(event) => setPassword(event.currentTarget.value)}
              required
              type="password"
              value={password}
            />
          </label>

          {message !== null ? (
            <p
              className={
                message.kind === "error"
                  ? "rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  : "rounded-lg border border-cp-moss/30 bg-cp-moss/10 px-3 py-2 text-sm text-cp-moss"
              }
            >
              {message.text}
            </p>
          ) : null}

          <Button
            className="h-12 w-full rounded-lg bg-cp-amber text-base text-cp-pine hover:bg-cp-amber/90"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Memproses..." : "Daftar"}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Sudah punya akun?{" "}
          <Link className="font-medium text-cp-moss underline" href="/login">
            Masuk
          </Link>
        </p>
      </section>
    </div>
  );
}
