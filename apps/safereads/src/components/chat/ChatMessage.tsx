"use client";

import { BookOpen, Bot, Search, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import type { Components } from "react-markdown";
import { Children, isValidElement, type ReactNode } from "react";

type ChatMessageProps = {
  role: "user" | "assistant";
  content: string;
};

function extractText(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (!node) return "";
  if (isValidElement(node)) {
    return extractText((node.props as { children?: ReactNode }).children);
  }
  if (Array.isArray(node)) {
    return Children.toArray(node).map(extractText).join("");
  }
  return "";
}

const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }) => {
    // Extract plain text from children (ReactMarkdown may wrap text in nodes)
    const text = extractText(children);
    if (text && /^[""\u201C]?[A-Z]/.test(text)) {
      const query = text.replace(/^[""\u201C]|[""\u201D]$/g, "");
      return (
        <Link
          href={`/dashboard/search?q=${encodeURIComponent(query)}`}
          className="my-1 inline-flex items-center gap-1.5 rounded-lg border border-parchment-300 bg-white/80 px-2.5 py-1 text-sm font-semibold text-parchment-800 shadow-sm transition-colors hover:border-parchment-400 hover:bg-white"
        >
          <BookOpen className="h-3.5 w-3.5 flex-shrink-0 text-parchment-500" />
          <span className="truncate">{children}</span>
          <Search className="h-3 w-3 flex-shrink-0 text-parchment-400" />
        </Link>
      );
    }
    return <strong className="font-semibold">{children}</strong>;
  },
  ul: ({ children }) => (
    <ul className="mb-2 list-disc pl-4 last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 list-decimal pl-4 last:mb-0">{children}</ol>
  ),
  li: ({ children }) => <li className="mb-1">{children}</li>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-parchment-700 underline hover:text-parchment-900"
    >
      {children}
    </a>
  ),
};

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser
            ? "bg-parchment-700 text-parchment-50"
            : "bg-parchment-200 text-ink-600"
        }`}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-parchment-700 text-parchment-50"
            : "bg-parchment-100 text-ink-800"
        }`}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap">{content}</div>
        ) : (
          <ReactMarkdown components={markdownComponents}>
            {content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}
