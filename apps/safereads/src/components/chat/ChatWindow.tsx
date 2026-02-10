"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { Bot, Loader2 } from "lucide-react";

type ChatWindowProps = {
  conversationId: Id<"conversations">;
  onSend: (message: string) => void;
  isSending: boolean;
};

export function ChatWindow({
  conversationId,
  onSend,
  isSending,
}: ChatWindowProps) {
  const messages = useQuery(api.chat.getMessages, { conversationId });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        {messages === undefined ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-ink-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <Bot className="h-12 w-12 text-parchment-300" />
            <div>
              <p className="font-serif text-lg font-bold text-ink-700">
                Your Book Advisor
              </p>
              <p className="mt-1 text-sm text-ink-400">
                Ask me anything — book recommendations, age checks, or safer
                alternatives for your kids.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map(
              (msg: {
                _id: string;
                role: "user" | "assistant";
                content: string;
              }) => (
                <ChatMessage
                  key={msg._id}
                  role={msg.role}
                  content={msg.content}
                />
              )
            )}
            {isSending && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-parchment-200 text-ink-600">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-2xl bg-parchment-100 px-4 py-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-ink-400" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <ChatInput onSend={onSend} disabled={isSending} />
    </div>
  );
}
