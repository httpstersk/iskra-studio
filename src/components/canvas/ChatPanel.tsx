"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Chat from "@/components/chat/chat";
import { CANVAS_STRINGS, ANIMATION, ARIA_LABELS } from "@/constants/canvas";

/**
 * Props for the ChatPanel component
 */
interface ChatPanelProps {
  customApiKey: string;
  onImageGenerated: (imageUrl: string) => void;
  setShowChat: (show: boolean) => void;
  showChat: boolean;
}

/**
 * ChatPanel component using Compound Component Pattern
 * Manages the chat interface with AI assistant
 */
export function ChatPanel({
  customApiKey,
  onImageGenerated,
  setShowChat,
  showChat,
}: ChatPanelProps) {
  return (
    <div className="fixed right-4 top-4 bottom-4 z-50">
      <AnimatePresence>
        {!showChat && (
          <ChatPanel.Button onClick={() => setShowChat(true)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showChat && (
          <ChatPanel.Panel
            customApiKey={customApiKey}
            onClose={() => setShowChat(false)}
            onImageGenerated={onImageGenerated}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Chat button component - shows when chat is closed
 */
const ChatButton = function ChatButton({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <motion.div
      animate={{ opacity: 1, scale: 1 }}
      className="absolute bottom-0 right-0"
      exit={{ opacity: 0, scale: 0.9 }}
      initial={{ opacity: 0, scale: 0.9 }}
    >
      <Button
        aria-label={ARIA_LABELS.CHAT_BUTTON}
        className="shadow-lg rounded-full h-14 w-14 md:w-auto md:h-auto md:rounded-lg"
        onClick={onClick}
        size="lg"
        variant="primary"
      >
        <MessageCircle className="h-5 w-5 md:mr-2" />
        <span className="hidden md:inline">{CANVAS_STRINGS.CHAT.BUTTON_LABEL}</span>
      </Button>
    </motion.div>
  );
};

ChatButton.displayName = "ChatPanel.Button";
ChatPanel.Button = ChatButton;

/**
 * Chat panel component - shows when chat is open
 */
const ChatPanelContent = function ChatPanelContent({
  customApiKey,
  onClose,
  onImageGenerated,
}: {
  customApiKey: string;
  onClose: () => void;
  onImageGenerated: (imageUrl: string) => void;
}) {
  return (
    <motion.div
      animate={{ opacity: 1, scale: 1, x: 0 }}
      aria-label={ARIA_LABELS.CHAT_PANEL}
      className="bg-card border rounded-2xl shadow-2xl w-[95vw] md:w-[500px] lg:w-[500px] h-full overflow-hidden flex flex-col"
      exit={{ opacity: 0, scale: 0.95, x: 20 }}
      initial={{ opacity: 0, scale: 0.95, x: 20 }}
      role="dialog"
      transition={{ duration: ANIMATION.CHAT_DURATION }}
    >
      <ChatPanel.Header onClose={onClose} />
      <ChatPanel.Content
        customApiKey={customApiKey}
        onImageGenerated={onImageGenerated}
      />
    </motion.div>
  );
};

ChatPanelContent.displayName = "ChatPanel.Panel";
ChatPanel.Panel = ChatPanelContent;

/**
 * Chat header component with title and close button
 */
const ChatHeader = function ChatHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="p-4 border-b flex items-center justify-between shrink-0 bg-muted/30">
      <div className="flex items-center gap-2">
        <div
          aria-hidden="true"
          className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center"
        >
          <MessageCircle className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">{CANVAS_STRINGS.CHAT.AI_ASSISTANT}</h3>
          <p className="text-xs text-muted-foreground">
            {CANVAS_STRINGS.CHAT.POWERED_BY}
          </p>
        </div>
      </div>
      <Button
        aria-label={ARIA_LABELS.CHAT_CLOSE}
        className="hover:bg-muted"
        onClick={onClose}
        size="icon-sm"
        variant="ghost"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

ChatHeader.displayName = "ChatPanel.Header";
ChatPanel.Header = ChatHeader;

/**
 * Chat content component wrapping the Chat component
 */
const ChatContent = function ChatContent({
  customApiKey,
  onImageGenerated,
}: {
  customApiKey: string;
  onImageGenerated: (imageUrl: string) => void;
}) {
  return (
    <div className="flex-1 overflow-hidden bg-background">
      <Chat customApiKey={customApiKey} onImageGenerated={onImageGenerated} />
    </div>
  );
};

ChatContent.displayName = "ChatPanel.Content";
ChatPanel.Content = ChatContent;
