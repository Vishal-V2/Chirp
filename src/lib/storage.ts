/** Supabase Storage bucket for avatars and banners (public read; uploads only into `<userId>/`). */
export const PROFILE_IMAGES_BUCKET = "profile-images";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

/** Supabase Storage bucket for images attached to chirps (same rules: own folder only). */
export const CHIRP_MEDIA_BUCKET = "chirp-media";
export const MAX_CHIRP_IMAGES = 4;

/**
 * Private Supabase Storage bucket for images sent in messages, as
 * <conversationId>/<senderId>/<file>. Only the chat's participants can read it.
 */
export const MESSAGE_MEDIA_BUCKET = "message-media";

/** Polls: characters per choice. */
export const MAX_POLL_OPTION = 25;
