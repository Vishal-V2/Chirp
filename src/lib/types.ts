/** What the tweet UI needs to render one tweet. Both GraphQL results and the sample data fit this shape. */
export type TweetData = {
  id: string;
  content: string;
  createdAt: string;
  likeCount: number;
  retweetCount: number;
  replyCount: number;
  viewerHasLiked: boolean;
  viewerHasRetweeted: boolean;
  author: { id: string; username: string; displayName: string; avatarUrl?: string | null };
  parent?: { id: string; author: { username: string } } | null;
};
