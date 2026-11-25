import { graphql } from "@/generated/gql";

export const NotificationsQuery = graphql(`
  query Notifications($first: Int!) {
    notifications(first: $first) {
      edges {
        node {
          id
          type
          createdAt
          isUnread
          actor {
            id
            username
            displayName
            avatarUrl
          }
          tweet {
            ...TweetFields
          }
        }
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`);

export const UnreadNotificationCountQuery = graphql(`
  query UnreadNotificationCount {
    unreadNotificationCount
  }
`);

export const MarkNotificationsReadMutation = graphql(`
  mutation MarkNotificationsRead {
    markNotificationsRead
  }
`);
