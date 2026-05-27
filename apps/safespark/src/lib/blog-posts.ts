// Hidden blog — not linked in the main nav. Indexed by Google via sitemap.
// Plain TS so new posts can be added without MDX tooling. Each `body` is
// markdown-flavored plain text rendered by a simple component in
// /blog/[slug]. Add a post by appending to BLOG_POSTS.

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string; // YYYY-MM-DD
  readingMinutes: number;
  author: string;
  tags: string[];
  body: string; // markdown
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'what-is-safespark',
    title: 'What is SafeSpark?',
    description:
      'SafeSpark is a safe way for kids ages 10-13 to build real games, flashcards, posters, and tools with AI — in plain language, with parent visibility.',
    publishedAt: '2026-05-26',
    readingMinutes: 3,
    author: 'Safe Family',
    tags: ['intro', 'safe ai for kids', 'product'],
    body: `SafeSpark is a kid-safe AI maker. Your kid talks to **Spark** (the assistant) in plain words — *"make a Pokemon battle game"*, *"make flashcards for state capitals"*, *"make a poster for my lemonade stand"* — and Spark builds a real, playable, shareable project on the spot.

## Who it's for

Kids ages 10-13. Old enough to imagine real things they want to build. Young enough that the open-ended **"ask AI anything"** chat box is overwhelming and unsafe. SafeSpark gives them a making tool, not a chatbot.

## What kids actually make on it

- **Games**: Pokemon battles, endless runners, shield-defense games, boss fights.
- **Study tools**: flashcards from state capitals, multiple-choice quizzes, vocabulary practice.
- **Posters and flyers**: for a lemonade stand, a garbage-can cleaning business, a birthday party.
- **Trackers and tools**: habit trackers, name generators, dice rollers, sound boards.
- **Photo restyles**: upload a photo of your dog, ask Spark to draw it as a Pixar character, ship the result.

## What makes it safe

- **No social-media patterns**, no gambling, no violence or gore, no collecting private information.
- **Style requests get redirected, not lectured**: "Pixar style" silently becomes "warm 3D cartoon lighting," not an IP disclaimer.
- **Hard topics get routed to parents**: sex education, identity, drugs, suicide, politics. Spark says one short line and offers a safe project instead.
- **Image restyles strip unsafe modifiers** before they reach the model. OpenAI moderation runs as a second layer.
- **Parent dashboard** at /parent shows every project, every prompt, monthly usage.

## How the family login works

One parent, one email, one **6-character family code**. Kids type the code on their device at \`/start\`, pick their profile, and start making. No password. No email for kids. Same pattern as the other Safe Family apps.

## Free to try

We're not charging yet. Sign up at [getsafespark.com](https://getsafespark.com) and start making.`,
  },
  {
    slug: 'how-to-teach-kids-to-use-ai',
    title: 'How to teach a 10-year-old to use AI without it teaching them bad habits',
    description:
      'Three habits we build into SafeSpark on purpose: asking for clarity, iterating instead of restarting, and owning the final product.',
    publishedAt: '2026-05-26',
    readingMinutes: 4,
    author: 'Safe Family',
    tags: ['parenting', 'ai literacy', 'how-to'],
    body: `Every kid your age is going to use AI. The question is whether they pick up good habits or bad ones along the way.

Here are three habits SafeSpark builds into the product on purpose.

## 1. Spark asks before it guesses

When a kid types *"make a game"*, Spark doesn't just spit out a random Pong clone. It asks **one short question with 2-3 picks**: *"Battle / Endless runner / Puzzle — which?"*

Why this matters: kids who learn to **clarify before building** with AI grow up to clarify before building with anyone. It teaches the skill of saying *"what kind of game do you mean?"* instead of saying *"sure, here's a thing!"*

## 2. Every change is undoable

When you tap **↶ Undo last change** under a Spark reply, you don't lose anything. The version you just left becomes a new entry in your project's history. You can keep going back, or forward, or sideways.

Why this matters: real making is iterating. Kids who only know "start over" never learn to refine. SafeSpark teaches that **a draft is a starting point**, not a commitment.

## 3. The kid is the author

The reply text always belongs to the kid, not the AI. When Spark generates a game, it says *"Built it! ✓ Boss added at level 3"* — not *"I made you a game."* The kid is steering. The AI is the keyboard.

This shows up in:
- **Undo controls** belong to the kid, not the AI.
- **Version history** is the kid's design log.
- **Share links** are *"my project"*, not *"AI made this."*

Kids who grow up with this framing don't develop the *"AI did it for me"* helplessness. They learn that the prompts they write and the changes they accept are theirs.

## Try it

Sign up at [getsafespark.com](https://getsafespark.com). The first time your kid says *"make me a game"*, watch what Spark does. That moment alone is the lesson.`,
  },
  {
    slug: 'safe-ai-for-kids-checklist',
    title: 'A parent\'s checklist for picking a safe AI app for kids',
    description:
      'Eight questions to ask before letting your kid use any AI app: data, identity, ownership, redirects, moderation, controls, transparency, and cost.',
    publishedAt: '2026-05-26',
    readingMinutes: 5,
    author: 'Safe Family',
    tags: ['parenting', 'safety', 'checklist'],
    body: `Before you hand your kid an AI app, ask these eight questions. SafeSpark answers all eight — but the checklist itself works for any app.

### 1. Whose account is it under?

Is it the parent's email and login, with kid profiles underneath? Or is the kid signing up themselves with their own email? Kids under 13 should never be the account holder.

**SafeSpark**: parent signs up with email, gets a family code. Kids log in on their device with the code; no email or password.

### 2. What happens when a kid asks about sex, identity, drugs, suicide, or politics?

Look for an app that **routes hard topics back to parents** with one short line, then offers a safe alternative. Avoid apps that lecture, avoid apps that engage.

**SafeSpark**: *"That's a great one for your parents — I'm here for the building stuff."* Then offers a project the kid might enjoy.

### 3. Can the AI generate or remix unsafe imagery?

Test it. Try asking for things you wouldn't want your kid seeing. A safe app refuses cleanly. A good app refuses *and* redirects to something fun.

**SafeSpark**: image restyles strip unsafe modifiers before the API call. OpenAI moderation runs as a second layer. The model is told to **never** produce photorealistic depictions and to keep everything cartoon / illustration style.

### 4. Where does the kid's data live?

Saved projects, chat history, uploaded images — is it on the kid's browser only, or on a server tied to a known account? Both have trade-offs. Browser-only means lost-on-cache-clear. Server-tied means a real account with a known retention policy.

**SafeSpark**: signed in → server (Convex), tied to parent's email, retained until parent deletes. Signed out → browser only.

### 5. Can a parent see what the kid did?

A parent dashboard listing recent projects, recent prompts, and monthly usage is the right standard. Anything less is "trust the kid by default."

**SafeSpark**: \`/parent\` shows every kid's projects and prompts in one place.

### 6. Can a kid share what they made? With whom?

Public share links are great. Public **galleries** with other kids' work are risky — moderation overhead, stranger contact risk, social-comparison risk.

**SafeSpark**: shareable links (anyone with the link can view), but no public gallery, no comments, no follower counts.

### 7. Is it honest about being AI?

Apps that pretend to be a "friend" build attachment, not skill. The right pattern is: the AI is a tool the kid steers.

**SafeSpark**: Spark is positioned as a building tool. The kid is the author. Replies say *"Built it!"* not *"I'm so happy for you."*

### 8. What does it cost, and is there a free tier?

Watch out for "free for 7 days, then $40/month auto-renews." Look for transparent pricing or genuine free tiers.

**SafeSpark**: free during early access. We'll be transparent when that changes.

---

Try SafeSpark at [getsafespark.com](https://getsafespark.com).`,
  },
];

export function findPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
