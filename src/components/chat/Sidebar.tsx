"use client";

import { useState } from "react";
import { UserButton } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id, Doc } from "../../../convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Users, MessageSquare, AlertCircle } from "lucide-react";
import { formatMessageTime } from "@/lib/utils";
import { CreateGroupDialog } from "./CreateGroupDialog";

interface SidebarProps {
  currentUser: Doc<"users">;
  selectedConversationId: Id<"conversations"> | null;
  onSelectConversation: (conversationId: Id<"conversations">) => void;
}

export function Sidebar({
  currentUser,
  selectedConversationId,
  onSelectConversation,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showGroupDialog, setShowGroupDialog] = useState(false);

  const conversations = useQuery(api.conversations.list, {
    userId: currentUser._id,
  });

  const searchResults = useQuery(
    api.users.search,
    searchQuery.trim()
      ? { query: searchQuery, currentUserId: currentUser._id }
      : "skip"
  );

  const allUsers = useQuery(api.users.listAll, {
    currentUserId: currentUser._id,
  });

  const getOrCreateDM = useMutation(api.conversations.getOrCreateDM);

  const handleUserClick = async (userId: Id<"users">) => {
    const conversationId = await getOrCreateDM({
      currentUserId: currentUser._id,
      otherUserId: userId,
    });
    onSelectConversation(conversationId);
    setShowUserSearch(false);
    setSearchQuery("");
  };

  const displayUsers = searchQuery.trim() ? searchResults : allUsers;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <UserButton afterSignOutUrl="/sign-in" />
          <div>
            <h2 className="text-sm font-semibold">{currentUser.name}</h2>
            <p className="text-xs text-muted-foreground">Online</p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowGroupDialog(true)}
            title="Create group"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowUserSearch(!showUserSearch)}
            title="Find users"
          >
            <Users className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={showUserSearch ? "Search users..." : "Search conversations..."}
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* User search results */}
      {showUserSearch && (
        <ScrollArea className="flex-1">
          <div className="px-2">
            <p className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase">
              Users
            </p>
            {displayUsers === undefined ? (
              <div className="space-y-2 p-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-2">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            ) : displayUsers.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Users className="h-10 w-10 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? "No users found" : "No other users yet"}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {searchQuery
                    ? "Try a different search term"
                    : "Invite friends to join!"}
                </p>
              </div>
            ) : (
              displayUsers.map((user) => (
                <button
                  key={user._id}
                  onClick={() => handleUserClick(user._id)}
                  className="flex w-full items-center gap-3 rounded-lg p-2 hover:bg-accent transition-colors"
                >
                  <div className="relative">
                    <Avatar>
                      <AvatarImage src={user.imageUrl} />
                      <AvatarFallback>
                        {user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {user.isOnline && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-green-500" />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.isOnline ? "Online" : "Offline"}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      )}

      {/* Conversation list */}
      {!showUserSearch && (
        <ScrollArea className="flex-1">
          <div className="px-2">
            {conversations === undefined ? (
              <div className="space-y-2 p-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-2">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center px-4">
                <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <h3 className="text-sm font-semibold">No conversations yet</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Click the <Users className="inline h-3 w-3" /> icon above to find users and start chatting
                </p>
              </div>
            ) : (
              conversations
                .filter((conv) => {
                  if (!searchQuery.trim()) return true;
                  const name = conv.isGroup
                    ? conv.groupName
                    : conv.otherUser?.name;
                  return name
                    ?.toLowerCase()
                    .includes(searchQuery.toLowerCase());
                })
                .map((conv) => (
                  <button
                    key={conv._id}
                    onClick={() => onSelectConversation(conv._id)}
                    className={`flex w-full items-center gap-3 rounded-lg p-2 transition-colors ${
                      selectedConversationId === conv._id
                        ? "bg-accent"
                        : "hover:bg-accent/50"
                    }`}
                  >
                    <div className="relative">
                      {conv.isGroup ? (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Users className="h-5 w-5" />
                        </div>
                      ) : (
                        <>
                          <Avatar>
                            <AvatarImage src={conv.otherUser?.imageUrl} />
                            <AvatarFallback>
                              {conv.otherUser?.name?.charAt(0)?.toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                          {conv.otherUser?.isOnline && (
                            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-green-500" />
                          )}
                        </>
                      )}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">
                            {conv.isGroup
                              ? conv.groupName
                              : conv.otherUser?.name || "Unknown"}
                          </p>
                          {conv.isEphemeral && (
                            <AlertCircle className="h-3 w-3 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                          )}
                        </div>
                        {conv.lastMessageTime && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                            {formatMessageTime(conv.lastMessageTime)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.lastMessagePreview || "No messages yet"}
                        </p>
                        {conv.unreadCount > 0 && (
                          <Badge
                            variant="default"
                            className="ml-2 h-5 min-w-[20px] rounded-full px-1.5 text-xs"
                          >
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))
            )}
          </div>
        </ScrollArea>
      )}

      {/* Group dialog */}
      <CreateGroupDialog
        open={showGroupDialog}
        onOpenChange={setShowGroupDialog}
        currentUser={currentUser}
        onCreated={onSelectConversation}
      />
    </div>
  );
}
