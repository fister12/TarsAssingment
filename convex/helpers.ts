import { QueryCtx, MutationCtx } from "./_generated/server";

/**
 * Get the authenticated user from the auth token.
 * Throws if not authenticated or user not found.
 */
export async function getAuthenticatedUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();

  if (!user) {
    throw new Error("User not found in database");
  }

  return user;
}

/**
 * Get the authenticated user if available, or null.
 * Used for queries that should return empty results when not authenticated.
 */
export async function getOptionalUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();
}
