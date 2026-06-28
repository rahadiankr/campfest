"use client";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import { CampIdBadge } from "@/components/camp-id-badge";
import { Button } from "@/components/ui/button";
import type { Database } from "@/lib/database.types";
import { getErrorMessage } from "@/lib/error-message";
import { compressAvatarImage } from "@/lib/profile/avatar-image";
import {
  fetchEditableProfileData,
  updateProfile,
  uploadProfileAvatar,
} from "@/lib/profile/profile-data";
import {
  readSocialMediaLinks,
} from "@/lib/profile/social-media";
import type {
  ChurchRow,
  EditableProfileData,
  ProfileUpdateInput,
} from "@/lib/profile/types";
import { createSupabaseBrowserClient } from "@/lib/supabase";

const otherChurchValue = "__other_church__";

type ChurchSelectionMode = "listed" | "other";

type EditState =
  | {
      readonly status: "loading";
    }
  | {
      readonly message: string;
      readonly status: "error";
    }
  | {
      readonly data: EditableProfileData;
      readonly status: "ready";
      readonly userId: string;
    };

type FormMessage =
  | {
      readonly kind: "error";
      readonly text: string;
    }
  | {
      readonly kind: "success";
      readonly text: string;
    };

interface ProfileFormValues {
  readonly avatarFile: File | null;
  readonly churchOther: string;
  readonly churchSelectionMode: ChurchSelectionMode;
  readonly fullName: string;
  readonly instagram: string;
  readonly selectedChurchId: string | null;
  readonly tiktok: string;
}

class ProfileFormError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProfileFormError";
  }
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

const createInitialFormValues = (
  data: EditableProfileData,
): ProfileFormValues => {
  const socialMedia = readSocialMediaLinks(data.profile.social_media);
  const churchOther = data.profile.church_other?.trim() ?? "";
  const churchSelectionMode: ChurchSelectionMode =
    churchOther.length > 0 ? "other" : "listed";

  return {
    avatarFile: null,
    churchOther,
    churchSelectionMode,
    fullName: data.profile.full_name,
    instagram: socialMedia.instagram,
    selectedChurchId: data.profile.church_id,
    tiktok: socialMedia.tiktok,
  };
};

const getSelectedChurchValue = (form: ProfileFormValues): string => {
  if (form.churchSelectionMode === "other") {
    return otherChurchValue;
  }

  return form.selectedChurchId ?? "";
};

const buildUpdateInput = (
  form: ProfileFormValues,
  avatarUrl: string | null,
): ProfileUpdateInput => {
  const fullName = form.fullName.trim();

  if (fullName.length === 0) {
    throw new ProfileFormError("Nama lengkap wajib diisi.");
  }

  if (form.churchSelectionMode === "other") {
    const churchOther = form.churchOther.trim();

    if (churchOther.length === 0) {
      throw new ProfileFormError("Nama gereja lainnya wajib diisi.");
    }

    return {
      avatarUrl,
      churchId: null,
      churchOther,
      fullName,
      socialMedia: {
        instagram: form.instagram.trim(),
        tiktok: form.tiktok.trim(),
      },
    };
  }

  return {
    avatarUrl,
    churchId: form.selectedChurchId,
    churchOther: null,
    fullName,
    socialMedia: {
      instagram: form.instagram.trim(),
      tiktok: form.tiktok.trim(),
    },
  };
};

const getPreviewChurch = (
  churches: readonly ChurchRow[],
  form: ProfileFormValues,
): string | null => {
  if (form.churchSelectionMode === "other") {
    const churchOther = form.churchOther.trim();

    return churchOther.length === 0 ? null : churchOther;
  }

  if (form.selectedChurchId === null) {
    return null;
  }

  const selectedChurch = churches.find(
    (church) => church.id === form.selectedChurchId,
  );

  return selectedChurch?.name ?? null;
};

export default function ProfileEditPage() {
  const router = useRouter();
  const [state, setState] = useState<EditState>({ status: "loading" });
  const [form, setForm] = useState<ProfileFormValues | null>(null);
  const [message, setMessage] = useState<FormMessage | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadProfile = useCallback(async (): Promise<void> => {
    let supabase: SupabaseClient<Database>;

    try {
      supabase = createSupabaseBrowserClient();
      const user = await getCurrentUser(supabase);

      if (user === null) {
        router.replace("/login");
        return;
      }

      const data = await fetchEditableProfileData(supabase, user.id);
      setForm(createInitialFormValues(data));
      setState({
        data,
        status: "ready",
        userId: user.id,
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
      void loadProfile();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadProfile]);

  const handleChurchChange = (
    event: ChangeEvent<HTMLSelectElement>,
  ): void => {
    const value = event.currentTarget.value;

    setForm((currentForm) => {
      if (currentForm === null) {
        return currentForm;
      }

      if (value === otherChurchValue) {
        return {
          ...currentForm,
          churchSelectionMode: "other",
          selectedChurchId: null,
        };
      }

      return {
        ...currentForm,
        churchSelectionMode: "listed",
        selectedChurchId: value.length === 0 ? null : value,
      };
    });
  };

  const handleAvatarChange = (
    event: ChangeEvent<HTMLInputElement>,
  ): void => {
    const file = event.currentTarget.files?.[0] ?? null;

    setForm((currentForm) => {
      if (currentForm === null) {
        return currentForm;
      }

      return {
        ...currentForm,
        avatarFile: file,
      };
    });
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    setMessage(null);

    if (state.status !== "ready" || form === null) {
      setMessage({
        kind: "error",
        text: "Profile belum siap untuk disimpan.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const avatarUrl =
        form.avatarFile === null
          ? state.data.profile.avatar_url
          : await uploadProfileAvatar(
              supabase,
              state.userId,
              await compressAvatarImage(form.avatarFile),
            );
      const updateInput = buildUpdateInput(form, avatarUrl);

      await updateProfile(supabase, state.userId, updateInput);

      setMessage({
        kind: "success",
        text: "Profile berhasil disimpan.",
      });
      router.push("/profile");
    } catch (error: unknown) {
      setMessage({
        kind: "error",
        text: getErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (state.status === "loading" || form === null) {
    return (
      <div className="mx-auto w-full max-w-5xl px-5 py-8">
        <div className="rounded-lg border border-cp-khaki bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">
            Memuat form profile...
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
              Edit Profile
            </h1>
            <p className="mt-2 text-sm text-destructive">{state.message}</p>
          </div>
          <Button
            className="rounded-lg"
            onClick={() => {
              setState({ status: "loading" });
              setMessage(null);
              void loadProfile();
            }}
            type="button"
          >
            Coba Lagi
          </Button>
        </section>
      </div>
    );
  }

  const previewChurch = getPreviewChurch(state.data.churches, form);
  const avatarFileName = form.avatarFile?.name ?? "Belum pilih file baru";

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-5 px-5 py-8 lg:grid-cols-[minmax(0,24rem)_1fr]">
      <CampIdBadge
        avatarUrl={state.data.profile.avatar_url}
        churchName={previewChurch}
        fullName={form.fullName.trim().length === 0 ? "Nama Peserta" : form.fullName}
        groupColor={state.data.group?.color ?? null}
        groupName={state.data.group?.name ?? null}
        qrCode={state.data.profile.qr_code}
      />

      <section className="rounded-lg border border-cp-khaki bg-card p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-mono text-xs font-medium uppercase tracking-normal text-cp-moss">
              Profile Peserta
            </p>
            <h1 className="mt-1 font-heading text-5xl leading-none tracking-normal text-cp-pine">
              Edit Profile
            </h1>
          </div>
          <Button asChild className="h-10 rounded-lg" variant="outline">
            <Link href="/profile">Batal</Link>
          </Button>
        </div>

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-cp-pine">
              Nama Lengkap
            </span>
            <input
              autoComplete="name"
              className="h-12 w-full rounded-lg border border-input bg-background px-3 text-base outline-none transition focus:border-cp-amber focus:ring-2 focus:ring-cp-amber/30"
              onChange={(event) =>
                setForm({
                  ...form,
                  fullName: event.currentTarget.value,
                })
              }
              required
              type="text"
              value={form.fullName}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-cp-pine">Gereja</span>
            <select
              className="h-12 w-full rounded-lg border border-input bg-background px-3 text-base outline-none transition focus:border-cp-amber focus:ring-2 focus:ring-cp-amber/30"
              onChange={handleChurchChange}
              value={getSelectedChurchValue(form)}
            >
              <option value="">Belum pilih gereja</option>
              {state.data.churches.map((church) => (
                <option key={church.id} value={church.id}>
                  {church.name}
                </option>
              ))}
              <option value={otherChurchValue}>Lainnya</option>
            </select>
          </label>

          {form.churchSelectionMode === "other" ? (
            <label className="block space-y-2">
              <span className="text-sm font-medium text-cp-pine">
                Nama Gereja Lainnya
              </span>
              <input
                className="h-12 w-full rounded-lg border border-input bg-background px-3 text-base outline-none transition focus:border-cp-amber focus:ring-2 focus:ring-cp-amber/30"
                onChange={(event) =>
                  setForm({
                    ...form,
                    churchOther: event.currentTarget.value,
                  })
                }
                required
                type="text"
                value={form.churchOther}
              />
            </label>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-cp-pine">
                Instagram
              </span>
              <input
                className="h-12 w-full rounded-lg border border-input bg-background px-3 text-base outline-none transition focus:border-cp-amber focus:ring-2 focus:ring-cp-amber/30"
                onChange={(event) =>
                  setForm({
                    ...form,
                    instagram: event.currentTarget.value,
                  })
                }
                placeholder="@username"
                type="text"
                value={form.instagram}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-cp-pine">TikTok</span>
              <input
                className="h-12 w-full rounded-lg border border-input bg-background px-3 text-base outline-none transition focus:border-cp-amber focus:ring-2 focus:ring-cp-amber/30"
                onChange={(event) =>
                  setForm({
                    ...form,
                    tiktok: event.currentTarget.value,
                  })
                }
                placeholder="@username"
                type="text"
                value={form.tiktok}
              />
            </label>
          </div>

          <label className="block space-y-2 rounded-lg border border-cp-khaki bg-background p-4">
            <span className="block text-sm font-medium text-cp-pine">
              Avatar
            </span>
            <input
              accept="image/jpeg,image/png,image/webp"
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-cp-moss file:px-3 file:py-2 file:text-sm file:font-semibold file:text-card"
              onChange={handleAvatarChange}
              type="file"
            />
            <span className="block font-mono text-xs text-muted-foreground">
              {avatarFileName}
            </span>
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
            className="h-12 rounded-lg bg-cp-amber text-base text-cp-pine hover:bg-cp-amber/90"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Menyimpan..." : "Simpan Profile"}
          </Button>
        </form>
      </section>
    </div>
  );
}
