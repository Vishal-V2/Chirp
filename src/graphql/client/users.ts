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
    viewerHasBlocked
    viewerHasMuted
    blocksViewer
    canMessage
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
          pinned
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

export const UsernameAvailableQuery = graphql(`
  query UsernameAvailable($username: String!) {
    usernameAvailable(username: $username) {
      available
      message
    }
  }
`);

/** Block / mute. Each returns the person's updated profile (flags, counts). */
export const BlockMutation = graphql(`
  mutation Block($userId: ID!) {
    block(userId: $userId) {
      ...ProfileFields
    }
  }
`);

export const UnblockMutation = graphql(`
  mutation Unblock($userId: ID!) {
    unblock(userId: $userId) {
      ...ProfileFields
    }
  }
`);

export const MuteMutation = graphql(`
  mutation Mute($userId: ID!) {
    mute(userId: $userId) {
      ...ProfileFields
    }
  }
`);

export const UnmuteMutation = graphql(`
  mutation Unmute($userId: ID!) {
    unmute(userId: $userId) {
      ...ProfileFields
    }
  }
`);

/** Settings → Muted and blocked accounts. */
export const SafetyListsQuery = graphql(`
  query SafetyLists {
    mutedAccounts {
      id
      username
      displayName
      avatarUrl
      bio
      viewerHasMuted
      viewerHasBlocked
    }
    blockedAccounts {
      id
      username
      displayName
      avatarUrl
      bio
      viewerHasMuted
      viewerHasBlocked
    }
  }
`);

/** The profile Media tab: chirps with images, newest first. */
export const UserMediaQuery = graphql(`
  query UserMedia($username: String!, $first: Int!, $after: String) {
    user(username: $username) {
      id
      media(first: $first, after: $after) {
        edges {
          node {
            id
            content
            mediaUrls
            author {
              id
              username
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
