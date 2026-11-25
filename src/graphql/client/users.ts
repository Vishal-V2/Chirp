import { graphql } from "@/generated/gql";

export const ProfileFieldsFragment = graphql(`
  fragment ProfileFields on User {
    id
    username
    displayName
    bio
    avatarUrl
    bannerUrl
    createdAt
    followerCount
    followingCount
    tweetCount
    viewerIsFollowing
  }
`);

export const ProfileQuery = graphql(`
  query Profile($username: String!) {
    user(username: $username) {
      ...ProfileFields
    }
  }
`);

export const UserPostsQuery = graphql(`
  query UserPosts($username: String!, $first: Int!, $after: String) {
    user(username: $username) {
      id
      timeline(first: $first, after: $after) {
        edges {
          repostedAt
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
  }
`);

export const UserRepliesQuery = graphql(`
  query UserReplies($username: String!, $first: Int!, $after: String) {
    user(username: $username) {
      id
      replies(first: $first, after: $after) {
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
  }
`);

export const LikedTweetsQuery = graphql(`
  query LikedTweets($first: Int!, $after: String) {
    likedTweets(first: $first, after: $after) {
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

export const WhoToFollowQuery = graphql(`
  query WhoToFollow {
    whoToFollow(first: 3) {
      id
      username
      displayName
      avatarUrl
      followerCount
      viewerIsFollowing
    }
  }
`);

export const FollowMutation = graphql(`
  mutation Follow($userId: ID!) {
    follow(userId: $userId) {
      id
      followerCount
      viewerIsFollowing
    }
  }
`);

export const UnfollowMutation = graphql(`
  mutation Unfollow($userId: ID!) {
    unfollow(userId: $userId) {
      id
      followerCount
      viewerIsFollowing
    }
  }
`);

export const UpdateProfileMutation = graphql(`
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      ...ProfileFields
    }
  }
`);

export const UserListFieldsFragment = graphql(`
  fragment UserListFields on User {
    id
    username
    displayName
    bio
    avatarUrl
    viewerIsFollowing
    followsViewer
  }
`);

export const UserFollowersQuery = graphql(`
  query UserFollowers($username: String!, $first: Int!, $after: String) {
    user(username: $username) {
      id
      followers(first: $first, after: $after) {
        edges {
          node {
            follower {
              ...UserListFields
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`);

export const UserFollowingQuery = graphql(`
  query UserFollowing($username: String!, $first: Int!, $after: String) {
    user(username: $username) {
      id
      following(first: $first, after: $after) {
        edges {
          node {
            following {
              ...UserListFields
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`);

export const SearchUsersQuery = graphql(`
  query SearchUsers($query: String!) {
    searchUsers(query: $query) {
      ...UserListFields
    }
  }
`);

export const DiscoverPeopleQuery = graphql(`
  query DiscoverPeople {
    whoToFollow(first: 20) {
      ...UserListFields
    }
  }
`);
