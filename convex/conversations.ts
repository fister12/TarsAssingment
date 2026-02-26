import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get or create a 1-on-1 conversation between two users
export const getOrCreateDM = mutation({
  args: {
    currentUserId: v.id("users"),
    otherUserId: v.id("users"),
    isEphemeral: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Find all conversations where currentUser is a member
    const currentUserMemberships = await ctx.db
      .query("conversationMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.currentUserId))
      .collect();

    // For each conversation, check if it's a DM with the other user
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

    // Create new DM conversation
    const conversationId = await ctx.db.insert("conversations", {
      isGroup: false,
      isPrivate: true,
      isEphemeral: args.isEphemeral || false,
      lastMessageTime: Date.now(),
      lastMessagePreview: "",
    });

    await ctx.db.insert("conversationMembers", {
      conversationId,
      userId: args.currentUserId,
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

// Create a group conversation
export const createGroup = mutation({
  args: {
    creatorId: v.id("users"),
    memberIds: v.array(v.id("users")),
    groupName: v.string(),
    isEphemeral: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const conversationId = await ctx.db.insert("conversations", {
      isGroup: true,
      isPrivate: true,
      isEphemeral: args.isEphemeral || false,
      groupName: args.groupName,
      groupAdmin: args.creatorId,
      lastMessageTime: Date.now(),
      lastMessagePreview: "",
    });

    // Add creator as member
    await ctx.db.insert("conversationMembers", {
      conversationId,
      userId: args.creatorId,
      lastReadTime: Date.now(),
    });

    // Add all other members
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

// List all conversations for a user with details
export const list = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("conversationMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const conversations = [];

    for (const membership of memberships) {
      const conversation = await ctx.db.get(membership.conversationId);
      if (!conversation) continue;

      // Get all members of this conversation
      const members = await ctx.db
        .query("conversationMembers")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", membership.conversationId)
        )
        .collect();

      // Get member details
      const memberDetails = [];
      for (const member of members) {
        const user = await ctx.db.get(member.userId);
        if (user) memberDetails.push(user);
      }

      // Get the other user for DM conversations
      let otherUser = null;
      if (!conversation.isGroup) {
        const otherMember = members.find((m) => m.userId !== args.userId);
        if (otherMember) {
          otherUser = await ctx.db.get(otherMember.userId);
        }
      }

      // Count unread messages
      const lastReadTime = membership.lastReadTime || 0;
      const allMessages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", membership.conversationId)
        )
        .collect();
      
      const unreadCount = allMessages.filter(
        (m) => m._creationTime > lastReadTime && m.senderId !== args.userId
      ).length;

      conversations.push({
        ...conversation,
        otherUser,
        members: memberDetails,
        unreadCount,
        lastReadTime,
      });
    }

    // Sort by last message time (most recent first)
    conversations.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));

    return conversations;
  },
});

// Get a single conversation with details
export const get = query({
  args: { conversationId: v.id("conversations"), userId: v.id("users") },
  handler: async (ctx, args) => {
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
      const user = await ctx.db.get(member.userId);
      if (user) memberDetails.push(user);
    }

    let otherUser = null;
    if (!conversation.isGroup) {
      const otherMember = members.find((m) => m.userId !== args.userId);
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

// Toggle ephemeral messages for a conversation
export const toggleEphemeral = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    // Check if user is a member (for group conversations, only admin can change this)
    const membership = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversation_and_user", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", args.userId)
      )
      .unique();

    if (!membership) {
      throw new Error("You are not a member of this conversation");
    }

    // For group convos, only admin can toggle
    if (conversation.isGroup && conversation.groupAdmin !== args.userId) {
      throw new Error("Only the group admin can change this setting");
    }

    // Toggle the ephemeral setting
    await ctx.db.patch(args.conversationId, {
      isEphemeral: !conversation.isEphemeral,
    });

    return !conversation.isEphemeral;
  },
});
