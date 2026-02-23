import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // User profiles synced from Clerk
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    imageUrl: v.string(),
    isOnline: v.boolean(),
    lastSeen: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_name", ["name"])
    .searchIndex("search_name", { searchField: "name" }),

  // Conversations (both 1-on-1 and group)
  conversations: defineTable({
    isGroup: v.boolean(),
    groupName: v.optional(v.string()),
    groupAdmin: v.optional(v.id("users")),
    lastMessageTime: v.optional(v.number()),
    lastMessagePreview: v.optional(v.string()),
  }).index("by_last_message_time", ["lastMessageTime"]),

  // Conversation participants (many-to-many)
  conversationMembers: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    lastReadTime: v.optional(v.number()),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_user", ["userId"])
    .index("by_conversation_and_user", ["conversationId", "userId"]),

  // Messages
  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    content: v.string(),
    isDeleted: v.boolean(),
    reactions: v.optional(
      v.array(
        v.object({
          userId: v.id("users"),
          emoji: v.string(),
        })
      )
    ),
  }).index("by_conversation", ["conversationId"]),

  // Typing indicators
  typingIndicators: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    expiresAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_conversation_and_user", ["conversationId", "userId"]),
});
