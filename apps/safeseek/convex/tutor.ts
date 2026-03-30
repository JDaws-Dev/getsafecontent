"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";

/**
 * Tutor mode — Socratic AI tutor that helps kids learn by asking questions back.
 */
export const sendMessage = action({
  args: {
    kidProfileId: v.id("kidProfiles"),
    messages: v.array(v.object({ role: v.string(), content: v.string() })),
    newMessage: v.string(),
  },
  handler: async (ctx, args) => {
    // Get kid profile
    const kidProfile = await ctx.runQuery(api.kidProfiles.getProfile, {
      kidProfileId: args.kidProfileId,
    });

    if (!kidProfile) {
      throw new Error("Kid profile not found");
    }

    // Check time limits (tutor counts as search activity)
    const searchCheck = await ctx.runQuery(api.timeLimits.canSearch, {
      kidProfileId: args.kidProfileId,
    });

    if (!searchCheck.canSearch) {
      return {
        response:
          searchCheck.reason === "outside_hours"
            ? "Tutor time is over for now. Come back during allowed hours!"
            : "You've reached your limit for today. Come back tomorrow!",
        flagged: false,
        blocked: true,
      };
    }

    const ageMin = kidProfile.ageRange.min;
    const ageMax = kidProfile.ageRange.max;
    const strictness = kidProfile.contentStrictness;
    const blockedTopics = kidProfile.blockedTopics || [];
    const allowedTopics = kidProfile.allowedTopics || [];
    const customInstructions = kidProfile.customInstructions || "";
    const lexileLevel = kidProfile.lexileLevel || "auto";
    const accessibilityNeeds = kidProfile.accessibilityNeeds || [];

    // Build reading level instruction
    let readingInstruction = "";
    if (lexileLevel !== "auto") {
      readingInstruction = `READING LEVEL: Write at a ${lexileLevel} grade level. Match vocabulary and sentence complexity to this level exactly.`;
    }

    // Build accessibility instruction
    let accessibilityInstruction = "";
    if (accessibilityNeeds.length > 0) {
      const parts: string[] = [];
      if (accessibilityNeeds.includes("dyslexia"))
        parts.push(
          "Use short sentences under 15 words. Use simple, common words."
        );
      if (accessibilityNeeds.includes("adhd"))
        parts.push("Keep responses very concise. Get to the point quickly.");
      if (accessibilityNeeds.includes("esl"))
        parts.push(
          "Use simple vocabulary. Define technical terms in parentheses."
        );
      if (accessibilityNeeds.includes("low-vision"))
        parts.push("Use clear, descriptive language.");
      accessibilityInstruction = `ACCESSIBILITY: ${parts.join(" ")}`;
    }

    const systemPrompt = `You are SafeStudy Tutor — a patient, encouraging AI tutor for kids aged ${ageMin}-${ageMax}. Content strictness: ${strictness}.

APPROACH:
- Use the Socratic method. Ask questions to guide the kid to the answer.
- Don't just give answers. Help them think through problems.
- For math: walk through step by step, ask "what do you think comes next?"
- For writing: ask about their ideas first, then help organize them
- For science/history: ask what they already know, build from there
- Celebrate when they get something right: "Exactly!" "Great thinking!"
- If they're stuck, give a hint, not the answer
- Keep responses SHORT (2-4 sentences max). This is a conversation, not a lecture.
- If they say "just tell me the answer", say "I know it's tempting, but you'll remember it better if we figure it out together. Here's a hint..."
${readingInstruction ? `\n${readingInstruction}` : ""}
${accessibilityInstruction ? `\n${accessibilityInstruction}` : ""}
${blockedTopics.length > 0 ? `\nSTRICTLY BLOCKED TOPICS — Do NOT discuss these under any circumstances. If asked, gently redirect: ${blockedTopics.join(", ")}` : ""}
${allowedTopics.length > 0 ? `\nALLOWED TOPICS (override blocks): ${allowedTopics.join(", ")}` : ""}
${customInstructions ? `\nPARENT INSTRUCTIONS: ${customInstructions}` : ""}

SAFETY:
- Never use URLs, links, or suggest visiting websites
- Keep all content appropriate for the child's age
- If the conversation goes off-topic into inappropriate territory, gently redirect
- Plain text only, no markdown formatting`;

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    // Build full message history for OpenAI
    const openaiMessages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemPrompt },
    ];

    // Add conversation history
    for (const msg of args.messages) {
      openaiMessages.push({
        role: msg.role === "kid" ? "user" : "assistant",
        content: msg.content,
      });
    }

    // Add the new message
    openaiMessages.push({ role: "user", content: args.newMessage });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: openaiMessages,
        temperature: 0.3,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[tutor] OpenAI API error:", errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from tutor");
    }

    // Check if response was flagged (simple heuristic — if AI redirected)
    const flagged =
      content.toLowerCase().includes("not appropriate") ||
      content.toLowerCase().includes("can't help with that") ||
      content.toLowerCase().includes("let's talk about something else");

    // Save to tutor session
    try {
      const allMessages = [
        ...args.messages.map((m) => ({
          role: m.role,
          content: m.content,
          timestamp: Date.now() - 1000,
        })),
        { role: "kid", content: args.newMessage, timestamp: Date.now() },
        { role: "tutor", content, timestamp: Date.now() },
      ];

      await ctx.runMutation(internal.tutorSessions.saveTutorSession, {
        kidProfileId: args.kidProfileId,
        messages: allMessages,
        topic: args.newMessage.slice(0, 100),
      });
    } catch (err) {
      // Don't fail the response if session save fails
      console.error("[tutor] Failed to save session:", err);
    }

    return {
      response: content,
      flagged,
    };
  },
});
