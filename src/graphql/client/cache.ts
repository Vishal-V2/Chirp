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

/** Drop cached feed pages so they refetch (after posting or deleting). */
function invalidateFeeds(cache: Cache) {
  for (const field of cache.inspectFields("Query")) {
    if (field.fieldName === "exploreFeed" || field.fieldName === "homeFeed") {
      cache.invalidate("Query", field.fieldName, field.arguments);
    }
  }
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
      createTweet(_result, args, cache) {
        invalidateFeeds(cache);
        // A reply: refresh the parent's reply list and count. Only those fields —
        // the new reply links to its parent, so the parent itself must stay cached.
        if (args.parentId) {
          const parent = { __typename: "Tweet", id: String(args.parentId) };
          for (const field of cache.inspectFields(parent)) {
            if (field.fieldName === "replies" || field.fieldName === "replyCount") {
              cache.invalidate(parent, field.fieldName, field.arguments);
            }
          }
        }
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
