import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Store or update user profile from auth token (no client args needed)
export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null; // Auth token not ready yet, caller will retry

    const clerkId = identity.subject;
    const name = identity.name ?? "Anonymous";
    const email = identity.email ?? "";
    const imageUrl = identity.pictureUrl ?? "";

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name,
        email,
        imageUrl,
        isOnline: true,
        lastSeen: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId,
      name,
      email,
      imageUrl,
      isOnline: true,
      lastSeen: Date.now(),
    });
  },
});

// Get current user by Clerk ID
export const getByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
  },
});

// Get all users except the current one
export const listAll = query({
  args: { currentUserId: v.id("users") },
  handler: async (ctx, args) => {
    const users = await ctx.db.query("users").collect();
    return users.filter((u) => u._id !== args.currentUserId);
  },
});

// Search users by name
export const search = query({
  args: { query: v.string(), currentUserId: v.id("users") },
  handler: async (ctx, args) => {
    if (!args.query.trim()) {
      return await ctx.db
        .query("users")
        .collect()
        .then((users) => users.filter((u) => u._id !== args.currentUserId));
    }
    const results = await ctx.db
      .query("users")
      .withSearchIndex("search_name", (q) => q.search("name", args.query))
      .collect();
    return results.filter((u) => u._id !== args.currentUserId);
  },
});

// Update online status (auth-secured)
export const updateOnlineStatus = mutation({
  args: { isOnline: v.boolean() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return; // Silently fail during sign-out / page close

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (user) {
      await ctx.db.patch(user._id, {
        isOnline: args.isOnline,
        lastSeen: Date.now(),
      });
    }
  },
});

// Get a user by ID
export const getById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});
