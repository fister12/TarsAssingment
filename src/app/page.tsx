"use client";

export const dynamic = "force-dynamic";

import { useAuth } from "@clerk/nextjs";
import { ChatLayout } from "@/components/chat/ChatLayout";
import { useStoreUser } from "@/hooks/useStoreUser";

export default function Home() {
  const { isLoaded, isSignedIn } = useAuth();
  useStoreUser();

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return null;
  }

  return <ChatLayout />;
}
