import { v } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import OpenAI from "openai";

/**
 * List all conversations for a user, newest first.
 */
export const listConversations = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

/**
 * Get all messages for a conversation.
 */
export const getMessages = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();
  },
});

/**
 * Create a new conversation.
 */
export const createConversation = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("conversations", {
      userId: args.userId,
      title: args.title,
      lastMessageAt: Date.now(),
    });
  },
});

/**
 * Delete a conversation and all its messages.
 */
export const deleteConversation = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();
    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }
    await ctx.db.delete(args.conversationId);
  },
});

/**
 * Internal mutation: store a message.
 */
export const storeMessage = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      role: args.role,
      content: args.content,
    });
    await ctx.db.patch(args.conversationId, {
      lastMessageAt: Date.now(),
    });
  },
});

/**
 * Internal mutation: update conversation title.
 */
export const updateTitle = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, { title: args.title });
  },
});

/**
 * Internal query: get messages for context loading.
 */
export const getMessagesInternal = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();
  },
});

/**
 * Internal query: get conversation by ID.
 */
export const getConversationInternal = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.conversationId);
  },
});

/**
 * Internal query: get kids for a user (for chat context).
 */
export const getKidsInternal = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("kids")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

/**
 * Send a message in a conversation and get an AI response.
 *
 * Flow:
 * 1. Store the user message
 * 2. Load context (kids, recent analyses, conversation history)
 * 3. Call GPT-4o
 * 4. Store the assistant response
 * 5. Auto-title from first message if conversation is new
 */
export const sendMessage = action({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Store user message
    await ctx.runMutation(internal.chat.storeMessage, {
      conversationId: args.conversationId,
      role: "user",
      content: args.content,
    });

    // 2. Load context
    const conversation = await ctx.runQuery(
      internal.chat.getConversationInternal,
      { conversationId: args.conversationId }
    );
    if (!conversation) throw new Error("Conversation not found");

    const [messages, kids, recentAnalyses] = await Promise.all([
      ctx.runQuery(internal.chat.getMessagesInternal, {
        conversationId: args.conversationId,
      }),
      ctx.runQuery(internal.chat.getKidsInternal, {
        userId: conversation.userId,
      }),
      ctx.runQuery(internal.analyses.listRecentInternal, { count: 5 }),
    ]);

    // Build context strings
    const kidsContext =
      kids.length > 0
        ? `\n\nThe parent has these children:\n${kids
            .map(
              (k: { name: string; age?: number }) =>
                `- ${k.name}${k.age ? ` (age ${k.age})` : ""}`
            )
            .join("\n")}`
        : "";

    const analysesContext =
      recentAnalyses.length > 0
        ? `\n\nRecently reviewed books on SafeReads:\n${recentAnalyses
            .map(
              (a: {
                book?: { title: string; authors: string[] } | null;
                verdict: string;
                ageRecommendation?: string;
                summary: string;
              }) =>
                a.book
                  ? `- "${a.book.title}" by ${a.book.authors.join(", ")} — Verdict: ${a.verdict}${a.ageRecommendation ? ` (${a.ageRecommendation})` : ""}: ${a.summary}`
                  : null
            )
            .filter(Boolean)
            .join("\n")}`
        : "";

    // Last 20 messages for OpenAI context
    const recentMessages = messages.slice(-20);
    const openaiMessages: Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }> = [
      {
        role: "system",
        content: CHAT_SYSTEM_PROMPT + kidsContext + analysesContext,
      },
      ...recentMessages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    // 3. Call GPT-4o
    const openai = new OpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: openaiMessages,
    });

    const assistantContent =
      completion.choices[0]?.message?.content ??
      "I'm sorry, I wasn't able to generate a response. Please try again.";

    // 4. Store assistant response
    await ctx.runMutation(internal.chat.storeMessage, {
      conversationId: args.conversationId,
      role: "assistant",
      content: assistantContent,
    });

    // 5. Auto-title from first user message if title is "New conversation"
    if (conversation.title === "New conversation") {
      const autoTitle =
        args.content.length > 50
          ? args.content.slice(0, 47) + "..."
          : args.content;
      await ctx.runMutation(internal.chat.updateTitle, {
        conversationId: args.conversationId,
        title: autoTitle,
      });
    }

    return assistantContent;
  },
});

const CHAT_SYSTEM_PROMPT = `You are SafeReads Advisor, a friendly and knowledgeable AI assistant that helps parents make informed decisions about books for their children.

You can help with:
- Book recommendations based on age, interests, and content preferences
- Age-appropriateness questions about specific books
- Understanding content warnings and what they mean in practice
- Finding alternatives to books that may not be suitable
- General reading guidance and literacy tips

Guidelines:
- Be warm, supportive, and non-judgmental — every family has different values
- Give specific, actionable advice
- When recommending books, mention the target age range
- If you're unsure about a specific book's content, say so honestly
- Keep responses concise but helpful
- Reference the parent's kids by name when relevant (context provided below)
- Reference recently reviewed books when relevant (context provided below)
- Format responses with markdown for readability (bold, lists, etc.)`;
