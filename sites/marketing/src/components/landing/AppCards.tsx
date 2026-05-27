import { Music, PlaySquare, BookOpen, Search, Sparkles, ArrowRight } from "lucide-react";

/**
 * Compact 5-app grid — broad strokes only.
 *
 * Each app gets one line about the BIG thing it does + a deep-link to
 * its own landing page. Detailed selling, screenshots, demos, and
 * objection-handling all live on the per-app landing pages
 * (getsafetunes.com / etc.). Keeps getsafefamily.com scannable and
 * focuses the bundle pitch on the unified subscription.
 */
const apps = [
  {
    id: "safetunes",
    name: "SafeTunes",
    big: "Apple Music your kids can actually use.",
    icon: Music,
    gradient: "from-indigo-500 to-purple-500",
    href: "https://getsafetunes.com",
    isNew: false,
  },
  {
    id: "safetube",
    name: "SafeTube",
    big: "YouTube without the algorithm.",
    icon: PlaySquare,
    gradient: "from-red-500 to-orange-500",
    href: "https://getsafetube.com",
    isNew: false,
  },
  {
    id: "safereads",
    name: "SafeReads",
    big: "Know what's in any book before they read it.",
    icon: BookOpen,
    gradient: "from-emerald-500 to-teal-500",
    href: "https://getsafereads.com",
    isNew: false,
  },
  {
    id: "safestudy",
    name: "SafeStudy",
    big: "Safe search + an AI tutor built for kids.",
    icon: Search,
    gradient: "from-blue-500 to-cyan-500",
    href: "https://getsafestudy.com",
    isNew: false,
  },
  {
    id: "safespark",
    name: "SafeSpark",
    big: "Teach kids to use AI well — not just use it.",
    icon: Sparkles,
    gradient: "from-amber-500 to-violet-500",
    href: "https://getsafespark.com",
    isNew: true,
  },
];

export default function AppCards() {
  return (
    <section id="apps" className="py-16 sm:py-20 bg-white dark:bg-slate-900">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-navy dark:text-white mb-3">
            Five apps. One subscription.
          </h2>
          <p className="text-lg text-navy/60 dark:text-slate-300 max-w-2xl mx-auto">
            One trusted set of tools for the parts of childhood that happen on a screen.
          </p>
        </div>

        <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {apps.map((app) => (
            <a
              key={app.id}
              href={app.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 sm:p-6 hover:border-navy/30 dark:hover:border-white/30 hover:shadow-lg transition-all"
            >
              {app.isNew && (
                <span className="absolute top-4 right-4 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                  New
                </span>
              )}
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${app.gradient} flex items-center justify-center shadow-sm`}>
                  <app.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-bold text-navy dark:text-white text-lg">
                  {app.name}
                </h3>
              </div>
              <p className="text-navy/70 dark:text-slate-300 leading-snug mb-4">
                {app.big}
              </p>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy dark:text-white group-hover:gap-2.5 transition-all">
                Learn more
                <ArrowRight className="w-4 h-4" />
              </span>
            </a>
          ))}
        </div>

        <p className="text-center mt-10 text-sm text-navy/50 dark:text-slate-400">
          All five included in Safe Family — $14.99/month.
        </p>
      </div>
    </section>
  );
}
