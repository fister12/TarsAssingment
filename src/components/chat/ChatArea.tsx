"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id, Doc } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Send,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { ChatHeader } from "./ChatHeader";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";

const PAGE_SIZE = 50;

interface ChatAreaProps {
  currentUser: Doc<"users">;
  conversationId: Id<"conversations">;
  onBack: () => void;
}

export function ChatArea({
  currentUser,
  conversationId,
  onBack,
}: ChatAreaProps) {
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showNewMessageButton, setShowNewMessageButton] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(0);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const conversation = useQuery(api.conversations.get, {
    conversationId,
  });

  const {
    results: paginatedResults,
    status: paginationStatus,
    loadMore,
  } = usePaginatedQuery(
    api.messages.list,
    { conversationId },
    { initialNumItems: PAGE_SIZE }
  );

  // Results come newest-first (desc), reverse for chronological display
  const messages = useMemo(
    () => [...paginatedResults].reverse(),
    [paginatedResults]
  );

  const typingUsers = useQuery(api.typing.getTyping, {
    conversationId,
  });

  const sendMessage = useMutation(api.messages.send);
  const markAsRead = useMutation(api.conversations.markAsRead);
  const setTypingMut = useMutation(api.typing.setTyping);
  const clearTypingMut = useMutation(api.typing.clearTyping);
  const softDelete = useMutation(api.messages.softDelete);
  const toggleReaction = useMutation(api.messages.toggleReaction);
  const toggleEphemeral = useMutation(api.conversations.toggleEphemeral);

  // Mark conversation as read when opened and when new messages arrive
  useEffect(() => {
    markAsRead({ conversationId });
  }, [conversationId, markAsRead, messages]);

  // Auto-scroll logic
  const scrollToBottom = useCallback(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
      setIsAtBottom(true);
      setShowNewMessageButton(false);
    }
  }, []);

  useEffect(() => {
    if (messages.length > lastMessageCountRef.current) {
      if (isAtBottom) {
        setTimeout(scrollToBottom, 50);
      } else {
        setShowNewMessageButton(true);
      }
      lastMessageCountRef.current = messages.length;
    }
  }, [messages, isAtBottom, scrollToBottom]);

  // Initial scroll to bottom
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(scrollToBottom, 100);
    }
  }, [conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollViewport = target.querySelector(
      "[data-radix-scroll-area-viewport]"
    );
    if (!scrollViewport) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollViewport;
    const atBottom = scrollHeight - scrollTop - clientHeight < 50;
    setIsAtBottom(atBottom);
    if (atBottom) {
      setShowNewMessageButton(false);
    }
  };

  const handleTyping = () => {
    setTypingMut({ conversationId });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      clearTypingMut({ conversationId });
    }, 2000);
  };

  const handleSend = async (text: string) => {
    setSendError(null);
    setFailedMessage(null);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    clearTypingMut({ conversationId });

    try {
      await sendMessage({ conversationId, content: text });
    } catch (error) {
      console.error("Failed to send message:", error);
      setSendError("Failed to send message. Click retry to try again.");
      setFailedMessage(text);
    }
  };

  const handleRetry = async () => {
    if (!failedMessage) return;
    const text = failedMessage;
    setFailedMessage(null);
    setSendError(null);

    try {
      await sendMessage({ conversationId, content: text });
    } catch (error) {
      console.error("Retry failed:", error);
      setSendError("Failed to send message. Click retry to try again.");
      setFailedMessage(text);
    }
  };

  const handleDeleteMessage = async (messageId: Id<"messages">) => {
    try {
      await softDelete({ messageId });
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  const handleToggleReaction = async (
    messageId: Id<"messages">,
    emoji: string
  ) => {
    try {
      await toggleReaction({ messageId, emoji });
    } catch (error) {
      console.error("Failed to toggle reaction:", error);
    }
  };

  const handleToggleEphemeral = async () => {
    try {
      await toggleEphemeral({ conversationId });
    } catch (error) {
      console.error("Failed to toggle ephemeral:", error);
    }
  };

  // Get conversation display info
  const displayName = conversation?.isGroup
    ? conversation.groupName || "Group"
    : conversation?.otherUser?.name || "Loading...";
  const displayImage = conversation?.isGroup
    ? undefined
    : conversation?.otherUser?.imageUrl;
  const isOtherOnline = conversation?.otherUser?.isOnline;
  const memberCount = conversation?.members?.length || 0;

  return (
    <div className="flex h-full flex-col">
      <ChatHeader
        displayName={displayName}
        displayImage={displayImage}
        isGroup={!!conversation?.isGroup}
        isOnline={isOtherOnline}
        memberCount={memberCount}
        isEphemeral={!!conversation?.isEphemeral}
        onBack={onBack}
        onToggleEphemeral={handleToggleEphemeral}
      />

      {/* Messages */}
      <div className="relative flex-1 overflow-hidden" onScroll={handleScroll}>
        <ScrollArea className="h-full" ref={scrollAreaRef}>
          <div className="flex flex-col gap-1 p-4">
            {/* Load more button */}
            {paginationStatus === "CanLoadMore" && (
              <div className="flex justify-center pb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => loadMore(PAGE_SIZE)}
                  className="text-xs text-muted-foreground"
                >
                  <ChevronUp className="mr-1 h-3 w-3" />
                  Load older messages
                </Button>
              </div>
            )}
            {paginationStatus === "LoadingMore" && (
              <div className="flex justify-center pb-2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}

            {paginationStatus === "LoadingFirstPage" ? (
              // Loading skeleton
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={`flex gap-2 ${i % 2 === 0 ? "justify-end" : ""}`}
                  >
                    {i % 2 !== 0 && (
                      <Skeleton className="h-8 w-8 rounded-full" />
                    )}
                    <div className="space-y-1">
                      <Skeleton
                        className={`h-10 ${
                          i % 3 === 0 ? "w-48" : i % 3 === 1 ? "w-64" : "w-36"
                        } rounded-xl`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              // Empty state
              <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Send className="h-7 w-7 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-semibold">No messages yet</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Send a message to start the conversation!
                </p>
              </div>
            ) : (
              messages.map((message, index) => {
                const isOwn = message.senderId === currentUser._id;
                const showAvatar =
                  !isOwn &&
                  (index === 0 ||
                    messages[index - 1].senderId !== message.senderId);

                return (
                  <MessageBubble
                    key={message._id}
                    message={message}
                    isOwn={isOwn}
                    showAvatar={showAvatar}
                    isGroup={!!conversation?.isGroup}
                    currentUserId={currentUser._id}
                    onDelete={handleDeleteMessage}
                    onToggleReaction={handleToggleReaction}
                  />
                );
              })
            )}

            {/* Typing indicator */}
            {typingUsers && typingUsers.length > 0 && (
              <div className="flex items-center gap-2 ml-10">
                <div className="rounded-2xl bg-muted px-3 py-2">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">
                      {typingUsers.length === 1
                        ? `${typingUsers[0].name} is typing`
                        : `${typingUsers.map((u) => u.name).join(", ")} are typing`}
                    </span>
                    <span className="flex gap-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {/* New messages button */}
        {showNewMessageButton && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs text-primary-foreground shadow-lg transition-all hover:bg-primary/90"
          >
            <ChevronDown className="h-3 w-3" />
            New messages
          </button>
        )}
      </div>

      {/* Error banner */}
      {sendError && (
        <div className="flex items-center gap-2 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="flex-1">{sendError}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRetry}
            className="h-7 text-destructive hover:text-destructive"
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            Retry
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSendError(null);
              setFailedMessage(null);
            }}
            className="h-7 text-destructive hover:text-destructive"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Message input */}
      <MessageInput onSend={handleSend} onTyping={handleTyping} />
    </div>
  );
}
