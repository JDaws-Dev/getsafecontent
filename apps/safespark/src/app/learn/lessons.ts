/**
 * SafeSpark — Lesson content (v3, AI literacy).
 *
 * 15 short lessons that teach AI as a concept, using Spark as the
 * practice ground. The skills here transfer to every other AI tool
 * the kid will use — ChatGPT, Claude, image generators, whatever
 * shows up next.
 *
 * Target: 60-90 seconds per lesson (~150-220 words). 2-3 sections each.
 * Voice: smart older sibling. No tech jargon.
 *
 * Examples cover the full Spark range — flashcards, posters, trackers,
 * generators, drawing apps, recipes, music tools — not just games.
 *
 * Used by `/learn` (the landing) and `/learn/[slug]` (the viewer).
 * If you change a slug, the URL changes. Don't.
 */

export type LessonIcon =
  | 'message-square'
  | 'undo-2'
  | 'eye'
  | 'lightbulb'
  | 'globe'
  | 'search'
  | 'bookmark'
  | 'save'
  | 'lock'
  | 'alert-triangle'
  | 'shield'
  | 'palette'
  | 'sparkles';

export type LessonSection =
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; items: string[] }
  | {
      kind: 'example';
      label?: string;
      prompt: string;
      outcome?: string;
    }
  | { kind: 'callout'; tone: 'tip' | 'warning'; text: string };

/**
 * Lessons are grouped into three tracks that drive accent colors in the
 * /learn renderer. Lessons 1-5 = talk, 6-10 = think, 11-15 = smart.
 */
export type LessonTrack = 'talk' | 'think' | 'smart';

export type Lesson = {
  slug: string;
  title: string;
  minutes: number;
  icon: LessonIcon;
  description: string;
  track: LessonTrack;
  sections: LessonSection[];
};

export const LESSONS: Lesson[] = [
  // ─────────────────────────────────────────────────────────────────
  // TRACK 1 — Talking to AI well
  // ─────────────────────────────────────────────────────────────────

  // 1
  {
    slug: 'be-specific',
    title: 'Be specific',
    minutes: 1,
    icon: 'message-square',
    track: 'talk',
    description: 'Vague prompts get vague AI. Specific prompts get exactly what you pictured.',
    sections: [
      {
        kind: 'paragraph',
        text: "When you ask AI for something, it's making a million tiny choices for you. Colors, layout, words, style. If you don't say, AI picks — and AI's defaults are almost always boring, because boring is the safe guess.",
      },
      {
        kind: 'paragraph',
        text: "Specific isn't fancier. It just answers the questions AI was about to guess at.",
      },
      {
        kind: 'example',
        label: 'Vague',
        prompt: 'make a poster',
        outcome: "AI guesses everything. You'll get a generic poster about... something.",
      },
      {
        kind: 'example',
        label: 'Specific',
        prompt: 'Make a birthday party poster for my friend Sam. Space theme — planets, rockets, stars. Time and place at the bottom in big letters.',
        outcome: "You get that exact poster on the first try.",
      },
      {
        kind: 'paragraph',
        text: "This is the single biggest skill you can build. Same trick works on ChatGPT, image generators, music tools — every AI you'll ever touch.",
      },
    ],
  },

  // 2
  {
    slug: 'say-what-you-want',
    title: 'Say what you want, not what you don\'t',
    minutes: 1,
    icon: 'message-square',
    track: 'talk',
    description: 'AI is great at "build this." Pretty bad at "don\'t build that."',
    sections: [
      {
        kind: 'paragraph',
        text: "AI runs toward targets, not away from warnings. Say \"don't be boring\" and AI's brain is still full of the word boring — it might lean into it. Say \"make it bright and playful\" and now AI has somewhere clear to go.",
      },
      {
        kind: 'paragraph',
        text: "Flip every \"don't\" into a \"do.\" Don't make it ugly → make it look like a Pixar movie. Don't use blue → use sunset orange.",
      },
      {
        kind: 'example',
        label: 'Weak',
        prompt: "don't make the flashcards boring",
        outcome: "AI has to guess what \"not boring\" means.",
      },
      {
        kind: 'example',
        label: 'Strong',
        prompt: 'Make math flashcards with emojis, fun colors, and a high-five animation when I get one right.',
        outcome: "Now AI knows exactly what fun looks like to you.",
      },
      {
        kind: 'paragraph',
        text: "This rule works everywhere — chatbots, drawing tools, music apps. Aim AT what you want, not away from what you don't.",
      },
    ],
  },

  // 3
  {
    slug: 'one-thing-at-a-time',
    title: 'One thing at a time',
    minutes: 1,
    icon: 'message-square',
    track: 'talk',
    description: 'Pile too much into one prompt and half of it gets dropped.',
    sections: [
      {
        kind: 'paragraph',
        text: "AI has a limited attention budget per response. Stack five things in one message and you'll probably get one of them done, two half-done, and two completely ignored. The more you cram in, the worse each piece gets.",
      },
      {
        kind: 'example',
        label: 'Too much at once',
        prompt: 'add a streak counter AND change the colors AND add weekly stats AND let me add new habits AND send reminders',
        outcome: "Maybe the streak counter shows up. Everything else gets dropped or breaks.",
      },
      {
        kind: 'paragraph',
        text: "Better: pick the most important thing, ask for just that, see it work, then ask for the next one. Feels slower in the moment, ships way faster in real life.",
      },
      {
        kind: 'callout',
        tone: 'tip',
        text: "True for every AI tool — and honestly, for asking humans things too. One ask, one focus, way better result.",
      },
    ],
  },

  // 4
  {
    slug: 'try-it-first',
    title: 'Try it before you change it',
    minutes: 1,
    icon: 'eye',
    track: 'talk',
    description: 'You can\'t tell AI what to fix if you haven\'t looked at what it made.',
    sections: [
      {
        kind: 'paragraph',
        text: "Working with AI is a loop. You ask, AI builds, you check, you tweak. If you skip the \"you check\" step, the loop breaks. You're flying blind and so is AI.",
      },
      {
        kind: 'paragraph',
        text: "After every change, actually USE the thing. If something's off, your job is to describe what's off — \"it doesn't work\" isn't enough to fix anything.",
      },
      {
        kind: 'example',
        label: 'Useless',
        prompt: "the calculator is broken",
        outcome: "AI has no idea which part. It'll randomly poke around.",
      },
      {
        kind: 'example',
        label: 'Useful',
        prompt: "When I tap the equals button after typing 5 + 3, it shows 53 instead of 8. The plus is being treated like a letter, not math.",
        outcome: "Now AI knows exactly what's wrong and exactly what to fix.",
      },
      {
        kind: 'paragraph',
        text: "Notice it. Name it. Ask for the fix. Same skill that makes you better at asking teachers, parents, and every AI tool you'll ever use.",
      },
    ],
  },

  // 5
  {
    slug: 'undo-is-your-friend',
    title: 'Undo is a tool, not a fail',
    minutes: 1,
    icon: 'undo-2',
    track: 'talk',
    description: 'The reset button is part of how good AI work gets made.',
    sections: [
      {
        kind: 'paragraph',
        text: "AI can try ten versions of something in the time it'd take you to make one. Pros lean into that — generate lots, keep the good ones, undo the rest. Undo isn't failing. It's the workflow.",
      },
      {
        kind: 'paragraph',
        text: "In Spark, the most recent AI message has an \"↶ Undo last change\" button. Tap it. The project AND the chat go back, like that turn never happened. No shame, no limit.",
      },
      {
        kind: 'example',
        label: 'When to use it',
        prompt: '(Spark just changed your drawing app and now the brush colors are weird.)',
        outcome: 'Tap Undo. Way faster than explaining the break and asking for a patch.',
      },
      {
        kind: 'paragraph',
        text: "Every AI tool worth using has some version of \"try again.\" The kids who ship the best work use it the most.",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // TRACK 2 — How AI actually thinks
  // ─────────────────────────────────────────────────────────────────

  // 6
  {
    slug: 'ai-predicts-patterns',
    title: 'AI isn\'t magic — it predicts patterns',
    minutes: 1,
    icon: 'lightbulb',
    track: 'think',
    description: 'Once you see AI as a guesser, you stop being surprised and start steering.',
    sections: [
      {
        kind: 'paragraph',
        text: "Before AI could do any of this, people showed it millions of examples — stories, pictures, recipes, apps, everything. It learned what usually comes next. So when you ask for something, AI predicts based on what most things like that looked like.",
      },
      {
        kind: 'example',
        label: 'See it happen',
        prompt: 'Make a recipe finder for dinner ideas.',
        outcome: "You'll get the predictable stuff — search bar, ingredient filters, photos, ratings. AI predicted all of that because every recipe site it ever saw had those.",
      },
      {
        kind: 'paragraph',
        text: "This is why AI is amazing at common things and weirder at rare ones. Ask for a basic timer — perfect. Ask for \"a timer shaped like a jellyfish that sings when it ends\" — wilder guess, less to pattern-match against.",
      },
      {
        kind: 'paragraph',
        text: "Once you see AI as a predictor instead of a thinker, you stop being confused by weird results. You start steering the guess.",
      },
    ],
  },

  // 7
  {
    slug: 'ai-doesnt-know-new-stuff',
    title: 'AI doesn\'t know what\'s new',
    minutes: 1,
    icon: 'globe',
    track: 'think',
    description: 'AI learned from stuff up to a certain date. After that — total guess.',
    sections: [
      {
        kind: 'paragraph',
        text: "AI's knowledge has an expiration date. Everything before that day — it knows. New shows, new songs, this week's news, the meme you saw yesterday — no clue. And the tricky part: it won't always say so. It might just make something up.",
      },
      {
        kind: 'example',
        label: 'Risky',
        prompt: 'Make a flashcard set about [character from a show that just came out].',
        outcome: "AI might invent facts that sound right but aren't. The character's name might even be wrong.",
      },
      {
        kind: 'example',
        label: 'Smart',
        prompt: 'Make a flashcard set with these 6 characters: [list each one and a fact you know about them].',
        outcome: "Now AI doesn't have to know anything new — you handed it the facts.",
      },
      {
        kind: 'paragraph',
        text: "Trick that works on every AI tool: when AI seems confused about something recent, stop expecting it to know. Just tell it.",
      },
    ],
  },

  // 8
  {
    slug: 'ai-makes-stuff-up',
    title: 'AI sometimes makes stuff up',
    minutes: 1,
    icon: 'alert-triangle',
    track: 'think',
    description: 'AI invents things and sounds totally confident doing it.',
    sections: [
      {
        kind: 'paragraph',
        text: "The fancy word is \"hallucinating.\" AI predicts what SHOULD come next, even when it doesn't actually know — so it'll invent quotes, fake facts, made-up book titles, wrong dates. All said with full confidence. It's not lying on purpose. It's just guessing.",
      },
      {
        kind: 'example',
        label: 'Catch it red-handed',
        prompt: 'Make 10 flashcards about real US presidents — name, years in office, one famous thing they did.',
        outcome: "Look up 2 or 3. You'll probably find a wrong date, a fake quote, or something a different president actually did.",
      },
      {
        kind: 'callout',
        tone: 'warning',
        text: "AI sounds the MOST confident when it doesn't know. That's not a glitch — that's how prediction works.",
      },
      {
        kind: 'paragraph',
        text: "Single most important habit for using AI anywhere — chatbots, search, study tools, all of them: don't trust facts without checking. Adults have gotten in real trouble for skipping this.",
      },
    ],
  },

  // 9
  {
    slug: 'ai-doesnt-remember',
    title: 'AI doesn\'t remember you',
    minutes: 1,
    icon: 'lock',
    track: 'think',
    description: 'Every conversation starts fresh. That\'s the design.',
    sections: [
      {
        kind: 'paragraph',
        text: "AI doesn't know what you built yesterday, what your favorite color is, or what you talked about last week. Within ONE project, Spark remembers the current chat. Start a new project? Clean slate. Open ChatGPT tomorrow? It forgot you.",
      },
      {
        kind: 'example',
        label: 'New project, no memory',
        prompt: 'Make another habit tracker like the one I made last week but for my sister.',
        outcome: "Spark has no idea what last week's looked like. You'd have to describe it from scratch.",
      },
      {
        kind: 'paragraph',
        text: "Trick: when starting something new, give the context up front. \"I'm making a daily reading tracker for my 8-year-old brother — keep it simple, big buttons, lots of stickers.\" Now AI has what it needs.",
      },
      {
        kind: 'paragraph',
        text: "Don't get mad when AI \"forgets.\" It never knew. Just tell it again — that's the whole skill.",
      },
    ],
  },

  // 10
  {
    slug: 'ai-builds-fast-judges-slow',
    title: 'AI builds fast. You judge.',
    minutes: 1,
    icon: 'sparkles',
    track: 'think',
    description: 'AI can make a hundred versions in five minutes. It can\'t tell you which one is good.',
    sections: [
      {
        kind: 'paragraph',
        text: "AI never gets tired of making more versions. Twenty poster designs? Easy. A hundred dog names? Done in a minute. What AI CAN'T do is tell you which version is actually GOOD. It doesn't know what's funny, what's beautiful, what your friends would think is cool. That part — taste — is all you.",
      },
      {
        kind: 'example',
        label: 'Try this',
        prompt: 'Give me 5 different name ideas for my new dog — different vibes, different styles.',
        outcome: "AI hands you 5 options. You pick the one that fits. AI generated, you decided.",
      },
      {
        kind: 'paragraph',
        text: "Magic combo: AI for volume, you for taste. When you're stuck, don't ask AI \"what should I do?\" — ask for 5 options and pick.",
      },
      {
        kind: 'paragraph',
        text: "This is how pros use every AI tool. Your taste is what makes anything worth keeping.",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // TRACK 3 — Being a smart AI user
  // ─────────────────────────────────────────────────────────────────

  // 11
  {
    slug: 'spotting-ai-mistakes',
    title: 'Spotting when AI is wrong',
    minutes: 1,
    icon: 'search',
    track: 'smart',
    description: 'AI mistakes are usually sneaky. Catching them is a real skill.',
    sections: [
      {
        kind: 'paragraph',
        text: "Obvious mistakes are easy. The dangerous ones are quiet — a button that LOOKS like it works but doesn't, a recipe that uses ingredients that don't exist, a tracker that pretends to save your stuff but loses it.",
      },
      {
        kind: 'list',
        items: [
          'AI says "I added a save button." → Refresh the page. Did your data stick?',
          'AI says "Now it works on mobile." → Open it on your phone. Does it really?',
          'AI gives you a math result. → Try numbers you can check in your head.',
        ],
      },
      {
        kind: 'example',
        label: 'Try this',
        prompt: 'Make a tip calculator. Type a bill amount, pick a tip percent, see the total.',
        outcome: "Test with $20 bill, 20% tip — should be $24. Sometimes AI gets the math just slightly wrong, and you'd never notice without checking.",
      },
      {
        kind: 'paragraph',
        text: "This habit will protect you for life. AI keeps getting more confident. Your job is to stay just a little skeptical.",
      },
    ],
  },

  // 12
  {
    slug: 'cant-read-your-mind',
    title: 'AI can\'t read your mind',
    minutes: 1,
    icon: 'message-square',
    track: 'smart',
    description: 'When AI builds the wrong thing, it\'s missing info — not being dumb.',
    sections: [
      {
        kind: 'paragraph',
        text: "You picture a cozy hand-drawn drawing app with chunky crayons. You type \"make a drawing app.\" AI gives you a sleek modern one with sharp tools. That's not AI failing. That's AI guessing without enough info — your picture was crystal clear to YOU, but it was a blank to AI.",
      },
      {
        kind: 'example',
        label: 'Add what was missing',
        prompt: 'Make a drawing app that feels like crayons on construction paper — chunky strokes, paper texture, 8 bright crayon colors, eraser shaped like a pink eraser.',
        outcome: "Now AI has the picture you had.",
      },
      {
        kind: 'paragraph',
        text: "Ask yourself: \"What did I see in my head that I didn't actually say?\" That's almost always what's missing.",
      },
      {
        kind: 'paragraph',
        text: "Same trick on chatbots. \"That's not what I meant\" gets you nothing. \"I meant shorter, funnier, written for a 10-year-old\" gets you somewhere.",
      },
    ],
  },

  // 13
  {
    slug: 'never-share-private',
    title: 'Never share private stuff with AI',
    minutes: 1,
    icon: 'shield',
    track: 'smart',
    description: 'AI tools are not private. Treat them like you\'re talking in public.',
    sections: [
      {
        kind: 'paragraph',
        text: "It might feel like AI is just talking to you. It's not. Stuff you type into AI can get stored, used to train future AI, or shown to the people who built it. And anything you put IN a project you share is visible to whoever opens the link.",
      },
      {
        kind: 'heading',
        text: 'Never put in',
      },
      {
        kind: 'list',
        items: [
          'Your real full name, school, address, phone, or birthday',
          "Your parent's email or phone",
          'Passwords for anything, ever',
        ],
      },
      {
        kind: 'example',
        label: 'Use a nickname',
        prompt: 'Make a reading log. Use the name "BookDragon" instead of asking for my real name.',
        outcome: "Works just as well. Nobody who opens the project learns anything about you.",
      },
      {
        kind: 'paragraph',
        text: "Same rule everywhere — ChatGPT, image tools, every AI service. Treat AI like you're talking in public, because basically, you are. Public until proven private.",
      },
    ],
  },

  // 14
  {
    slug: 'inspired-vs-copying',
    title: 'Inspired by vs copying',
    minutes: 1,
    icon: 'palette',
    track: 'smart',
    description: 'Asking AI for a STYLE is fine. Asking it to steal someone\'s exact work is not.',
    sections: [
      {
        kind: 'paragraph',
        text: "Borrowing a vibe is awesome. \"Pixar style.\" \"Studio Ghibli style.\" \"Like a 90s cartoon.\" AI makes something NEW with that feel. That's creative work — you're using a style the same way a guitarist might play in a certain genre.",
      },
      {
        kind: 'paragraph',
        text: "Trying to copy someone's actual characters, art, or songs crosses a line. That belongs to the people who made it.",
      },
      {
        kind: 'example',
        label: 'Great — borrowing a style',
        prompt: 'Make a story generator that writes short adventure tales in Studio Ghibli style — gentle, magical, full of small details.',
        outcome: 'AI writes brand new stories in that vibe. Original. Yours to use.',
      },
      {
        kind: 'callout',
        tone: 'warning',
        text: "Not the same: \"copy this character exactly\" or \"steal this artist's drawings.\" That's taking, not making.",
      },
      {
        kind: 'paragraph',
        text: "Applies to every creative AI — images, music, writing. Style is free. Other people's work isn't.",
      },
    ],
  },

  // 15
  {
    slug: 'you-made-this',
    title: 'You made this — AI is just the tool',
    minutes: 1,
    icon: 'sparkles',
    track: 'smart',
    description: 'AI types. You decide. The deciding is the harder half.',
    sections: [
      {
        kind: 'paragraph',
        text: "A paintbrush doesn't paint the painting. A camera doesn't take the photo. AI doesn't make the project. In every case, there's a human in charge — choosing, picking, keeping, throwing away. That's the actual creative work.",
      },
      {
        kind: 'list',
        items: [
          'You came up with the idea.',
          'You decided how it should look and feel.',
          'You picked what to keep when AI gave you options.',
          'You noticed what was broken and asked for the fix.',
          'You decided when it was done.',
        ],
      },
      {
        kind: 'callout',
        tone: 'tip',
        text: "When someone asks who made it, the honest answer is: \"I made it. Spark helped me build it.\" Same as \"I painted this — with a brush.\"",
      },
      {
        kind: 'paragraph',
        text: "AI will keep getting more powerful. But the question \"what should I make, and why?\" — that's always going to be yours to answer.",
      },
    ],
  },
];

/**
 * Track display metadata. The renderer uses this for section headings on
 * the lesson library page; the actual *color* classNames live in the
 * renderer (Tailwind needs full class strings in source to be detected).
 */
export const TRACK_META: Record<
  LessonTrack,
  { title: string; tagline: string; ordinal: string }
> = {
  talk: {
    title: 'Talking to AI well',
    tagline: 'The five moves that make every prompt land.',
    ordinal: 'Track 1',
  },
  think: {
    title: 'How AI actually thinks',
    tagline: 'See AI as a pattern guesser and stop being surprised.',
    ordinal: 'Track 2',
  },
  smart: {
    title: 'Being a smart AI user',
    tagline: 'Spot mistakes, protect your stuff, own your work.',
    ordinal: 'Track 3',
  },
};

/** Lookup helper for the viewer page. */
export function getLessonBySlug(slug: string): Lesson | undefined {
  return LESSONS.find((lesson) => lesson.slug === slug);
}

/** Returns the previous and next lesson in array order (or null at ends). */
export function getAdjacentLessons(slug: string): {
  previous: Lesson | null;
  next: Lesson | null;
  index: number;
} {
  const index = LESSONS.findIndex((lesson) => lesson.slug === slug);
  if (index === -1) return { previous: null, next: null, index: -1 };
  return {
    previous: index > 0 ? LESSONS[index - 1] : null,
    next: index < LESSONS.length - 1 ? LESSONS[index + 1] : null,
    index,
  };
}
