"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

interface MessageInputProps {
  onSend: (text: string) => void;
  onTyping: () => void;
}

export function MessageInput({ onSend, onTyping }: MessageInputProps) {
  const [messageText, setMessageText] = useState("");

  const handleSend = () => {
    const text = messageText.trim();
    if (!text) return;
    setMessageText("");
    onSend(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t px-4 py-3">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Type a message..."
          value={messageText}
          onChange={(e) => {
            setMessageText(e.target.value);
            onTyping();
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
  );
}
