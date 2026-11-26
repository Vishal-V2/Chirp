import { graphql } from "@/generated/gql";

export const MessageFieldsFragment = graphql(`
  fragment MessageFields on Message {
    id
    content
    mediaPaths
    deletedAt
    systemText
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
      isGroup
      name
      photoPath
      participants {
        user {
          id
          username
          displayName
          avatarUrl
        }
      }
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
        systemText
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
      isRequest
      isGroup
      name
      photoPath
      myRole
      createdById
      participants {
        role
        seenAt
        user {
          id
          username
          displayName
          avatarUrl
        }
      }
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
      isRequest
      isGroup
      name
      participants {
        user {
          id
          displayName
        }
      }
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

/** Message requests, in the same shape as the inbox (so the same list renders them). */
export const MessageRequestsQuery = graphql(`
  query MessageRequests {
    conversations: messageRequests {
      id
      updatedAt
      unreadCount
      isGroup
      name
      photoPath
      participants {
        user {
          id
          username
          displayName
          avatarUrl
        }
      }
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
        systemText
        createdAt
        senderId
      }
    }
  }
`);

export const MessageRequestCountQuery = graphql(`
  query MessageRequestCount {
    messageRequestCount
  }
`);

export const AcceptMessageRequestMutation = graphql(`
  mutation AcceptMessageRequest($conversationId: ID!) {
    acceptMessageRequest(conversationId: $conversationId) {
      id
      isRequest
    }
  }
`);

export const DeleteMessageRequestMutation = graphql(`
  mutation DeleteMessageRequest($conversationId: ID!) {
    deleteMessageRequest(conversationId: $conversationId)
  }
`);

/** Settings → Privacy and safety → "Allow messages from". */
export const DmPolicyQuery = graphql(`
  query DmPolicy {
    me {
      id
      dmPolicy
      readReceipts
    }
  }
`);

export const SetDmPolicyMutation = graphql(`
  mutation SetDmPolicy($policy: DmPolicy!) {
    setDmPolicy(policy: $policy) {
      id
      dmPolicy
    }
  }
`);

export const SetReadReceiptsMutation = graphql(`
  mutation SetReadReceipts($on: Boolean!) {
    setReadReceipts(on: $on) {
      id
      readReceipts
    }
  }
`);

/** Seen-by info for a chat, refetched when someone reads it. */
export const ChatSeenQuery = graphql(`
  query ChatSeen($id: ID!) {
    conversation(id: $id) {
      id
      participants {
        seenAt
        user {
          id
        }
      }
    }
  }
`);

export const CreateGroupMutation = graphql(`
  mutation CreateGroup($userIds: [ID!]!, $name: String) {
    createGroup(userIds: $userIds, name: $name) {
      id
    }
  }
`);

export const AddGroupMembersMutation = graphql(`
  mutation AddGroupMembers($conversationId: ID!, $userIds: [ID!]!) {
    addGroupMembers(conversationId: $conversationId, userIds: $userIds) {
      id
      participants {
        role
        seenAt
        user {
          id
          username
          displayName
          avatarUrl
        }
      }
    }
  }
`);

export const RemoveGroupMemberMutation = graphql(`
  mutation RemoveGroupMember($conversationId: ID!, $userId: ID!) {
    removeGroupMember(conversationId: $conversationId, userId: $userId) {
      id
      participants {
        role
        seenAt
        user {
          id
          username
          displayName
          avatarUrl
        }
      }
    }
  }
`);

export const SetGroupAdminMutation = graphql(`
  mutation SetGroupAdmin($conversationId: ID!, $userId: ID!, $admin: Boolean!) {
    setGroupAdmin(
      conversationId: $conversationId
      userId: $userId
      admin: $admin
    ) {
      id
      participants {
        role
        seenAt
        user {
          id
          username
          displayName
          avatarUrl
        }
      }
    }
  }
`);

export const UpdateGroupMutation = graphql(`
  mutation UpdateGroup(
    $conversationId: ID!
    $name: String
    $photoPath: String
  ) {
    updateGroup(
      conversationId: $conversationId
      name: $name
      photoPath: $photoPath
    ) {
      id
      name
      photoPath
    }
  }
`);

export const LeaveGroupMutation = graphql(`
  mutation LeaveGroup($conversationId: ID!) {
    leaveGroup(conversationId: $conversationId)
  }
`);

/** Group info page. */
export const GroupInfoQuery = graphql(`
  query GroupInfo($id: ID!) {
    conversation(id: $id) {
      id
      isGroup
      name
      photoPath
      myRole
      createdById
      participants {
        role
        seenAt
        user {
          id
          username
          displayName
          avatarUrl
        }
      }
    }
  }
`);
