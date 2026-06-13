"use client";

import Image from "next/image";
import { Sparkles, MessageCircle, Eye, Hammer, Brain } from "lucide-react";

/**
 * SafeSpark deep-dive section.
 *
 * Sits between AppCards (which has the quick 5-app overview) and the rest
 * of the landing page. AppCards introduces SafeSpark in passing; this
 * section makes the case for why "AI for kids done right" is different
 * from "ChatGPT with a content filter," and why every Safe Family family
 * gets it included rather than as an add-on.
 *
 * The product framing follows ~/Projects/safecontent/apps/safespark/README.md:
 * SafeSpark teaches the ask → check → improve → own loop, not just
 * "answers on demand." The marketing here should reflect that — not
 * "GPT-4 access for kids" but "AI training wheels for the generation
 * that'll grow up with this technology everywhere."
 */
const principles = [
  {
    icon: MessageCircle,
    title: "Ask better questions",
    body:
      "Kids learn how to give an AI useful context, define what they want, and request the right output format — the actual literacy skill that separates a good user from a passive one.",
  },
  {
    icon: Eye,
    title: "Check what AI says",
    body:
      "Spark coaches kids to ask 'how do we know?' — to verify facts, notice missing context, and catch overconfident answers before trusting them.",
  },
  {
    icon: Hammer,
    title: "Build real things",
    body:
      "Games, flashcards, posters, mini-apps, image edits — kids ship single-file projects they can share. Practice ground for using AI as a tool, not a shortcut.",
  },
  {
    icon: Brain,
    title: "Own the work",
    body:
      "Every project is theirs. Spark helps with execution; kids supply the taste, the voice, and the decisions. Parent dashboard shows what they prompted and what they kept.",
  },
];

export default function SafeSparkSpotlight() {
  return (
    <section id="safespark" className="relative bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 py-20 sm:py-28 overflow-hidden">
      {/* Decorative gradient blobs */}
      <div aria-hidden className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-violet-200/40 blur-3xl" />
      <div aria-hidden className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-violet-200/40 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16 mb-16">
          {/* Left — story */}
          <div className="flex-1 max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-violet-800 mb-5">
              <Sparkles className="h-3.5 w-3.5" />
              New · SafeSpark
            </span>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-navy mb-5 leading-tight">
              Your kids will grow up with AI everywhere.
              <span className="block mt-2 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-purple-600 bg-clip-text text-transparent">
                Teach them how to use it well.
              </span>
            </h2>

            <p className="text-lg text-navy/70 mb-5">
              Not &ldquo;ChatGPT for kids.&rdquo; Not a homework cheat machine. SafeSpark is
              a supervised AI training lab — kids practice asking better questions,
              checking the answers, improving the output, and owning the work.
            </p>
            <p className="text-base text-navy/60 mb-6">
              Built for ages 9&ndash;15. Every prompt and every project visible to you.
              Parent kill-switch and per-kid usage caps included.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href="https://getsafespark.com"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-peach inline-flex items-center justify-center text-base px-6 py-3 shadow-lg hover:shadow-xl transition-all"
              >
                See SafeSpark
              </a>
              <a
                href="#pricing"
                className="inline-flex items-center gap-2 text-sm font-semibold text-navy hover:text-navy/70 transition-colors"
              >
                Included in Safe Family &mdash; $14.99/mo &rarr;
              </a>
            </div>

            {/* Founder line */}
            <p className="mt-6 text-sm text-navy/60 italic">
              &ldquo;I built the first version for my own daughter. She&rsquo;s 12 &mdash;
              already using AI for school, already needing to learn the difference
              between a useful prompt and a lazy one.&rdquo; <span className="not-italic font-medium text-navy/80">&mdash; Jeremiah Daws, founder</span>
            </p>
          </div>

          {/* Right — kid-built project preview */}
          <div className="flex-1 w-full max-w-xl">
            <div className="relative">
              {/* Background card */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-violet-200 to-fuchsia-300 rotate-3" />
              {/* Main image card */}
              <div className="relative rounded-3xl bg-white p-5 shadow-2xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-red-400" />
                    <span className="h-3 w-3 rounded-full bg-amber-400" />
                    <span className="h-3 w-3 rounded-full bg-emerald-400" />
                  </div>
                  <span className="text-xs font-mono text-navy/40">knox-pokemon-battle.html</span>
                </div>
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-100">
                  <Image
                    src="/safespark/build-pokemon.png"
                    alt="A Pokemon battle game built by a 10-year-old using SafeSpark"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-navy/60">
                    <span className="font-semibold text-navy">Knox, age 10</span>
                    {" · "}
                    Pokémon Battle Game
                  </span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                    Shipped
                  </span>
                </div>
                <p className="mt-2 text-xs text-navy/50 font-mono leading-relaxed">
                  prompt: <span className="text-navy/70">&ldquo;make a pokemon battle game where pikachu fights bulbasaur&rdquo;</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Four principles */}
        <div>
          <h3 className="text-center text-2xl sm:text-3xl font-bold text-navy mb-3">
            The four habits AI literacy actually needs
          </h3>
          <p className="text-center text-navy/60 max-w-2xl mx-auto mb-10">
            Spark coaches these every time a kid uses it. Parents see the progression
            in the dashboard.
          </p>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {principles.map((p, i) => (
              <div
                key={p.title}
                className="rounded-2xl bg-white/80 backdrop-blur-sm border border-violet-100 p-5 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-sm">
                    <p.icon className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-navy/40">
                    Habit {i + 1}
                  </span>
                </div>
                <h4 className="text-base font-bold text-navy mb-2">{p.title}</h4>
                <p className="text-sm text-navy/60 leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
