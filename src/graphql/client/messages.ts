import { graphql } from "@/generated/gql";

export const MessageFieldsFragment = graphql(`
  fragment MessageFields on Message {
    id
    content
    mediaPaths
    createdAt
    conversationId
    senderId
  }
`);

export const ConversationsQuery = graphql(`
  query Conversations {
    conversations {
      id
      updatedAt
      unreadCount
      otherParticipant {
        id
        username
        displayName
        avatarUrl
      }
      lastMessage {
        id
        content
        mediaPaths
        createdAt
        senderId
      }
    }
  }
`);

export const ConversationQuery = graphql(`
  query Conversation($id: ID!, $first: Int!) {
    conversation(id: $id) {
      id
      otherParticipant {
        id
        username
        displayName
        avatarUrl
        viewerHasBlocked
        blocksViewer
      }
      messages(first: $first) {
        edges {
          node {
            ...MessageFields
          }
        }
        pageInfo {
          hasNextPage
        }
      }
    }
  }
`);

export const UnreadMessageCountQuery = graphql(`
  query UnreadMessageCount {
    unreadMessageCount
  }
`);

export const StartConversationMutation = graphql(`
  mutation StartConversation($userId: ID!) {
    startConversation(userId: $userId) {
      id
    }
  }
`);

export const SendMessageMutation = graphql(`
  mutation SendMessage(
    $conversationId: ID!
    $content: String!
    $mediaPaths: [String!]
  ) {
    sendMessage(
      conversationId: $conversationId
      content: $content
      mediaPaths: $mediaPaths
    ) {
      ...MessageFields
    }
  }
`);

export const MarkConversationReadMutation = graphql(`
  mutation MarkConversationRead($conversationId: ID!) {
    markConversationRead(conversationId: $conversationId) {
      id
      unreadCount
    }
  }
`);

/** Who sent a message, for the message ping. */
export const PingSenderQuery = graphql(`
  query PingSender($id: ID!) {
    conversation(id: $id) {
      id
      otherParticipant {
        id
        username
        displayName
        viewerHasMuted
      }
    }
  }
`);
