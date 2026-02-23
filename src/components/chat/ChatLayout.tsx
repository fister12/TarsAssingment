"use client";

import { useState } from "react";
import { useCurrentUser } from "@/hooks/useStoreUser";
import { Sidebar } from "./Sidebar";
import { ChatArea } from "./ChatArea";
import { Id } from "../../../convex/_generated/dataModel";

export function ChatLayout() {
  const currentUser = useCurrentUser();
  const [selectedConversationId, setSelectedConversationId] = useState<
    Id<"conversations"> | null
  >(null);
  const [showChat, setShowChat] = useState(false);

  if (!currentUser) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Setting up your profile...</p>
        </div>
      </div>
    );
  }

  const handleSelectConversation = (conversationId: Id<"conversations">) => {
    setSelectedConversationId(conversationId);
    setShowChat(true);
  };

  const handleBack = () => {
    setShowChat(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar - hidden on mobile when chat is open */}
      <div
        className={`${
          showChat ? "hidden md:flex" : "flex"
        } w-full md:w-80 lg:w-96 flex-col border-r`}
      >
        <Sidebar
          currentUser={currentUser}
          selectedConversationId={selectedConversationId}
          onSelectConversation={handleSelectConversation}
        />
      </div>

      {/* Chat area - hidden on mobile when sidebar is shown */}
      <div
        className={`${
          showChat ? "flex" : "hidden md:flex"
        } flex-1 flex-col`}
      >
        {selectedConversationId ? (
          <ChatArea
            currentUser={currentUser}
            conversationId={selectedConversationId}
            onBack={handleBack}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <svg
                  className="h-8 w-8 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold">Welcome to Tars Chat</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Select a conversation or find a user to start chatting
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
