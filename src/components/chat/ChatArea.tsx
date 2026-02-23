"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id, Doc } from "../../../convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Send,
  ChevronDown,
  Users,
  MoreVertical,
  Trash2,
  SmilePlus,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { formatMessageTime } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢"];

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
  const [messageText, setMessageText] = useState("");
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
    userId: currentUser._id,
  });

  const messages = useQuery(api.messages.list, { conversationId });

  const typingUsers = useQuery(api.typing.getTyping, {
    conversationId,
    currentUserId: currentUser._id,
  });

  const sendMessage = useMutation(api.messages.send);
  const markAsRead = useMutation(api.conversations.markAsRead);
  const setTyping = useMutation(api.typing.setTyping);
  const clearTyping = useMutation(api.typing.clearTyping);
  const softDelete = useMutation(api.messages.softDelete);
  const toggleReaction = useMutation(api.messages.toggleReaction);

  // Mark conversation as read when opened and when new messages arrive
  useEffect(() => {
    markAsRead({ conversationId, userId: currentUser._id });
  }, [conversationId, currentUser._id, markAsRead, messages]);

  // Auto-scroll logic
  const scrollToBottom = useCallback(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
      setIsAtBottom(true);
      setShowNewMessageButton(false);
    }
  }, []);

  useEffect(() => {
    if (messages && messages.length > lastMessageCountRef.current) {
      if (isAtBottom) {
        // Small delay to ensure DOM is updated
        setTimeout(scrollToBottom, 50);
      } else {
        setShowNewMessageButton(true);
      }
      lastMessageCountRef.current = messages.length;
    }
  }, [messages, isAtBottom, scrollToBottom]);

  // Initial scroll to bottom
  useEffect(() => {
    if (messages && messages.length > 0) {
      setTimeout(scrollToBottom, 100);
    }
  }, [conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollViewport = target.querySelector("[data-radix-scroll-area-viewport]");
    if (!scrollViewport) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollViewport;
    const atBottom = scrollHeight - scrollTop - clientHeight < 50;
    setIsAtBottom(atBottom);
    if (atBottom) {
      setShowNewMessageButton(false);
    }
  };

  const handleTyping = () => {
    setTyping({ conversationId, userId: currentUser._id });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      clearTyping({ conversationId, userId: currentUser._id });
    }, 2000);
  };

  const handleSend = async () => {
    const text = messageText.trim();
    if (!text) return;

    setMessageText("");
    setSendError(null);
    setFailedMessage(null);

    // Clear typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    clearTyping({ conversationId, userId: currentUser._id });

    try {
      await sendMessage({
        conversationId,
        senderId: currentUser._id,
        content: text,
      });
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
      await sendMessage({
        conversationId,
        senderId: currentUser._id,
        content: text,
      });
    } catch (error) {
      console.error("Retry failed:", error);
      setSendError("Failed to send message. Click retry to try again.");
      setFailedMessage(text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDeleteMessage = async (messageId: Id<"messages">) => {
    try {
      await softDelete({ messageId, userId: currentUser._id });
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  const handleToggleReaction = async (
    messageId: Id<"messages">,
    emoji: string
  ) => {
    try {
      await toggleReaction({ messageId, userId: currentUser._id, emoji });
    } catch (error) {
      console.error("Failed to toggle reaction:", error);
    }
  };

  // Get conversation display info
  const displayName = conversation?.isGroup
    ? conversation.groupName
    : conversation?.otherUser?.name || "Loading...";
  const displayImage = conversation?.isGroup
    ? undefined
    : conversation?.otherUser?.imageUrl;
  const isOtherOnline = conversation?.otherUser?.isOnline;
  const memberCount = conversation?.members?.length || 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="relative">
          {conversation?.isGroup ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Users className="h-5 w-5" />
            </div>
          ) : (
            <>
              <Avatar>
                <AvatarImage src={displayImage} />
                <AvatarFallback>
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {isOtherOnline && (
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-green-500" />
              )}
            </>
          )}
        </div>

        <div className="flex-1">
          <h3 className="text-sm font-semibold">{displayName}</h3>
          <p className="text-xs text-muted-foreground">
            {conversation?.isGroup
              ? `${memberCount} members`
              : isOtherOnline
              ? "Online"
              : "Offline"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="relative flex-1 overflow-hidden" onScroll={handleScroll}>
        <ScrollArea className="h-full" ref={scrollAreaRef}>
          <div className="flex flex-col gap-1 p-4">
            {messages === undefined ? (
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
                  <div key={message._id} className="group">
                    <div
                      className={`flex items-end gap-2 ${
                        isOwn ? "justify-end" : ""
                      }`}
                    >
                      {!isOwn && (
                        <div className="w-8">
                          {showAvatar && (
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={message.senderImageUrl} />
                              <AvatarFallback className="text-xs">
                                {message.senderName.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      )}

                      <div
                        className={`relative max-w-[70%] ${
                          isOwn ? "order-1" : ""
                        }`}
                      >
                        {/* Sender name for group chats */}
                        {!isOwn &&
                          showAvatar &&
                          conversation?.isGroup && (
                            <p className="mb-0.5 text-xs font-medium text-muted-foreground ml-3">
                              {message.senderName}
                            </p>
                          )}

                        <div className="flex items-center gap-1">
                          {/* Message actions */}
                          {isOwn && !message.isDeleted && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                  >
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleDeleteMessage(message._id)
                                    }
                                    className="text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete message
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}

                          {/* Message bubble */}
                          <div
                            className={`rounded-2xl px-3 py-2 ${
                              message.isDeleted
                                ? "bg-muted italic text-muted-foreground"
                                : isOwn
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            {message.isDeleted ? (
                              <p className="text-sm">
                                This message was deleted
                              </p>
                            ) : (
                              <p className="text-sm whitespace-pre-wrap break-words">
                                {message.content}
                              </p>
                            )}
                            <p
                              className={`text-[10px] mt-0.5 ${
                                message.isDeleted
                                  ? "text-muted-foreground/70"
                                  : isOwn
                                  ? "text-primary-foreground/70"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {formatMessageTime(message._creationTime)}
                            </p>
                          </div>

                          {/* Reaction button */}
                          {!message.isDeleted && !isOwn && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                  >
                                    <SmilePlus className="h-3 w-3" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-1">
                                  <div className="flex gap-1">
                                    {REACTION_EMOJIS.map((emoji) => (
                                      <button
                                        key={emoji}
                                        onClick={() =>
                                          handleToggleReaction(
                                            message._id,
                                            emoji
                                          )
                                        }
                                        className="rounded p-1 text-lg hover:bg-accent transition-colors"
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          )}

                          {/* Reaction button for own messages */}
                          {!message.isDeleted && isOwn && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity order-first">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                  >
                                    <SmilePlus className="h-3 w-3" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-1">
                                  <div className="flex gap-1">
                                    {REACTION_EMOJIS.map((emoji) => (
                                      <button
                                        key={emoji}
                                        onClick={() =>
                                          handleToggleReaction(
                                            message._id,
                                            emoji
                                          )
                                        }
                                        className="rounded p-1 text-lg hover:bg-accent transition-colors"
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          )}
                        </div>

                        {/* Reactions display */}
                        {message.reactions && message.reactions.length > 0 && (
                          <div
                            className={`flex flex-wrap gap-1 mt-1 ${
                              isOwn ? "justify-end" : "ml-3"
                            }`}
                          >
                            {Object.entries(
                              message.reactions.reduce(
                                (acc, r) => {
                                  acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                  return acc;
                                },
                                {} as Record<string, number>
                              )
                            ).map(([emoji, count]) => {
                              const hasReacted = message.reactions?.some(
                                (r) =>
                                  r.emoji === emoji &&
                                  r.userId === currentUser._id
                              );
                              return (
                                <button
                                  key={emoji}
                                  onClick={() =>
                                    handleToggleReaction(message._id, emoji)
                                  }
                                  className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-xs transition-colors ${
                                    hasReacted
                                      ? "border-primary bg-primary/10"
                                      : "border-border hover:bg-accent"
                                  }`}
                                >
                                  <span>{emoji}</span>
                                  <span className="text-muted-foreground">
                                    {count}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
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
      <div className="border-t px-4 py-3">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Type a message..."
            value={messageText}
            onChange={(e) => {
              setMessageText(e.target.value);
              handleTyping();
            }}
            onKeyDown={handleKeyDown}
            className="flex-1"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!messageText.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
