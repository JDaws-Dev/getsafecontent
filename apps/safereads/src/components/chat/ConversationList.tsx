"use client";

import { Plus, Trash2, MessageCircle } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";

type Conversation = {
  _id: Id<"conversations">;
  title: string;
  lastMessageAt: number;
};

type ConversationListProps = {
  conversations: Conversation[];
  activeId: Id<"conversations"> | null;
  onSelect: (id: Id<"conversations">) => void;
  onNew: () => void;
  onDelete: (id: Id<"conversations">) => void;
  hideHeader?: boolean;
};

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  hideHeader,
}: ConversationListProps) {
  return (
    <div className="flex h-full flex-col">
      {!hideHeader && (
        <div className="flex items-center justify-between border-b border-parchment-200 p-3">
          <h2 className="font-serif text-lg font-bold text-ink-900">Chats</h2>
          <button
            onClick={onNew}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-parchment-100 hover:text-ink-700"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-sm text-ink-400">
            No conversations yet
          </div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv._id}
              className={`group flex cursor-pointer items-center gap-2 border-b border-parchment-100 px-3 py-3 transition-colors hover:bg-parchment-100 ${
                activeId === conv._id ? "bg-parchment-100" : ""
              }`}
              onClick={() => onSelect(conv._id)}
            >
              <MessageCircle className="h-4 w-4 shrink-0 text-ink-400" />
              <span className="flex-1 truncate text-sm text-ink-700">
                {conv.title}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(conv._id);
                }}
                className="hidden h-6 w-6 shrink-0 items-center justify-center rounded text-ink-400 transition-colors hover:bg-parchment-200 hover:text-red-600 group-hover:flex"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
