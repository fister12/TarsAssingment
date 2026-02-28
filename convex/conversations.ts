import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthenticatedUser, getOptionalUser } from "./helpers";

// Get or create a 1-on-1 conversation
export const getOrCreateDM = mutation({
  args: {
    otherUserId: v.id("users"),
    currentUserId: v.id("users"),
    isEphemeral: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = args.currentUserId;

    const currentUserMemberships = await ctx.db
      .query("conversationMembers")
      .withIndex("by_user", (q) => q.eq("userId", user))
      .collect();

    for (const membership of currentUserMemberships) {
      const conversation = await ctx.db.get(membership.conversationId);
      if (!conversation || conversation.isGroup) continue;

      const otherMembership = await ctx.db
        .query("conversationMembers")
        .withIndex("by_conversation_and_user", (q) =>
          q.eq("conversationId", membership.conversationId).eq("userId", args.otherUserId)
        )
        .unique();

      if (otherMembership) {
        return membership.conversationId;
      }
    }

    const conversationId = await ctx.db.insert("conversations", {
      isGroup: false,
      isPrivate: true,
      isEphemeral: args.isEphemeral || false,
      lastMessageTime: Date.now(),
      lastMessagePreview: "",
    });

    await ctx.db.insert("conversationMembers", {
      conversationId,
      userId: user,
      lastReadTime: Date.now(),
    });

    await ctx.db.insert("conversationMembers", {
      conversationId,
      userId: args.otherUserId,
      lastReadTime: Date.now(),
    });

    return conversationId;
  },
});

// Create a group conversation (auth-secured)
export const createGroup = mutation({
  args: {
    memberIds: v.array(v.id("users")),
    groupName: v.string(),
    isEphemeral: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getOptionalUser(ctx);
    if (!user) return null; // Not authenticated

    const conversationId = await ctx.db.insert("conversations", {
      isGroup: true,
      isPrivate: true,
      isEphemeral: args.isEphemeral || false,
      groupName: args.groupName,
      groupAdmin: user._id,
      lastMessageTime: Date.now(),
      lastMessagePreview: "",
    });

    await ctx.db.insert("conversationMembers", {
      conversationId,
      userId: user._id,
      lastReadTime: Date.now(),
    });

    for (const memberId of args.memberIds) {
      await ctx.db.insert("conversationMembers", {
        conversationId,
        userId: memberId,
        lastReadTime: Date.now(),
      });
    }

    return conversationId;
  },
});

// List all conversations for the authenticated user (optimized N+1)
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getOptionalUser(ctx);
    if (!user) return [];

    const memberships = await ctx.db
      .query("conversationMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Cache user lookups to avoid redundant fetches across conversations
    const userCache = new Map<string, NonNullable<Awaited<ReturnType<typeof ctx.db.get>>>>();
    const getCachedUser = async (userId: any) => {
      const key = String(userId);
      if (userCache.has(key)) return userCache.get(key)!;
      const u = await ctx.db.get(userId);
      if (u) userCache.set(key, u);
      return u;
    };

    const conversations = [];

    for (const membership of memberships) {
      const conversation = await ctx.db.get(membership.conversationId);
      if (!conversation) continue;

      const members = await ctx.db
        .query("conversationMembers")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", membership.conversationId)
        )
        .collect();

      const memberDetails = [];
      for (const member of members) {
        const memberUser = await getCachedUser(member.userId);
        if (memberUser) memberDetails.push(memberUser);
      }

      let otherUser = null;
      if (!conversation.isGroup) {
        const otherMember = members.find((m) => m.userId !== user._id);
        if (otherMember) {
          otherUser = await getCachedUser(otherMember.userId);
        }
      }

      // Optimized: server-side filter instead of loading all messages into handler
      const lastReadTime = membership.lastReadTime || 0;
      const unreadMessages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", membership.conversationId)
        )
        .filter((q) =>
          q.and(
            q.gt(q.field("_creationTime"), lastReadTime),
            q.neq(q.field("senderId"), user._id)
          )
        )
        .collect();

      conversations.push({
        ...conversation,
        otherUser,
        members: memberDetails,
        unreadCount: unreadMessages.length,
        lastReadTime,
      });
    }

    conversations.sort(
      (a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0)
    );

    return conversations;
  },
});

// Get a single conversation with details (auth-secured)
export const get = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await getOptionalUser(ctx);
    if (!user) return null;

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return null;

    const members = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    const memberDetails = [];
    for (const member of members) {
      const memberUser = await ctx.db.get(member.userId);
      if (memberUser) memberDetails.push(memberUser);
    }

    let otherUser = null;
    if (!conversation.isGroup) {
      const otherMember = members.find((m) => m.userId !== user._id);
      if (otherMember) {
        otherUser = await ctx.db.get(otherMember.userId);
      }
    }

    return {
      ...conversation,
      otherUser,
      members: memberDetails,
    };
  },
});

// Mark conversation as read
export const markAsRead = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversation_and_user", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", args.userId)
      )
      .unique();

    if (membership) {
      await ctx.db.patch(membership._id, {
        lastReadTime: Date.now(),
      });
    }
  },
});

// Toggle ephemeral messages
export const toggleEphemeral = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    const membership = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversation_and_user", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", args.userId)
      )
      .unique();

    if (!membership) {
      throw new Error("You are not a member of this conversation");
    }

    if (conversation.isGroup && conversation.groupAdmin !== args.userId) {
      throw new Error("Only the group admin can change this setting");
    }

    await ctx.db.patch(args.conversationId, {
      isEphemeral: !conversation.isEphemeral,
    });

    return !conversation.isEphemeral;
  },
});
