"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { ArrowLeft, Bot, History } from "lucide-react";
import { ChatInput } from "@/components/chat/ChatInput";

const SUGGESTED_PROMPTS = [
  "What should my 8-year-old read next?",
  "Is Hunger Games ok for a 12-year-old?",
  "Books like Harry Potter but less scary",
];

export default function ChatPage() {
  const currentUser = useQuery(api.users.currentUser);

  const conversations = useQuery(
    api.chat.listConversations,
    currentUser?._id ? { userId: currentUser._id } : "skip"
  );

  const createConversation = useMutation(api.chat.createConversation);
  const deleteConversation = useMutation(api.chat.deleteConversation);
  const sendMessage = useAction(api.chat.sendMessage);

  const [activeConversationId, setActiveConversationId] =
    useState<Id<"conversations"> | null>(null);
  const [isSending, setIsSending] = useState(false);
  // Mobile: show history list (false = show chat/welcome, true = show history)
  const [showHistory, setShowHistory] = useState(false);

  const handleSelectConversation = useCallback(
    (id: Id<"conversations">) => {
      setActiveConversationId(id);
      setShowHistory(false);
    },
    []
  );

  const handleDeleteConversation = useCallback(
    async (id: Id<"conversations">) => {
      await deleteConversation({ conversationId: id });
      if (activeConversationId === id) {
        setActiveConversationId(null);
      }
    },
    [deleteConversation, activeConversationId]
  );

  const handleNewChat = useCallback(() => {
    setActiveConversationId(null);
    setShowHistory(false);
  }, []);

  const handleSend = useCallback(
    async (content: string) => {
      if (!activeConversationId) return;
      setIsSending(true);
      try {
        await sendMessage({
          conversationId: activeConversationId,
          content,
        });
      } catch (err) {
        console.error("Failed to send message:", err);
      } finally {
        setIsSending(false);
      }
    },
    [activeConversationId, sendMessage]
  );

  // Send from the welcome screen — auto-create conversation first
  const handleWelcomeSend = useCallback(
    async (content: string) => {
      if (!currentUser?._id) return;
      setIsSending(true);
      try {
        const id = await createConversation({
          userId: currentUser._id,
          title: "New conversation",
        });
        setActiveConversationId(id);
        await sendMessage({ conversationId: id, content });
      } catch (err) {
        console.error("Failed to send message:", err);
      } finally {
        setIsSending(false);
      }
    },
    [currentUser?._id, createConversation, sendMessage]
  );

  if (!currentUser) {
    return (
      <div className="flex h-[calc(100vh-12rem)] items-center justify-center sm:h-[calc(100vh-8rem)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-parchment-300 border-t-parchment-700" />
      </div>
    );
  }

  return (
    <div className="mx-auto h-[calc(100vh-12rem)] max-w-5xl px-4 py-4 sm:h-[calc(100vh-8rem)]">
      <div className="flex h-full overflow-hidden rounded-xl border border-parchment-200 bg-white">
        {/* Desktop sidebar — always visible on sm+ */}
        <div className="hidden shrink-0 border-r border-parchment-200 sm:block sm:w-72">
          <ConversationList
            conversations={(conversations ?? []) as Array<{
              _id: Id<"conversations">;
              title: string;
              lastMessageAt: number;
            }>}
            activeId={activeConversationId}
            onSelect={handleSelectConversation}
            onNew={handleNewChat}
            onDelete={handleDeleteConversation}
          />
        </div>

        {/* Mobile: history list (only shown when user taps history button) */}
        {showHistory && (
          <div className="flex w-full flex-col sm:hidden">
            <div className="flex items-center gap-2 border-b border-parchment-200 p-3">
              <button
                onClick={() => setShowHistory(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 hover:bg-parchment-100"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <span className="text-sm font-medium text-ink-700">
                Past Chats
              </span>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ConversationList
                conversations={(conversations ?? []) as Array<{
                  _id: Id<"conversations">;
                  title: string;
                  lastMessageAt: number;
                }>}
                activeId={activeConversationId}
                onSelect={handleSelectConversation}
                onNew={handleNewChat}
                onDelete={handleDeleteConversation}
                hideHeader
              />
            </div>
          </div>
        )}

        {/* Main chat area — always visible on desktop, visible on mobile when not showing history */}
        <div
          className={`flex flex-1 flex-col ${showHistory ? "hidden sm:flex" : "flex"}`}
        >
          {activeConversationId ? (
            <div className="flex h-full flex-col">
              {/* Mobile header with history button */}
              <div className="flex items-center justify-between border-b border-parchment-200 p-3 sm:hidden">
                <span className="truncate text-sm font-medium text-ink-700">
                  {(conversations ?? []).find(
                    (c: { _id: Id<"conversations"> }) =>
                      c._id === activeConversationId
                  )?.title ?? "Chat"}
                </span>
                <button
                  onClick={() => setShowHistory(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 hover:bg-parchment-100"
                >
                  <History className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <ChatWindow
                  conversationId={activeConversationId}
                  onSend={handleSend}
                  isSending={isSending}
                />
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col">
              {/* Mobile history button on welcome screen */}
              {(conversations ?? []).length > 0 && (
                <div className="flex items-center justify-end p-3 sm:hidden">
                  <button
                    onClick={() => setShowHistory(true)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-ink-500 hover:bg-parchment-100"
                  >
                    <History className="h-4 w-4" />
                    Past chats
                  </button>
                </div>
              )}
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
                <Bot className="h-16 w-16 text-parchment-200" />
                <div>
                  <p className="font-serif text-xl font-bold text-ink-700">
                    Your Book Advisor
                  </p>
                  <p className="mt-1 text-sm text-ink-400">
                    Ask me anything about kids&apos; books — I can recommend
                    titles, check if a book is right for your child, or find
                    safer alternatives.
                  </p>
                </div>
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handleWelcomeSend(prompt)}
                      disabled={isSending}
                      className="rounded-full border border-parchment-300 bg-white px-4 py-2 text-xs font-medium text-ink-600 transition-colors hover:border-parchment-500 hover:bg-parchment-50 disabled:opacity-50"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
              <ChatInput onSend={handleWelcomeSend} disabled={isSending} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
