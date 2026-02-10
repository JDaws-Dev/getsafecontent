export default function FounderStory() {
  return (
    <section className="py-16 sm:py-24 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Section header */}
          <h2 className="text-3xl font-bold tracking-tight text-navy sm:text-4xl text-center mb-12">
            Why I Built This
          </h2>

          {/* Story card */}
          <div
            className="bg-cream rounded-3xl p-8 sm:p-10 lg:p-12"
            style={{ boxShadow: "0 4px 20px rgba(26, 26, 46, 0.08)" }}
          >
            {/* Founder info with larger headshot */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8 pb-8 border-b border-navy/10">
              {/* Headshot - larger and more prominent */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/jeremiah-headshot.jpg"
                alt="Jeremiah Daws"
                className="h-32 w-32 sm:h-40 sm:w-40 rounded-2xl object-cover flex-shrink-0 shadow-lg" style={{ objectPosition: 'center 15%' }}
              />
              <div className="text-center sm:text-left">
                <p className="font-bold text-navy text-xl sm:text-2xl">Jeremiah Daws</p>
                <p className="text-base text-slate-600 mt-1">Teacher, Software Developer, Parent</p>
              </div>
            </div>

            <div className="space-y-6 text-navy">
              <p className="text-lg leading-relaxed">
                As a teacher, I see kids with incredible potential every day. As an uncle and stepfather,
                I care deeply about what the kids in my life are consuming.
              </p>

              <p className="text-lg leading-relaxed">
                I couldn&apos;t find tools that actually worked. Apple Music&apos;s filters miss too much.
                YouTube&apos;s algorithms lead kids down rabbit holes. Spotify Kids feels like a cage.
                Book reviews don&apos;t tell parents what they actually need to know.
              </p>

              <p className="text-lg leading-relaxed font-medium">
                So I built something better&mdash;<strong>real content with real protection</strong>.
              </p>

              <p className="text-lg leading-relaxed">
                SafeTunes, SafeTube, and SafeReads aren&apos;t about blocking everything.
                They&apos;re about giving <em>you</em> the control to decide what&apos;s appropriate
                for <em>your</em> kids, based on <em>your</em> values.
              </p>

              <p className="text-lg leading-relaxed text-navy/70">
                I hope these tools help your family the way they&apos;ve helped mine.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
