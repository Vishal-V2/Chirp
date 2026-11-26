"use client";

/*
 * The notification "ping": a short chirp sound and the device's own
 * notification pop-up. Preferences live in this browser (localStorage);
 * every storage call is guarded because it can be unavailable.
 */

const SOUND_KEY = "chirp:ping-sound"; // "off" disables; on by default
const POPUP_KEY = "chirp:ping-popups"; // "on" enables; needs permission too
const PINGED_PREFIX = "chirp:pinged:";

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage unavailable: the setting just won't stick */
  }
}

export const soundEnabled = () => read(SOUND_KEY) !== "off";
export const setSoundEnabled = (on: boolean) =>
  write(SOUND_KEY, on ? null : "off");

/** Can this browser show system pop-ups at all? */
export const popupsSupported = () =>
  typeof window !== "undefined" && "Notification" in window;

export const popupPermission = (): NotificationPermission | "unsupported" =>
  popupsSupported() ? Notification.permission : "unsupported";

export const popupsEnabled = () =>
  read(POPUP_KEY) === "on" && popupPermission() === "granted";

/** Turns pop-ups on (asking the browser for permission) or off. */
export async function setPopupsEnabled(on: boolean) {
  if (!on) {
    write(POPUP_KEY, null);
    return false;
  }
  if (!popupsSupported()) return false;
  // Ask unless already granted (if the person blocked it, the browser
  // answers "denied" straight away without prompting).
  const permission =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();
  write(POPUP_KEY, permission === "granted" ? "on" : null);
  return permission === "granted";
}

/**
 * With Chirp open in several tabs, only the first tab to see an event pings.
 * Returns false if another tab already claimed it.
 */
export function claimPing(id: string) {
  const key = PINGED_PREFIX + id;
  if (read(key)) return false;
  write(key, String(Date.now()));
  // Forget claims older than an hour.
  try {
    const hourAgo = Date.now() - 3_600_000;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith(PINGED_PREFIX) && Number(read(k)) < hourAgo) {
        localStorage.removeItem(k);
      }
    }
  } catch {
    /* ignore */
  }
  return true;
}

let audio: AudioContext | null = null;

/**
 * Browsers only allow sound after the person has interacted with the page,
 * so the audio engine is woken up on the first tap or key press.
 */
export function primeAudio() {
  const wake = () => {
    try {
      audio ??= new AudioContext();
      void audio.resume();
    } catch {
      /* no Web Audio */
    }
  };
  window.addEventListener("pointerdown", wake, { once: true });
  window.addEventListener("keydown", wake, { once: true });
}

/** A short two-note bird chirp, made on the fly (no sound file). */
export function playChirp() {
  if (!soundEnabled()) return;
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") void audio.resume();
    const now = audio.currentTime;
    for (const [start, from, to] of [
      [0, 1900, 2700],
      [0.11, 2300, 3200],
    ] as const) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(from, now + start);
      osc.frequency.exponentialRampToValueAtTime(to, now + start + 0.07);
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(0.12, now + start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + 0.09);
      osc.connect(gain).connect(audio.destination);
      osc.start(now + start);
      osc.stop(now + start + 0.1);
    }
  } catch {
    /* no Web Audio: stay silent */
  }
}

let registration: Promise<ServiceWorkerRegistration | null> | null = null;

/** The tiny service worker that lets pop-ups work on Android and open Chirp when clicked. */
function serviceWorker() {
  registration ??=
    "serviceWorker" in navigator
      ? navigator.serviceWorker.register("/sw.js").catch(() => null)
      : Promise.resolve(null);
  return registration;
}

/** Shows the device's notification pop-up (when enabled and permitted). */
export async function showPopup({
  title,
  body,
  url,
  tag,
}: {
  title: string;
  body?: string;
  url: string;
  tag: string;
}) {
  if (!popupsEnabled()) return;
  const options: NotificationOptions = {
    body,
    tag, // a newer pop-up with the same tag replaces the older one
    icon: "/favicon.ico",
    data: { url },
  };
  try {
    const reg = await serviceWorker();
    if (reg) {
      await reg.showNotification(title, options);
      return;
    }
    const n = new Notification(title, options);
    n.onclick = () => {
      window.focus();
      window.location.assign(url);
    };
  } catch {
    /* pop-ups not available here */
  }
}

/** Starts the service worker early, so the first pop-up isn't delayed. */
export function preparePopups() {
  if (popupsEnabled()) void serviceWorker();
}
