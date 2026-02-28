"use client";

import { Id } from "../../../convex/_generated/dataModel";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import { MoreVertical, Trash2, SmilePlus } from "lucide-react";
import { formatMessageTime } from "@/lib/utils";

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "😅"];

interface MessageBubbleProps {
  message: {
    _id: Id<"messages">;
    content: string;
    senderId: Id<"users">;
    senderName: string;
    senderImageUrl: string;
    isDeleted: boolean;
    _creationTime: number;
    reactions?: Array<{ userId: Id<"users">; emoji: string }>;
  };
  isOwn: boolean;
  showAvatar: boolean;
  isGroup: boolean;
  currentUserId: Id<"users">;
  onDelete: (messageId: Id<"messages">) => void;
  onToggleReaction: (messageId: Id<"messages">, emoji: string) => void;
}

function ReactionPicker({
  messageId,
  onToggleReaction,
}: {
  messageId: Id<"messages">;
  onToggleReaction: (messageId: Id<"messages">, emoji: string) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <SmilePlus className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-1">
        <div className="flex gap-1">
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onToggleReaction(messageId, emoji)}
              className="rounded p-1 text-lg hover:bg-accent transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function MessageBubble({
  message,
  isOwn,
  showAvatar,
  isGroup,
  currentUserId,
  onDelete,
  onToggleReaction,
}: MessageBubbleProps) {
  return (
    <div className="group">
      <div
        className={`flex items-end gap-2 ${isOwn ? "justify-end" : ""}`}
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

        <div className={`relative max-w-[70%] ${isOwn ? "order-1" : ""}`}>
          {/* Sender name for group chats */}
          {!isOwn && showAvatar && isGroup && (
            <p className="mb-0.5 text-xs font-medium text-muted-foreground ml-3">
              {message.senderName}
            </p>
          )}

          <div>
            <div className="flex items-end gap-1">
              {/* Delete button for own messages */}
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
                        onClick={() => onDelete(message._id)}
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
                  <p className="text-sm">This message was deleted</p>
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

              {/* Reactions display */}
              {message.reactions && message.reactions.length > 0 && (
                <div className="flex items-center rounded-full border border-border bg-background px-2 py-1 gap-0.5">
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
                        r.emoji === emoji && r.userId === currentUserId
                    );
                    return (
                      <button
                        key={emoji}
                        onClick={() =>
                          onToggleReaction(message._id, emoji)
                        }
                        className={`cursor-pointer hover:scale-125 transition-transform rounded px-0.5 ${
                          hasReacted ? "bg-primary/20" : ""
                        }`}
                        title={`${emoji} ${count > 1 ? count : ""}`}
                      >
                        {emoji}
                        {count > 1 && (
                          <span className="text-[10px] ml-0.5">
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Reaction picker */}
              {!message.isDeleted && (
                <div
                  className={`opacity-0 group-hover:opacity-100 transition-opacity ${
                    isOwn ? "order-first" : ""
                  }`}
                >
                  <ReactionPicker
                    messageId={message._id}
                    onToggleReaction={onToggleReaction}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
