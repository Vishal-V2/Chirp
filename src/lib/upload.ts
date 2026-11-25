import { createClient } from "@/lib/supabase/client";
import { PROFILE_IMAGES_BUCKET } from "@/lib/storage";

/**
 * Uploads a profile image from the browser to Supabase Storage, into the
 * user's own folder (Storage rules reject any other folder). Returns its public URL.
 */
export async function uploadProfileImage(
  userId: string,
  kind: "avatar" | "banner",
  file: File,
): Promise<string> {
  const supabase = createClient();
  const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "img";
  // Unique name per upload so browsers never show a stale cached image.
  const path = `${userId}/${kind}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from(PROFILE_IMAGES_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });
  if (error) throw new Error(`Couldn't upload your ${kind}: ${error.message}`);
  return supabase.storage.from(PROFILE_IMAGES_BUCKET).getPublicUrl(path).data
    .publicUrl;
}

/** Best-effort removal of a replaced image (only files in our bucket). */
export async function deleteProfileImage(url: string | null | undefined) {
  const marker = `/storage/v1/object/public/${PROFILE_IMAGES_BUCKET}/`;
  if (!url?.includes(marker)) return;
  const path = url.split(marker)[1];
  await createClient().storage.from(PROFILE_IMAGES_BUCKET).remove([path]);
}
