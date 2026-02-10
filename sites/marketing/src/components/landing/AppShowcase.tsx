// Device mockup component for iPhone
function IPhoneMockup({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto" style={{ maxWidth: "300px" }}>
      {/* Phone frame */}
      <div className="relative bg-gray-900 rounded-[3rem] p-3 shadow-2xl">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-gray-900 rounded-b-3xl z-10" />
        {/* Screen */}
        <div className="relative bg-white rounded-[2.25rem] overflow-hidden aspect-[9/19.5]">
          {children}
        </div>
      </div>
    </div>
  );
}

// Device mockup component for iPad/Tablet (landscape)
function TabletMockup({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto" style={{ maxWidth: "480px" }}>
      {/* Tablet frame */}
      <div className="relative bg-gray-900 rounded-[2rem] p-4 shadow-2xl">
        {/* Screen */}
        <div className="relative bg-white rounded-[1.5rem] overflow-hidden aspect-[4/3]">
          {children}
        </div>
      </div>
    </div>
  );
}

// SafeTunes mockup content - Music player UI
function SafeTunesMockupContent() {
  return (
    <div className="h-full bg-gradient-to-b from-indigo-500 to-purple-600 p-4 flex flex-col">
      {/* Header */}
      <div className="text-center text-white mb-4 pt-6">
        <p className="text-xs opacity-80">Now Playing</p>
      </div>

      {/* Album art placeholder */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full aspect-square bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
          <svg
            className="w-16 h-16 text-white/60"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z"
            />
          </svg>
        </div>
      </div>

      {/* Song info */}
      <div className="text-center text-white mt-4 mb-2">
        <p className="font-semibold text-sm">Kid-Friendly Playlist</p>
        <p className="text-xs opacity-80">Parent Approved</p>
      </div>

      {/* Progress bar */}
      <div className="px-4 mb-2">
        <div className="h-1 bg-white/30 rounded-full">
          <div className="h-1 bg-white rounded-full w-1/3" />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-6 py-4">
        <button className="text-white/80">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9.195 18.44c1.25.713 2.805-.19 2.805-1.629v-2.34l6.945 3.968c1.25.714 2.805-.188 2.805-1.628V8.688c0-1.44-1.555-2.342-2.805-1.628L12 11.03v-2.34c0-1.44-1.555-2.343-2.805-1.629l-7.108 4.062c-1.26.72-1.26 2.536 0 3.256l7.108 4.061z" />
          </svg>
        </button>
        <button className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-purple-600">
          <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
          </svg>
        </button>
        <button className="text-white/80">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14.805 5.56c-1.25-.713-2.805.19-2.805 1.629v2.34L5.055 5.56c-1.25-.714-2.805.188-2.805 1.628v9.311c0 1.44 1.555 2.342 2.805 1.628L12 14.47v2.34c0 1.44 1.555 2.343 2.805 1.629l7.108-4.062c1.26-.72 1.26-2.536 0-3.256l-7.108-4.061z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// SafeTube mockup content - Video library UI
function SafeTubeMockupContent() {
  return (
    <div className="h-full bg-gray-50 p-4 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
            </svg>
          </div>
          <span className="font-semibold text-gray-900 text-sm">SafeTube</span>
        </div>
        <div className="w-6 h-6 bg-gray-200 rounded-full" />
      </div>

      {/* Profile tabs */}
      <div className="flex gap-2 mb-4">
        <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
          Emma
        </span>
        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
          Liam
        </span>
      </div>

      {/* Video grid */}
      <div className="grid grid-cols-2 gap-3 flex-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm">
            <div className="aspect-video bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
              </svg>
            </div>
            <div className="p-2">
              <div className="h-2 bg-gray-200 rounded w-3/4 mb-1" />
              <div className="h-2 bg-gray-100 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>

      {/* Approved badge */}
      <div className="mt-3 flex items-center justify-center gap-2 py-2 bg-green-50 rounded-lg">
        <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-xs font-medium text-green-700">All videos parent-approved</span>
      </div>
    </div>
  );
}

// SafeReads mockup content - Book Analysis Safety Report
function SafeReadsMockupContent() {
  return (
    <div className="h-full bg-gradient-to-b from-emerald-50 to-teal-50 p-5 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <div>
            <span className="font-bold text-gray-900 text-sm">Book Analysis</span>
            <span className="text-emerald-600 text-sm font-semibold ml-2">Safety Report</span>
          </div>
        </div>
      </div>

      {/* Report card */}
      <div className="bg-white rounded-2xl p-5 shadow-lg flex-1 flex flex-col">
        {/* Book info row */}
        <div className="flex gap-4 mb-5 pb-4 border-b border-gray-100">
          {/* Book cover */}
          <div className="w-20 h-28 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
            <svg className="w-10 h-10 text-white/70" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-gray-900 text-base truncate">The Lightning Thief</h4>
            <p className="text-sm text-gray-500 mb-2">Rick Riordan</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                Ages 10+
              </span>
              <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                Fantasy
              </span>
            </div>
          </div>
        </div>

        {/* Content analysis grid */}
        <div className="flex-1">
          <h5 className="font-semibold text-gray-700 text-sm mb-3">Content Analysis</h5>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Violence", level: "Mild", color: "bg-yellow-100 text-yellow-700" },
              { label: "Language", level: "None", color: "bg-emerald-100 text-emerald-700" },
              { label: "Romance", level: "None", color: "bg-emerald-100 text-emerald-700" },
              { label: "Scary", level: "Mild", color: "bg-yellow-100 text-yellow-700" },
              { label: "Drugs", level: "None", color: "bg-emerald-100 text-emerald-700" },
              { label: "Themes", level: "Family", color: "bg-blue-100 text-blue-700" },
            ].map((cat) => (
              <div key={cat.label} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-xs text-gray-600">{cat.label}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${cat.color}`}>
                  {cat.level}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* AI badge */}
        <div className="mt-4 flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-lg border border-teal-100">
          <svg className="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          <span className="text-xs font-medium text-teal-700">AI-powered analysis</span>
        </div>
      </div>
    </div>
  );
}

// Checkmark icon component
function CheckIcon() {
  return (
    <svg
      className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="2"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 12.75l6 6 9-13.5"
      />
    </svg>
  );
}

// App section data
const appSections = [
  {
    id: "safetunes",
    name: "SafeTunes",
    tagline: "Real Music. Real Protection. Zero Worry.",
    description:
      "Give your kids access to millions of songs on Apple Music—but only the ones you approve. The parental control layer Apple Music forgot.",
    features: [
      "Approve entire albums OR individual songs",
      "Hide inappropriate album artwork",
      "Kids request, you approve with one tap",
      "Works with your existing Apple Music subscription",
    ],
    href: "https://getsafetunes.com",
    gradient: "from-indigo-500 to-purple-500",
    price: "$4.99",
    pricePeriod: "/month",
  },
  {
    id: "safetube",
    name: "SafeTube",
    tagline: "Your video library, curated by you.",
    description:
      "The YouTube parental dashboard that actually works. No recommendations, no 'up next'—just the videos you've approved.",
    features: [
      "AI reviews channels before you approve",
      "Videos stop when done—no autoplay",
      "Built-in time limits per child",
      "Separate safe player for kids",
    ],
    href: "https://getsafetube.com",
    gradient: "from-red-500 to-orange-500",
    price: "$4.99",
    pricePeriod: "/month",
  },
  {
    id: "safereads",
    name: "SafeReads",
    tagline: "Know what's in the book before they read it.",
    description:
      "Scan a barcode, snap a cover, or search any title—get a complete safety report with facts, not opinions.",
    features: [
      "3 ways to look up: barcode, photo, or search",
      "AI analyzes 10 content categories",
      "Violence, language, sexual content & more",
      "Works at the bookstore or library",
    ],
    href: "https://getsafereads.com",
    gradient: "from-emerald-500 to-teal-500",
    price: "$4.99",
    pricePeriod: "/month",
  },
];

export default function AppShowcase() {
  return (
    <section id="apps">
      {/* SafeTunes Section - Text LEFT, iPhone RIGHT, Cream bg */}
      <div id="safetunes" className="py-20 sm:py-28 bg-cream scroll-mt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            {/* Text content - LEFT */}
            <div className="flex-1 max-w-xl">
              {/* App badge */}
              <div className="inline-flex items-center gap-2 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                  </svg>
                </div>
                <span className="font-bold text-navy text-xl">{appSections[0].name}</span>
              </div>

              {/* Headline */}
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-navy mb-5 leading-tight">
                {appSections[0].tagline}
              </h2>

              {/* Description */}
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">{appSections[0].description}</p>

              {/* Features */}
              <ul className="space-y-4 mb-8">
                {appSections[0].features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <CheckIcon />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Bundle badge + CTA */}
              <div className="flex flex-wrap items-center gap-4">
                <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full text-sm font-medium">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Included in $9.99 bundle
                </span>
                <a
                  href={appSections[0].href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  Learn more
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                    />
                  </svg>
                </a>
              </div>
            </div>

            {/* Device mockup - RIGHT */}
            <div className="flex-1 w-full max-w-lg lg:max-w-none flex justify-center">
              <div className="relative">
                <IPhoneMockup>
                  <SafeTunesMockupContent />
                </IPhoneMockup>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SafeTube Section - Tablet LEFT, Text RIGHT, White bg */}
      <div id="safetube" className="py-20 sm:py-28 bg-white scroll-mt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row-reverse items-center gap-12 lg:gap-20">
            {/* Text content - RIGHT */}
            <div className="flex-1 max-w-xl">
              {/* App badge */}
              <div className="inline-flex items-center gap-2 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" />
                  </svg>
                </div>
                <span className="font-bold text-navy text-xl">{appSections[1].name}</span>
              </div>

              {/* Headline */}
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-navy mb-5 leading-tight">
                {appSections[1].tagline}
              </h2>

              {/* Description */}
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">{appSections[1].description}</p>

              {/* Features */}
              <ul className="space-y-4 mb-8">
                {appSections[1].features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <CheckIcon />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Bundle badge + CTA */}
              <div className="flex flex-wrap items-center gap-4">
                <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full text-sm font-medium">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Included in $9.99 bundle
                </span>
                <a
                  href={appSections[1].href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-semibold text-red-500 hover:text-red-600 transition-colors"
                >
                  Learn more
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                    />
                  </svg>
                </a>
              </div>
            </div>

            {/* Device mockup - LEFT */}
            <div className="flex-1 w-full max-w-lg lg:max-w-none flex justify-center">
              <div className="relative">
                <TabletMockup>
                  <SafeTubeMockupContent />
                </TabletMockup>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SafeReads Section - Text LEFT, Tablet RIGHT, Cream bg */}
      <div id="safereads" className="py-20 sm:py-28 bg-cream scroll-mt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            {/* Text content - LEFT */}
            <div className="flex-1 max-w-xl">
              {/* App badge */}
              <div className="inline-flex items-center gap-2 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                </div>
                <span className="font-bold text-navy text-xl">{appSections[2].name}</span>
              </div>

              {/* Headline */}
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-navy mb-5 leading-tight">
                {appSections[2].tagline}
              </h2>

              {/* Description */}
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">{appSections[2].description}</p>

              {/* Features */}
              <ul className="space-y-4 mb-8">
                {appSections[2].features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <CheckIcon />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Bundle badge + CTA */}
              <div className="flex flex-wrap items-center gap-4">
                <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full text-sm font-medium">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Included in $9.99 bundle
                </span>
                <a
                  href={appSections[2].href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  Learn more
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                    />
                  </svg>
                </a>
              </div>
            </div>

            {/* Device mockup - RIGHT */}
            <div className="flex-1 w-full max-w-lg lg:max-w-none flex justify-center">
              <div className="relative">
                <TabletMockup>
                  <SafeReadsMockupContent />
                </TabletMockup>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
