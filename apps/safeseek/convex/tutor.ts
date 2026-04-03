"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { sanitizeQuery, detectPromptInjection, filterResponse } from "./ai/inputFilter";

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

    // Check subscription status before any AI calls
    const subCheck = await ctx.runQuery(internal.users.checkSubscriptionActive, {
      userId: kidProfile.userId,
    });
    if (!subCheck.allowed) {
      return {
        response: subCheck.message,
        flagged: false,
        blocked: true,
      };
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

    // Rate limit check
    const rateCheck = await ctx.runMutation(api.rateLimit.checkAndRecord, {
      userId: kidProfile.userId,
      action: "tutor",
    });
    if (!rateCheck.allowed) {
      return {
        response: rateCheck.message || "You're sending messages too fast! Please wait a moment and try again.",
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
- TEACH first, then ask a follow-up question. Every response should give the kid real information AND then ask one question to check understanding or spark curiosity.
- For quick factual questions: give the answer directly, then add "Did you know..." or "Want to know more about..."
- For homework/problem-solving: explain the concept, show an example, THEN ask them to try one
- For math: show the steps clearly, then ask "Can you try the next one?"
- For writing: give concrete suggestions and examples, then ask what they think
- Celebrate when they get something right: "Exactly!" "Great thinking!"
- If they're confused: explain it a different way, don't just ask another question
- Keep responses SHORT (3-5 sentences). Teach something real in every message.
- Balance: 70% teaching/explaining, 30% asking questions
- If they say "just tell me": go ahead and tell them clearly, then ask if it makes sense
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

    // --- Pre-filter: sanitize and check for prompt injection ---
    const sanitizedMessage = sanitizeQuery(args.newMessage);
    const injectionCheck = detectPromptInjection(sanitizedMessage);

    if (!injectionCheck.safe) {
      console.warn(`[tutor] Prompt injection blocked: ${injectionCheck.reason} | message: "${args.newMessage.slice(0, 100)}"`);
      return {
        response: "I can't help with that question. Try asking something else!",
        flagged: true,
        blocked: true,
      };
    }

    // Also check conversation history for gradual manipulation
    for (const msg of args.messages) {
      if (msg.role === "kid") {
        const historyCheck = detectPromptInjection(msg.content);
        if (!historyCheck.safe) {
          console.warn(`[tutor] Injection detected in conversation history: ${historyCheck.reason}`);
          return {
            response: "Let's start a new conversation! What would you like to learn about?",
            flagged: true,
            blocked: true,
          };
        }
      }
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    // Build full message history for OpenAI
    const openaiMessages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemPrompt },
    ];

    // Add conversation history (sanitize each kid message)
    for (const msg of args.messages) {
      openaiMessages.push({
        role: msg.role === "kid" ? "user" : "assistant",
        content: msg.role === "kid" ? sanitizeQuery(msg.content) : msg.content,
      });
    }

    // Add the new message (sanitized)
    openaiMessages.push({ role: "user", content: sanitizedMessage });

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

    // --- Response filtering: check AI output for unsafe content ---
    const responseCheck = filterResponse(content, blockedTopics);
    let finalContent = content;

    if (!responseCheck.safe) {
      console.warn(`[tutor] Response filtered: ${responseCheck.reason}`);
      finalContent = "Hmm, let me think of a better way to explain that. Can you ask me again in a different way?";
    } else if (responseCheck.cleaned) {
      finalContent = responseCheck.cleaned;
    }

    // Check if response was flagged (simple heuristic — if AI redirected)
    const flagged =
      !responseCheck.safe ||
      finalContent.toLowerCase().includes("not appropriate") ||
      finalContent.toLowerCase().includes("can't help with that") ||
      finalContent.toLowerCase().includes("let's talk about something else");

    // Save to tutor session
    try {
      const allMessages = [
        ...args.messages.map((m) => ({
          role: m.role,
          content: m.content,
          timestamp: Date.now() - 1000,
        })),
        { role: "kid", content: args.newMessage, timestamp: Date.now() },
        { role: "tutor", content: finalContent, timestamp: Date.now() },
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
      response: finalContent,
      flagged,
    };
  },
});
