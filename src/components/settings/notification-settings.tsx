"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  playChirp,
  popupPermission,
  popupsEnabled,
  setPopupsEnabled,
  setSoundEnabled,
  soundEnabled,
} from "@/lib/ping";
import { cn } from "@/lib/utils";

/** Settings → Notifications: chirp sound and system pop-ups (this browser only). */
export function NotificationSettings() {
  // Read from this browser after mount (not available on the server).
  const [sound, setSound] = useState<boolean | null>(null);
  const [popups, setPopups] = useState<boolean | null>(null);
  const [permission, setPermission] = useState<string>("default");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read browser-only settings once
    setSound(soundEnabled());
    setPopups(popupsEnabled());
    setPermission(popupPermission());
  }, []);

  async function togglePopups() {
    const on = await setPopupsEnabled(!popups);
    setPopups(on);
    setPermission(popupPermission());
    if (!popups && !on) {
      toast.error(
        popupPermission() === "unsupported"
          ? "This browser doesn't support notification pop-ups."
          : "Notifications are blocked. Allow them in your browser's site settings, then try again.",
      );
    }
  }

  return (
    <section className="pb-2">
      <h2 className="px-4 pt-4 pb-1 font-heading text-xl font-bold tracking-tight">
        Notifications
      </h2>
      <p className="px-4 pb-2 text-[13px] text-muted-foreground">
        For likes, replies, reposts, quotes, follows, mentions and messages.
        Saved in this browser only.
      </p>
      <Toggle
        label="Chirp sound"
        description="Play a short chirp when something new arrives."
        checked={sound}
        onChange={() => {
          const next = !sound;
          setSoundEnabled(next);
          setSound(next);
          if (next) playChirp(); // a preview of the sound
        }}
      />
      <Toggle
        label="Pop-up notifications"
        description={
          permission === "denied"
            ? "Blocked by your browser. Allow notifications for this site in its settings."
            : permission === "unsupported"
              ? "Not supported in this browser."
              : "Your device's own notification, when Chirp isn't the window you're looking at."
        }
        checked={popups}
        disabled={permission === "unsupported"}
        onChange={() => void togglePopups()}
      />
    </section>
  );
}

function Toggle({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean | null;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{label}</span>
        <span className="block text-[13px] text-muted-foreground">
          {description}
        </span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={Boolean(checked)}
        aria-label={label}
        disabled={disabled || checked === null}
        onClick={onChange}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-muted-foreground/30",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform",
            checked && "translate-x-5",
          )}
        />
      </button>
    </label>
  );
}
