"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect } from "react";

export function useStoreUser() {
  const { isLoaded, isSignedIn } = useAuth();
  const storeUser = useMutation(api.users.store);
  const updateOnlineStatus = useMutation(api.users.updateOnlineStatus);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    // Sync user profile from auth token (no client args needed)
    storeUser({});

    // Set online
    updateOnlineStatus({ isOnline: true });

    // Set offline on page unload
    const handleBeforeUnload = () => {
      updateOnlineStatus({ isOnline: false });
    };

    // Toggle online status on visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updateOnlineStatus({ isOnline: false });
      } else {
        updateOnlineStatus({ isOnline: true });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isLoaded, isSignedIn, storeUser, updateOnlineStatus]);
}

export function useCurrentUser() {
  const { userId } = useAuth();
  const convexUser = useQuery(
    api.users.getByClerkId,
    userId ? { clerkId: userId } : "skip"
  );
  return convexUser;
}
