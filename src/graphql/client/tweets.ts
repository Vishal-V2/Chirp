import { graphql } from "@/generated/gql";

// Everything the tweet card needs. Shared by every query that returns tweets.
export const TweetFieldsFragment = graphql(`
  fragment TweetFields on Tweet {
    id
    content
    createdAt
    likeCount
    retweetCount
    replyCount
    viewerHasLiked
    viewerHasRetweeted
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
  mutation CreateTweet($content: String!, $parentId: ID) {
    createTweet(content: $content, parentId: $parentId) {
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
