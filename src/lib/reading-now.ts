/**
 * Which chat you're reading right now (open, visible, scrolled to its end).
 * The chat screen sets it; the Messages badge uses it so a message you're
 * looking at doesn't flash up as unread while it's being marked read.
 */
let current: string | null = null;

export function setReadingNow(conversationId: string | null) {
  current = conversationId;
}

export function isReadingNow(conversationId: string) {
  return current === conversationId;
}
