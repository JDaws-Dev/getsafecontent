import { Book, Music, PlaySquare, Search, Sparkles, Check } from "lucide-react";

export default function BundleBanner() {
  return (
    <section className="py-10 sm:py-14 bg-gradient-to-r from-navy via-slate-800 to-navy text-white">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Why all 5 messaging */}
        <div className="text-center mb-8">
          <h3 className="text-2xl sm:text-3xl font-bold mb-3">
            Why protect just one when they use all five?
          </h3>
          <p className="text-white/70 max-w-2xl mx-auto">
            Kids switch between music, video, books, search, and now AI every day.
            Protecting one leaves the gaps that matter most wide open.
          </p>
        </div>

        {/* Visual: 5 content types — one for each app */}
        <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-8">
          <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
            <Music className="w-5 h-5 text-purple-400" />
            <span className="text-sm font-medium">Music</span>
            <Check className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
            <PlaySquare className="w-5 h-5 text-red-400" />
            <span className="text-sm font-medium">Video</span>
            <Check className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
            <Book className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-medium">Books</span>
            <Check className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
            <Search className="w-5 h-5 text-cyan-400" />
            <span className="text-sm font-medium">Search</span>
            <Check className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span className="text-sm font-medium">AI</span>
            <Check className="w-4 h-4 text-emerald-400" />
          </div>
        </div>

        {/* Price + CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
          <div className="text-center sm:text-left">
            <p className="text-2xl sm:text-3xl font-bold">
              $14.99<span className="text-base font-medium text-white/60">/month</span>
            </p>
            <p className="text-emerald-400 font-medium text-sm">
              Less than Apple One Family ($19.99/mo)
            </p>
          </div>
          <a
            href="#pricing"
            className="btn-peach inline-flex items-center gap-2 whitespace-nowrap text-lg px-8 py-4"
          >
            Get Complete Protection
          </a>
        </div>
      </div>
    </section>
  );
}
