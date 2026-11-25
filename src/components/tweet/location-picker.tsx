"use client";

import { useState } from "react";
import { LocateFixed, Loader2 } from "lucide-react";
import { motion } from "motion/react";

export const MAX_LOCATION = 60;

/**
 * Turns the device's position into a place name like "Pune, India".
 * Uses BigDataCloud's free browser reverse-geocoding (no key). Coordinates go
 * only to that lookup; Chirp itself only ever stores the place name.
 */
async function currentPlace(): Promise<string> {
  if (!("geolocation" in navigator))
    throw new Error("Your browser can't share its location.");
  const position = await new Promise<GeolocationPosition>((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10_000,
      maximumAge: 10 * 60_000,
    }),
  ).catch((e: GeolocationPositionError) => {
    throw new Error(
      e.code === e.PERMISSION_DENIED
        ? "Location access was blocked. Allow it in your browser, or type a place."
        : "Couldn't find your location. Type a place instead.",
    );
  });
  const { latitude, longitude } = position.coords;
  const res = await fetch(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
  );
  if (!res.ok)
    throw new Error("Couldn't look up your location. Type a place instead.");
  const data: {
    city?: string;
    locality?: string;
    principalSubdivision?: string;
    countryName?: string;
  } = await res.json();
  const place = data.city || data.locality || data.principalSubdivision;
  return [place, data.countryName]
    .filter(Boolean)
    .join(", ")
    .slice(0, MAX_LOCATION);
}

/** Type a place, or fill it in from the device's location. */
export function LocationPicker({
  value,
  onChange,
  onDone,
}: {
  value: string;
  onChange: (location: string) => void;
  onDone: () => void;
}) {
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string>();

  async function fillFromDevice() {
    setLocating(true);
    setError(undefined);
    try {
      onChange(await currentPlace());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLocating(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="mb-2 overflow-hidden rounded-2xl border p-3"
    >
      <div className="flex gap-2">
        <input
          autoFocus
          value={value}
          maxLength={MAX_LOCATION}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onDone();
            }
          }}
          placeholder="Add a place, like Pune, India"
          aria-label="Location"
          className="h-10 min-w-0 flex-1 rounded-md border bg-background px-3 text-[15px] outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
        <button
          type="button"
          onClick={onDone}
          className="h-10 rounded-full bg-foreground px-4 text-sm font-bold text-background hover:bg-foreground/85"
        >
          Done
        </button>
      </div>
      <button
        type="button"
        onClick={() => void fillFromDevice()}
        disabled={locating}
        className="mt-2 flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-medium text-primary hover:bg-primary/10 disabled:opacity-60"
      >
        {locating ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <LocateFixed className="size-4" />
        )}
        {locating ? "Finding you…" : "Use my current location"}
      </button>
      <p className="mt-1 px-2 text-xs text-muted-foreground">
        Only the place name is saved, never your exact position.
      </p>
      {error && <p className="mt-1 px-2 text-xs text-destructive">{error}</p>}
    </motion.div>
  );
}
