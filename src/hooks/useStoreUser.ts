"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect } from "react";

export function useStoreUser() {
  const { user, isLoaded } = useUser();
  const storeUser = useMutation(api.users.store);
  const updateOnlineStatus = useMutation(api.users.updateOnlineStatus);

  useEffect(() => {
    if (!isLoaded || !user) return;

    storeUser({
      clerkId: user.id,
      name: user.fullName || user.firstName || "Anonymous",
      email: user.primaryEmailAddress?.emailAddress || "",
      imageUrl: user.imageUrl || "",
    });

    // Set online
    updateOnlineStatus({ clerkId: user.id, isOnline: true });

    // Set offline on page unload
    const handleBeforeUnload = () => {
      updateOnlineStatus({ clerkId: user.id, isOnline: false });
    };

    // Set offline on visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updateOnlineStatus({ clerkId: user.id, isOnline: false });
      } else {
        updateOnlineStatus({ clerkId: user.id, isOnline: true });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isLoaded, user, storeUser, updateOnlineStatus]);
}

export function useCurrentUser() {
  const { user } = useUser();
  const convexUser = useQuery(
    api.users.getByClerkId,
    user ? { clerkId: user.id } : "skip"
  );
  return convexUser;
}
