import { toast } from "sonner";

/** Opens the device's share sheet when there is one; otherwise copies the link. */
export async function shareLink(path: string, title: string) {
  const url = window.location.origin + path;
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
      return;
    } catch (e) {
      if ((e as Error).name === "AbortError") return; // user closed the sheet
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  } catch {
    toast.error("Couldn't copy the link");
  }
}
