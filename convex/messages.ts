import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Send a message
export const send = mutation({
  args: {
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    // Get conversation to check if it's ephemeral
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    // Calculate expiration time (24 hours from now) if ephemeral
    const expiresAt = conversation.isEphemeral 
      ? Date.now() + 24 * 60 * 60 * 1000 // 24 hours
      : undefined;

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: args.senderId,
      content: args.content,
      isDeleted: false,
      expiresAt,
      reactions: [],
    });

    // Update conversation preview
    const sender = await ctx.db.get(args.senderId);
    const preview = args.content.length > 50 
      ? args.content.substring(0, 50) + "..." 
      : args.content;

    await ctx.db.patch(args.conversationId, {
      lastMessageTime: Date.now(),
      lastMessagePreview: `${sender?.name}: ${preview}`,
    });

    // Remove typing indicator for this user
    const typingIndicator = await ctx.db
      .query("typingIndicators")
      .withIndex("by_conversation_and_user", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", args.senderId)
      )
      .unique();

    if (typingIndicator) {
      await ctx.db.delete(typingIndicator._id);
    }

    return messageId;
  },
});

// Get messages for a conversation (real-time via subscription)
export const list = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    const now = Date.now();

    // Enrich messages with sender info and filter out expired messages
    const enrichedMessages = [];
    for (const message of messages) {
      // Skip expired messages
      if (message.expiresAt && message.expiresAt < now) {
        continue;
      }

      const sender = await ctx.db.get(message.senderId);
      enrichedMessages.push({
        ...message,
        senderName: sender?.name || "Unknown",
        senderImageUrl: sender?.imageUrl || "",
      });
    }

    return enrichedMessages;
  },
});

// Soft delete a message
export const softDelete = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");
    if (message.senderId !== args.userId) {
      throw new Error("You can only delete your own messages");
    }

    await ctx.db.patch(args.messageId, {
      isDeleted: true,
    });
  },
});

// Toggle a reaction on a message
export const toggleReaction = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.id("users"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    const reactions = message.reactions || [];
    const existingIndex = reactions.findIndex(
      (r) => r.userId === args.userId && r.emoji === args.emoji
    );

    if (existingIndex >= 0) {
      // Remove reaction
      reactions.splice(existingIndex, 1);
    } else {
      // Add reaction
      reactions.push({ userId: args.userId, emoji: args.emoji });
    }

    await ctx.db.patch(args.messageId, { reactions });
  },
});

// Clean up expired ephemeral messages (call this periodically or on demand)
export const cleanupExpiredMessages = mutation({
  handler: async (ctx) => {
    const now = Date.now();
    const expiredMessages = await ctx.db
      .query("messages")
      .withIndex("by_expires_at", (q) => q.lt("expiresAt", now))
      .collect();

    let deletedCount = 0;
    for (const message of expiredMessages) {
      if (message.expiresAt && message.expiresAt < now) {
        await ctx.db.delete(message._id);
        deletedCount++;
      }
    }

    return { deletedCount };
  },
});
