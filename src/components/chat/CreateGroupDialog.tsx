"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id, Doc } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Search, X } from "lucide-react";

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: Doc<"users">;
  onCreated: (conversationId: Id<"conversations">) => void;
}

export function CreateGroupDialog({
  open,
  onOpenChange,
  currentUser,
  onCreated,
}: CreateGroupDialogProps) {
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<Id<"users">[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const allUsers = useQuery(api.users.listAll, {
    currentUserId: currentUser._id,
  });

  const searchResults = useQuery(
    api.users.search,
    searchQuery.trim()
      ? { query: searchQuery, currentUserId: currentUser._id }
      : "skip"
  );

  const createGroup = useMutation(api.conversations.createGroup);

  const displayUsers = searchQuery.trim() ? searchResults : allUsers;

  const toggleUser = (userId: Id<"users">) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) return;

    const conversationId = await createGroup({
      creatorId: currentUser._id,
      memberIds: selectedUsers,
      groupName: groupName.trim(),
    });

    onCreated(conversationId);
    onOpenChange(false);
    setGroupName("");
    setSelectedUsers([]);
    setSearchQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Group Chat</DialogTitle>
          <DialogDescription>
            Give your group a name and add members.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder="Group name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />

          {/* Selected users */}
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {selectedUsers.map((userId) => {
                const user = displayUsers?.find((u) => u._id === userId) || 
                  allUsers?.find((u) => u._id === userId);
                if (!user) return null;
                return (
                  <Badge key={userId} variant="secondary" className="gap-1">
                    {user.name}
                    <button onClick={() => toggleUser(userId)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <ScrollArea className="h-48">
            {displayUsers?.map((user) => (
              <button
                key={user._id}
                onClick={() => toggleUser(user._id)}
                className="flex w-full items-center gap-3 rounded-lg p-2 hover:bg-accent transition-colors"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.imageUrl} />
                  <AvatarFallback className="text-xs">
                    {user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 text-left text-sm">{user.name}</span>
                {selectedUsers.includes(user._id) && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            ))}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setGroupName("");
              setSelectedUsers([]);
              setSearchQuery("");
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!groupName.trim() || selectedUsers.length === 0}
          >
            Create Group ({selectedUsers.length} members)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
