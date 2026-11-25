import type { PollFieldsFragment } from "@/generated/gql/graphql";

/** What the tweet UI needs to render one tweet. Both GraphQL results and the sample data fit this shape. */
export type TweetData = {
  id: string;
  content: string;
  /** Up to 4 image URLs. */
  mediaUrls?: string[];
  /** A place name like "Pune, India". */
  location?: string | null;
  poll?: PollFieldsFragment | null;
  createdAt: string;
  likeCount: number;
  retweetCount: number;
  replyCount: number;
  viewerHasLiked: boolean;
  viewerHasRetweeted: boolean;
  viewerHasBookmarked?: boolean;
  author: { id: string; username: string; displayName: string; avatarUrl?: string | null };
  parent?: { id: string; author: { username: string } } | null;
};
