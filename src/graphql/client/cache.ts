import { cacheExchange, type Cache } from "@urql/exchange-graphcache";
import { graphql } from "@/generated/gql";

/**
 * Normalized cache: each Tweet/User is stored once by id, so a like updates
 * every place that tweet is shown without refetching whole feeds.
 */

// Connection wrappers have no id; they're stored inside their parent field.
const embedded = () => null;
const CONNECTION_TYPES = [
  "QueryExploreFeedConnection",
  "QueryHomeFeedConnection",
  "QueryLikedTweetsConnection",
  "TweetRepliesConnection",
  "UserRepliesConnection",
  "UserTweetsConnection",
];

const LikeState = graphql(`
  fragment LikeState on Tweet {
    id
    likeCount
    viewerHasLiked
  }
`);

const RetweetState = graphql(`
  fragment RetweetState on Tweet {
    id
    retweetCount
    viewerHasRetweeted
  }
`);

const FollowState = graphql(`
  fragment FollowState on User {
    id
    followerCount
    viewerIsFollowing
  }
`);

/** Drop the given cached fields (every argument variant) so they refetch. */
function invalidateFields(
  cache: Cache,
  entity: string | { __typename: string; id: string },
  names: string[],
) {
  for (const field of cache.inspectFields(entity)) {
    if (names.includes(field.fieldName)) {
      cache.invalidate(entity, field.fieldName, field.arguments);
    }
  }
}

/** Drop cached feed pages so they refetch (after posting or deleting). */
function invalidateFeeds(cache: Cache) {
  invalidateFields(cache, "Query", ["exploreFeed", "homeFeed"]);
}

export const graphcache = cacheExchange({
  keys: {
    PageInfo: embedded,
    ...Object.fromEntries(
      CONNECTION_TYPES.flatMap((t) => [
        [t, embedded],
        [`${t}Edge`, embedded],
      ]),
    ),
  },
  updates: {
    Mutation: {
      createTweet(result, args, cache) {
        invalidateFeeds(cache);
        // The author's profile tabs and post count.
        const authorId = (
          result.createTweet as { author?: { id?: string } } | null
        )?.author?.id;
        if (authorId) {
          invalidateFields(cache, { __typename: "User", id: authorId }, [
            "tweets",
            "replies",
            "tweetCount",
          ]);
        }
        // A reply: refresh the parent's reply list and count. Only those fields —
        // the new reply links to its parent, so the parent itself must stay cached.
        if (args.parentId) {
          const parent = { __typename: "Tweet", id: String(args.parentId) };
          for (const field of cache.inspectFields(parent)) {
            if (
              field.fieldName === "replies" ||
              field.fieldName === "replyCount"
            ) {
              cache.invalidate(parent, field.fieldName, field.arguments);
            }
          }
        }
      },
      // Your Likes tab changes when you like or unlike.
      likeTweet(_result, _args, cache) {
        invalidateFields(cache, "Query", ["likedTweets"]);
      },
      unlikeTweet(_result, _args, cache) {
        invalidateFields(cache, "Query", ["likedTweets"]);
      },
      // Your Following feed changes when you follow or unfollow someone.
      follow(_result, _args, cache) {
        invalidateFields(cache, "Query", ["homeFeed"]);
      },
      unfollow(_result, _args, cache) {
        invalidateFields(cache, "Query", ["homeFeed"]);
      },
      deleteTweet(result, args, cache) {
        if (!result.deleteTweet) return;
        cache.invalidate({ __typename: "Tweet", id: String(args.id) });
        invalidateFeeds(cache);
      },
    },
  },
  // Show likes/reposts instantly; the server's answer replaces these, and
  // they're rolled back automatically if the request fails.
  optimistic: {
    follow(args, cache) {
      const u = cache.readFragment(FollowState, {
        __typename: "User",
        id: String(args.userId),
      });
      return {
        __typename: "User",
        id: String(args.userId),
        viewerIsFollowing: true,
        followerCount: (u?.followerCount ?? 0) + (u?.viewerIsFollowing ? 0 : 1),
      };
    },
    unfollow(args, cache) {
      const u = cache.readFragment(FollowState, {
        __typename: "User",
        id: String(args.userId),
      });
      return {
        __typename: "User",
        id: String(args.userId),
        viewerIsFollowing: false,
        followerCount: Math.max(
          0,
          (u?.followerCount ?? 0) - (u?.viewerIsFollowing ? 1 : 0),
        ),
      };
    },
    likeTweet(args, cache) {
      const t = cache.readFragment(LikeState, {
        __typename: "Tweet",
        id: String(args.id),
      });
      return {
        __typename: "Tweet",
        id: String(args.id),
        viewerHasLiked: true,
        likeCount: (t?.likeCount ?? 0) + (t?.viewerHasLiked ? 0 : 1),
      };
    },
    unlikeTweet(args, cache) {
      const t = cache.readFragment(LikeState, {
        __typename: "Tweet",
        id: String(args.id),
      });
      return {
        __typename: "Tweet",
        id: String(args.id),
        viewerHasLiked: false,
        likeCount: Math.max(
          0,
          (t?.likeCount ?? 0) - (t?.viewerHasLiked ? 1 : 0),
        ),
      };
    },
    retweet(args, cache) {
      const t = cache.readFragment(RetweetState, {
        __typename: "Tweet",
        id: String(args.id),
      });
      return {
        __typename: "Tweet",
        id: String(args.id),
        viewerHasRetweeted: true,
        retweetCount: (t?.retweetCount ?? 0) + (t?.viewerHasRetweeted ? 0 : 1),
      };
    },
    unretweet(args, cache) {
      const t = cache.readFragment(RetweetState, {
        __typename: "Tweet",
        id: String(args.id),
      });
      return {
        __typename: "Tweet",
        id: String(args.id),
        viewerHasRetweeted: false,
        retweetCount: Math.max(
          0,
          (t?.retweetCount ?? 0) - (t?.viewerHasRetweeted ? 1 : 0),
        ),
      };
    },
  },
});
