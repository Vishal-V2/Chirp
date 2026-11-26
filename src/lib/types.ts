import type {
  PollFieldsFragment,
  QuotedTweetFieldsFragment,
} from "@/generated/gql/graphql";

/** What the tweet UI needs to render one tweet. Both GraphQL results and the sample data fit this shape. */
export type TweetData = {
  id: string;
  content: string;
  /** Up to 4 image URLs. */
  mediaUrls?: string[];
  /** A place name like "Pune, India". */
  location?: string | null;
  poll?: PollFieldsFragment | null;
  /** Quote reposts: the embedded chirp (null if it was deleted). */
  isQuote?: boolean;
  /** Pinned to the top of its author's profile. */
  isPinned?: boolean;
  /** The author continued this chirp as a thread. */
  hasThread?: boolean;
  quoteCount?: number;
  quoted?: QuotedTweetFieldsFragment | null;
  createdAt: string;
  likeCount: number;
  retweetCount: number;
  replyCount: number;
  viewerHasLiked: boolean;
  viewerHasRetweeted: boolean;
  viewerHasBookmarked?: boolean;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
    /** You muted / blocked them: their chirps are hidden as soon as you do. */
    viewerHasMuted?: boolean;
    viewerHasBlocked?: boolean;
  };
  parent?: { id: string; author: { username: string } } | null;
};
