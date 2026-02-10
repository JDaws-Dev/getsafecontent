import { AlertTriangle, Music, PlaySquare, Book, ArrowRight } from "lucide-react";

const painPoints = [
  {
    icon: PlaySquare,
    problem: "YouTube Kids is too babyish. Regular YouTube is too risky.",
    description: "Your 10-year-old wants Mark Rober and Dude Perfect—not cartoon nursery rhymes. But YouTube's algorithm leads them somewhere you'd never approve.",
    solution: "SafeTube: They watch YouTube. You pick the channels.",
    color: "from-red-500 to-orange-500",
    bgColor: "bg-red-50",
    textColor: "text-red-700",
  },
  {
    icon: Music,
    problem: "Apple Music's \"clean\" filter misses too much.",
    description: "An album marked clean can still have tracks you wouldn't want. And Spotify Kids doesn't have the music your tween actually wants.",
    solution: "SafeTunes: AI reviews lyrics. You approve in seconds.",
    color: "from-purple-500 to-purple-600",
    bgColor: "bg-purple-50",
    textColor: "text-purple-700",
  },
  {
    icon: Book,
    problem: "You can't read every book before they do.",
    description: "That popular YA novel everyone's talking about? You don't know what's inside until they've already read it.",
    solution: "SafeReads: AI analyzes 10 content categories. Facts, not opinions.",
    color: "from-emerald-500 to-teal-500",
    bgColor: "bg-emerald-50",
    textColor: "text-emerald-700",
  },
];

export default function ProblemSolutionSection() {
  return (
    <section className="bg-white py-12 sm:py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <AlertTriangle className="w-4 h-4" />
            Sound familiar?
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-navy mb-4">
            Kids apps are too limited. Regular apps are too open.
          </h2>
          <p className="text-lg text-navy/60 max-w-2xl mx-auto">
            Your kids want access to YouTube, Apple Music, and popular books. You just want to know what they&apos;re consuming. <strong>Now you can have both.</strong>
          </p>
        </div>

        {/* Pain Points Grid */}
        <div className="grid gap-6 md:gap-8 md:grid-cols-3">
          {painPoints.map((point) => (
            <div
              key={point.problem}
              className="bg-gray-50 rounded-2xl p-6 sm:p-8 flex flex-col"
            >
              {/* Icon */}
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${point.color} flex items-center justify-center mb-6 shadow-lg`}>
                <point.icon className="w-6 h-6 text-white" />
              </div>

              {/* Problem */}
              <h3 className="text-lg font-bold text-navy mb-3">
                {point.problem}
              </h3>
              <p className="text-navy/60 mb-6 flex-grow">
                {point.description}
              </p>

              {/* Solution */}
              <div className={`${point.bgColor} rounded-xl p-4`}>
                <div className="flex items-start gap-2">
                  <ArrowRight className={`w-5 h-5 ${point.textColor} flex-shrink-0 mt-0.5`} />
                  <p className={`text-sm font-medium ${point.textColor}`}>
                    {point.solution}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 text-center">
          <p className="text-lg text-navy/70 mb-6">
            No more hoping the filters work. No more checking after the fact.
            <br className="hidden sm:block" />
            <strong>You approve it first, or they don&apos;t see it.</strong>
          </p>
          <a
            href="#apps"
            className="inline-flex items-center gap-2 text-peach-start hover:text-peach-end font-semibold transition-colors"
          >
            See how it works
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
