import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { getAuthenticatedUser, getOptionalUser } from "./helpers";

// Send a message
export const send = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = args.userId;
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    // Verify membership
    const membership = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversation_and_user", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", userId)
      )
      .unique();
    if (!membership)
      throw new Error("You are not a member of this conversation");

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    const expiresAt = conversation.isEphemeral
      ? Date.now() + 24 * 60 * 60 * 1000
      : undefined;

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: userId,
      content: args.content,
      isDeleted: false,
      expiresAt,
      reactions: [],
    });

    const preview =
      args.content.length > 50
        ? args.content.substring(0, 50) + "..."
        : args.content;

    await ctx.db.patch(args.conversationId, {
      lastMessageTime: Date.now(),
      lastMessagePreview: `${user.name}: ${preview}`,
    });

    // Remove typing indicator
    const typingIndicator = await ctx.db
      .query("typingIndicators")
      .withIndex("by_conversation_and_user", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", userId)
      )
      .unique();

    if (typingIndicator) {
      await ctx.db.delete(typingIndicator._id);
    }

    return messageId;
  },
});

// Paginated message list (newest first, reverse on client for display)
export const list = query({
  args: {
    conversationId: v.id("conversations"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("desc")
      .paginate(args.paginationOpts);

    const now = Date.now();
    const enrichedPage = [];

    for (const message of results.page) {
      if (message.expiresAt && message.expiresAt < now) continue;

      const sender = await ctx.db.get(message.senderId);
      enrichedPage.push({
        ...message,
        senderName: sender?.name || "Unknown",
        senderImageUrl: sender?.imageUrl || "",
      });
    }

    return {
      ...results,
      page: enrichedPage,
    };
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

    await ctx.db.patch(args.messageId, { isDeleted: true });
  },
});

// Toggle a reaction on a message
export const toggleReaction = mutation({
  args: {
    messageId: v.id("messages"),
    emoji: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    const reactions = message.reactions || [];
    const existingIndex = reactions.findIndex(
      (r) => r.userId === args.userId && r.emoji === args.emoji
    );

    if (existingIndex >= 0) {
      reactions.splice(existingIndex, 1);
    } else {
      reactions.push({ userId: args.userId, emoji: args.emoji });
    }

    await ctx.db.patch(args.messageId, { reactions });
  },
});

// Internal mutation for cron-based cleanup of expired ephemeral messages
export const cleanupExpiredMessages = internalMutation({
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
