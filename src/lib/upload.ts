import { createClient } from "@/lib/supabase/client";
import {
  CHIRP_MEDIA_BUCKET,
  IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  PROFILE_IMAGES_BUCKET,
} from "@/lib/storage";

const MAX_DIMENSION = 2048;

/** Checks a picked/pasted file; returns an error message, or null if it's usable. */
export function checkImage(file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type))
    return "Please choose a JPG, PNG, WebP or GIF image.";
  // Photos get shrunk before upload, so only GIFs (kept as-is) must already fit.
  if (file.type === "image/gif" && file.size > MAX_IMAGE_BYTES)
    return "GIFs must be 5 MB or smaller.";
  if (file.size > 40 * 1024 * 1024) return "That image is too large.";
  return null;
}

/**
 * Prepares a photo for upload: scales it to at most 2048px on the long side
 * and re-encodes it as WebP. Re-drawing also drops hidden metadata such as GPS
 * location. GIFs are left alone so they keep animating.
 */
export async function prepareImage(file: File): Promise<File> {
  if (file.type === "image/gif") return file;
  const bitmap = await createImageBitmap(file); // honours EXIF orientation
  const scale = Math.min(
    1,
    MAX_DIMENSION / Math.max(bitmap.width, bitmap.height),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.86),
  );
  if (!blob) return file;
  if (blob.size > MAX_IMAGE_BYTES)
    throw new Error("That image is still over 5 MB after resizing.");
  return new File([blob], file.name.replace(/\.\w+$/, "") + ".webp", {
    type: "image/webp",
  });
}

async function uploadTo(
  bucket: string,
  path: string,
  file: File,
): Promise<string> {
  const supabase = createClient();
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) {
    // Storage rules refuse uploads without a valid login (e.g. an expired session).
    if (/row-level security|unauthorized|jwt/i.test(error.message)) {
      throw new Error("your session has expired. Log in again and retry.");
    }
    throw new Error(error.message);
  }
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

const extension = (file: File) =>
  file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "img";
const uniqueName = () => `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

/**
 * Uploads a profile image into the user's own folder (Storage rules reject any
 * other folder). Returns its public URL.
 */
export async function uploadProfileImage(
  userId: string,
  kind: "avatar" | "banner",
  file: File,
) {
  try {
    return await uploadTo(
      PROFILE_IMAGES_BUCKET,
      `${userId}/${kind}-${uniqueName()}.${extension(file)}`,
      file,
    );
  } catch (e) {
    throw new Error(`Couldn't upload your ${kind}: ${(e as Error).message}`);
  }
}

/** Prepares and uploads one chirp image into the user's own folder. */
export async function uploadChirpImage(userId: string, file: File) {
  const prepared = await prepareImage(file);
  try {
    return await uploadTo(
      CHIRP_MEDIA_BUCKET,
      `${userId}/${uniqueName()}.${extension(prepared)}`,
      prepared,
    );
  } catch (e) {
    throw new Error(`Couldn't upload an image: ${(e as Error).message}`);
  }
}

/** Best-effort removal of files we stored (ignores URLs from anywhere else). */
export async function deleteStoredFiles(urls: (string | null | undefined)[]) {
  const byBucket = new Map<string, string[]>();
  for (const url of urls) {
    for (const bucket of [PROFILE_IMAGES_BUCKET, CHIRP_MEDIA_BUCKET]) {
      const marker = `/storage/v1/object/public/${bucket}/`;
      if (url?.includes(marker)) {
        byBucket.set(bucket, [
          ...(byBucket.get(bucket) ?? []),
          url.split(marker)[1],
        ]);
      }
    }
  }
  const supabase = createClient();
  await Promise.all(
    [...byBucket].map(([bucket, paths]) =>
      supabase.storage.from(bucket).remove(paths),
    ),
  );
}

/** Kept for the profile editor. */
export const deleteProfileImage = (url: string | null | undefined) =>
  deleteStoredFiles([url]);
