import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthenticatedUser, getOptionalUser } from "./helpers";

// Set typing indicator
export const setTyping = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("typingIndicators")
      .withIndex("by_conversation_and_user", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", args.userId)
      )
      .unique();

    const expiresAt = Date.now() + 3000;

    if (existing) {
      await ctx.db.patch(existing._id, { expiresAt });
    } else {
      await ctx.db.insert("typingIndicators", {
        conversationId: args.conversationId,
        userId: args.userId,
        expiresAt,
      });
    }
  },
});

// Clear typing indicator
export const clearTyping = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("typingIndicators")
      .withIndex("by_conversation_and_user", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", args.userId)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

// Get typing indicators for a conversation (auth-secured)
export const getTyping = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const user = await getOptionalUser(ctx);
    if (!user) return [];

    const indicators = await ctx.db
      .query("typingIndicators")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    const now = Date.now();
    const activeTypers = [];

    for (const indicator of indicators) {
      if (indicator.userId === user._id) continue;
      if (indicator.expiresAt > now) {
        const typingUser = await ctx.db.get(indicator.userId);
        if (typingUser) {
          activeTypers.push({ name: typingUser.name, userId: typingUser._id });
        }
      }
    }

    return activeTypers;
  },
});
