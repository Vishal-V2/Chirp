import { graphql } from "@/generated/gql";

// Everything the tweet card needs. Shared by every query that returns tweets.
export const TweetFieldsFragment = graphql(`
  fragment TweetFields on Tweet {
    id
    content
    mediaUrls
    location
    createdAt
    likeCount
    retweetCount
    replyCount
    viewerHasLiked
    viewerHasRetweeted
    viewerHasBookmarked
    author {
      id
      username
      displayName
      avatarUrl
    }
    parent {
      id
      author {
        id
        username
      }
    }
    poll {
      ...PollFields
    }
  }
`);

export const PollFieldsFragment = graphql(`
  fragment PollFields on Poll {
    id
    endsAt
    isClosed
    totalVotes
    viewerVoteOptionId
    viewerIsAuthor
    options {
      id
      text
      voteCount
    }
  }
`);

export const VotePollMutation = graphql(`
  mutation VotePoll($optionId: ID!) {
    votePoll(optionId: $optionId) {
      ...PollFields
    }
  }
`);

export const ExploreFeedQuery = graphql(`
  query ExploreFeed($first: Int!, $after: String) {
    exploreFeed(first: $first, after: $after) {
      edges {
        node {
          ...TweetFields
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`);

export const HomeFeedQuery = graphql(`
  query HomeFeed($first: Int!, $after: String) {
    homeFeed(first: $first, after: $after) {
      edges {
        node {
          ...TweetFields
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`);

export const CreateTweetMutation = graphql(`
  mutation CreateTweet(
    $content: String!
    $mediaUrls: [String!]
    $location: String
    $poll: PollInput
    $parentId: ID
  ) {
    createTweet(
      content: $content
      mediaUrls: $mediaUrls
      location: $location
      poll: $poll
      parentId: $parentId
    ) {
      ...TweetFields
    }
  }
`);

export const DeleteTweetMutation = graphql(`
  mutation DeleteTweet($id: ID!) {
    deleteTweet(id: $id)
  }
`);

// Like/repost mutations select only what changes, so optimistic updates are complete.
export const LikeTweetMutation = graphql(`
  mutation LikeTweet($id: ID!) {
    likeTweet(id: $id) {
      id
      likeCount
      viewerHasLiked
    }
  }
`);

export const UnlikeTweetMutation = graphql(`
  mutation UnlikeTweet($id: ID!) {
    unlikeTweet(id: $id) {
      id
      likeCount
      viewerHasLiked
    }
  }
`);

export const RetweetMutation = graphql(`
  mutation Retweet($id: ID!) {
    retweet(id: $id) {
      id
      retweetCount
      viewerHasRetweeted
    }
  }
`);

export const UnretweetMutation = graphql(`
  mutation Unretweet($id: ID!) {
    unretweet(id: $id) {
      id
      retweetCount
      viewerHasRetweeted
    }
  }
`);

export const TweetPageQuery = graphql(`
  query TweetPage($id: ID!, $repliesFirst: Int!) {
    tweet(id: $id) {
      ...TweetFields
      ancestors {
        ...TweetFields
      }
      replies(first: $repliesFirst) {
        edges {
          node {
            ...TweetFields
          }
        }
        pageInfo {
          hasNextPage
        }
      }
    }
  }
`);

export const PopularTweetsQuery = graphql(`
  query PopularTweets($first: Int!, $after: String) {
    popularTweets(first: $first, after: $after) {
      edges {
        node {
          ...TweetFields
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`);

export const SearchTweetsQuery = graphql(`
  query SearchTweets($query: String!, $first: Int!, $after: String) {
    searchTweets(query: $query, first: $first, after: $after) {
      edges {
        node {
          ...TweetFields
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`);

export const BookmarkTweetMutation = graphql(`
  mutation BookmarkTweet($id: ID!) {
    bookmarkTweet(id: $id) {
      id
      viewerHasBookmarked
    }
  }
`);

export const UnbookmarkTweetMutation = graphql(`
  mutation UnbookmarkTweet($id: ID!) {
    unbookmarkTweet(id: $id) {
      id
      viewerHasBookmarked
    }
  }
`);

export const BookmarksQuery = graphql(`
  query Bookmarks($first: Int!, $after: String) {
    bookmarks(first: $first, after: $after) {
      edges {
        node {
          tweet {
            ...TweetFields
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`);

export const HashtagTweetsQuery = graphql(`
  query HashtagTweets($tag: String!, $first: Int!, $after: String) {
    hashtagTweets(tag: $tag, first: $first, after: $after) {
      edges {
        node {
          ...TweetFields
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`);

export const TrendingHashtagsQuery = graphql(`
  query TrendingHashtags($first: Int!) {
    trendingHashtags(first: $first) {
      tag
      chirpCount
    }
  }
`);
