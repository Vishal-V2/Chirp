"use client";

import { useId, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserAvatar } from "@/components/user-avatar";
import type { ProfileFieldsFragment } from "@/generated/gql/graphql";
import { IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/storage";
import { cn } from "@/lib/utils";

const NAME_MAX = 50;
const BIO_MAX = 160;

type ImageField = "avatarUrl" | "bannerUrl";

/** Form state. Image URLs may be local previews (blob:) until saved. */
type ProfileEdits = {
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
};

/** What the dialog hands back on Save. New images come as files to upload. */
export type ProfileSave = {
  displayName: string;
  bio: string;
  /** Existing image to keep, or null to remove (ignored when a new file is given). */
  avatarUrl: string | null;
  bannerUrl: string | null;
  avatarFile?: File;
  bannerFile?: File;
};

function fromUser(user: ProfileFieldsFragment): ProfileEdits {
  return {
    displayName: user.displayName,
    bio: user.bio ?? "",
    avatarUrl: user.avatarUrl,
    bannerUrl: user.bannerUrl,
  };
}

/** Bordered field with label and live character counter (shown on focus). */
function Field({
  label,
  value,
  max,
  error,
  multiline,
  onChange,
}: {
  label: string;
  value: string;
  max: number;
  error?: string;
  multiline?: boolean;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const over = value.length > max;
  const inputClass =
    "w-full resize-none bg-transparent pb-1 text-[17px] outline-none";

  return (
    <div>
      <div
        className={cn(
          "group rounded-md border px-2 pt-1.5 transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary",
          (error || over) &&
            "border-destructive focus-within:border-destructive focus-within:ring-destructive",
        )}
      >
        <div
          className={cn(
            "flex justify-between text-[13px] text-muted-foreground group-focus-within:text-primary",
            (error || over) &&
              "text-destructive group-focus-within:text-destructive",
          )}
        >
          <label htmlFor={id}>{label}</label>
          <span className="hidden tabular-nums group-focus-within:inline">
            {value.length} / {max}
          </span>
        </div>
        {multiline ? (
          <textarea
            id={id}
            value={value}
            rows={3}
            onChange={(e) => onChange(e.target.value)}
            className={cn(inputClass, "field-sizing-content min-h-20")}
            aria-invalid={Boolean(error) || over}
          />
        ) : (
          <input
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={inputClass}
            aria-invalid={Boolean(error) || over}
          />
        )}
      </div>
      {error && (
        <p className="mt-1 px-2 text-[13px] text-destructive">{error}</p>
      )}
    </div>
  );
}

/** Round translucent button laid over an image (camera / remove). */
function OverlayButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex size-11 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/40"
    >
      {children}
    </button>
  );
}

export function EditProfileDialog({
  user,
  onSave,
}: {
  user: ProfileFieldsFragment;
  /** Upload + save. Resolve with an error message to keep the dialog open. */
  onSave: (edits: ProfileSave) => Promise<string | void>;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ProfileEdits>(() => fromUser(user));
  const [files, setFiles] = useState<Partial<Record<ImageField, File>>>({});
  const [imageError, setImageError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const avatarInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);

  const name = form.displayName.trim();
  const nameError = name.length === 0 ? "Name can't be blank" : undefined;
  const valid =
    !nameError && name.length <= NAME_MAX && (form.bio ?? "").length <= BIO_MAX;
  const initial = fromUser(user);
  const changed = (Object.keys(initial) as (keyof ProfileEdits)[]).some(
    (k) => (form[k] ?? "") !== (initial[k] ?? ""),
  );

  function handleOpenChange(next: boolean) {
    // Every time the dialog opens, start from the saved profile (discarding unsaved edits).
    if (saving) return; // don't close mid-save
    if (next) {
      setForm(fromUser(user));
      setFiles({});
      setImageError(undefined);
      setSaveError(undefined);
    }
    setOpen(next);
  }

  function removeImage(field: ImageField) {
    setForm((f) => ({ ...f, [field]: null }));
    setFiles((f) => ({ ...f, [field]: undefined }));
  }

  function pickImage(field: ImageField, file?: File) {
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) {
      setImageError("Please choose a JPG, PNG, WebP or GIF image.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError("Images must be 5 MB or smaller.");
      return;
    }
    setImageError(undefined);
    // Preview locally now; it's uploaded when you press Save.
    setForm((f) => ({ ...f, [field]: URL.createObjectURL(file) }));
    setFiles((f) => ({ ...f, [field]: file }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    setSaveError(undefined);
    const keep = (field: ImageField) =>
      files[field]
        ? null
        : form[field]?.startsWith("blob:")
          ? null
          : form[field];
    try {
      const failure = await onSave({
        displayName: name,
        bio: form.bio.trim(),
        avatarUrl: keep("avatarUrl"),
        bannerUrl: keep("bannerUrl"),
        avatarFile: files.avatarUrl,
        bannerFile: files.bannerUrl,
      });
      if (failure) setSaveError(failure);
      else setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => handleOpenChange(true)}
        className="pressable h-9 rounded-full border px-4 text-sm font-bold hover:bg-muted"
      >
        Edit profile
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="flex flex-col gap-0 overflow-hidden p-0 text-base max-sm:inset-0 max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none sm:max-h-[90vh] sm:max-w-[600px] sm:rounded-2xl"
        >
          <form
            onSubmit={handleSubmit}
            className="flex min-h-0 flex-1 flex-col"
          >
            <header className="flex h-[53px] shrink-0 items-center gap-6 px-4">
              <DialogClose
                render={
                  <button
                    type="button"
                    aria-label="Close"
                    className="-ml-2 rounded-full p-2 transition-colors hover:bg-muted"
                  />
                }
              >
                <X className="size-5" />
              </DialogClose>
              <DialogTitle className="flex-1 font-heading text-xl font-bold tracking-tight">
                Edit profile
              </DialogTitle>
              <DialogDescription className="sr-only">
                Update your name, bio, profile photo and banner.
              </DialogDescription>
              <button
                type="submit"
                disabled={!valid || !changed || saving}
                className="h-8 rounded-full bg-foreground px-4 text-sm font-bold text-background transition-colors hover:bg-foreground/85 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </header>
            {saveError && (
              <p
                role="alert"
                className="mx-4 mb-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {saveError}
              </p>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto pb-6">
              {/* Banner */}
              <div className="relative aspect-[3/1] bg-gradient-to-br from-primary/60 via-primary/30 to-muted">
                {form.bannerUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.bannerUrl}
                    alt=""
                    className="size-full object-cover"
                  />
                )}
                <div className="absolute inset-0 flex items-center justify-center gap-4 bg-black/20">
                  <OverlayButton
                    label="Add banner photo"
                    onClick={() => bannerInput.current?.click()}
                  >
                    <Camera className="size-5" />
                  </OverlayButton>
                  {form.bannerUrl && (
                    <OverlayButton
                      label="Remove banner photo"
                      onClick={() => removeImage("bannerUrl")}
                    >
                      <X className="size-5" />
                    </OverlayButton>
                  )}
                </div>
              </div>

              {/* Avatar */}
              <div className="px-4">
                <div className="relative -mt-12 w-fit">
                  <UserAvatar
                    name={name || user.displayName}
                    username={user.username}
                    src={form.avatarUrl ?? undefined}
                    className="size-28 border-4 border-background after:hidden"
                    fallbackClassName="text-3xl"
                  />
                  <div className="absolute inset-1 flex items-center justify-center gap-2 rounded-full bg-black/20">
                    <OverlayButton
                      label="Add profile photo"
                      onClick={() => avatarInput.current?.click()}
                    >
                      <Camera className="size-5" />
                    </OverlayButton>
                  </div>
                </div>
                {form.avatarUrl && (
                  <button
                    type="button"
                    onClick={() => removeImage("avatarUrl")}
                    className="mt-2 text-sm text-muted-foreground hover:text-destructive hover:underline"
                  >
                    Remove photo
                  </button>
                )}
                {imageError && (
                  <p role="alert" className="mt-2 text-sm text-destructive">
                    {imageError}
                  </p>
                )}
              </div>

              <input
                ref={avatarInput}
                type="file"
                accept={IMAGE_TYPES.join(",")}
                hidden
                onChange={(e) => {
                  pickImage("avatarUrl", e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <input
                ref={bannerInput}
                type="file"
                accept={IMAGE_TYPES.join(",")}
                hidden
                onChange={(e) => {
                  pickImage("bannerUrl", e.target.files?.[0]);
                  e.target.value = "";
                }}
              />

              <div className="mt-4 flex flex-col gap-6 px-4">
                <Field
                  label="Name"
                  value={form.displayName}
                  max={NAME_MAX}
                  error={nameError}
                  onChange={(displayName) =>
                    setForm((f) => ({ ...f, displayName }))
                  }
                />
                <Field
                  label="Bio"
                  value={form.bio ?? ""}
                  max={BIO_MAX}
                  multiline
                  onChange={(bio) => setForm((f) => ({ ...f, bio }))}
                />
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
