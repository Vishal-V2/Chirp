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

/** Who did what, for the notification ping (newest few; the ping picks its id). */
export const PingNotificationsQuery = graphql(`
  query PingNotifications {
    notifications(first: 5) {
      edges {
        node {
          id
          type
          actor {
            id
            username
            displayName
          }
          tweet {
            id
            content
            author {
              id
              username
            }
          }
        }
      }
    }
  }
`);
