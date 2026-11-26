import { graphql } from "@/generated/gql";

export const MessageFieldsFragment = graphql(`
  fragment MessageFields on Message {
    id
    content
    mediaPaths
    deletedAt
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
        deletedAt
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

/** Unsend your message: both people see "This message was deleted". */
export const UnsendMessageMutation = graphql(`
  mutation UnsendMessage($id: ID!) {
    unsendMessage(id: $id) {
      ...MessageFields
    }
  }
`);

/** "Delete for you": hide a message on your side only. */
export const DeleteMessageForMeMutation = graphql(`
  mutation DeleteMessageForMe($id: ID!) {
    deleteMessageForMe(id: $id)
  }
`);
