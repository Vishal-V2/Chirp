/** Supabase Storage bucket for avatars and banners (public read; uploads only into `<userId>/`). */
export const PROFILE_IMAGES_BUCKET = "profile-images";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
