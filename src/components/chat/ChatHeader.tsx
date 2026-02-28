"use client";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, Users, MoreVertical, AlertCircle } from "lucide-react";

interface ChatHeaderProps {
  displayName: string;
  displayImage?: string;
  isGroup: boolean;
  isOnline?: boolean;
  memberCount: number;
  isEphemeral?: boolean;
  onBack: () => void;
  onToggleEphemeral: () => void;
}

export function ChatHeader({
  displayName,
  displayImage,
  isGroup,
  isOnline,
  memberCount,
  isEphemeral,
  onBack,
  onToggleEphemeral,
}: ChatHeaderProps) {
  return (
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
        {isGroup ? (
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
            {isOnline && (
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-green-500" />
            )}
          </>
        )}
      </div>

      <div className="flex-1">
        <h3 className="text-sm font-semibold">{displayName}</h3>
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">
            {isGroup
              ? `${memberCount} members`
              : isOnline
              ? "Online"
              : "Offline"}
          </p>
          {isEphemeral && (
            <span className="inline-flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
              <AlertCircle className="h-3 w-3" />
              Messages disappear
            </span>
          )}
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onToggleEphemeral}>
            {isEphemeral ? "Disable" : "Enable"} Disappearing Messages
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
