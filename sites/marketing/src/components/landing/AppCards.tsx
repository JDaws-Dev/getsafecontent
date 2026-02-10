import { Music, PlaySquare, BookOpen, ExternalLink } from "lucide-react";

const apps = [
  {
    id: "safetunes",
    name: "SafeTunes",
    tagline: "Works with Apple Music",
    description: "100 million songs. AI analyzes lyrics so you can approve in seconds. Works with your existing Apple Music subscription.",
    icon: Music,
    gradient: "from-indigo-500 to-purple-500",
    href: "https://getsafetunes.com",
    highlight: "Uses Apple Music",
    preview: {
      type: "music",
      items: [
        { title: "Shake It Off", artist: "Taylor Swift", approved: true },
        { title: "Happy", artist: "Pharrell Williams", approved: true },
        { title: "Can't Stop the Feeling", artist: "Justin Timberlake", approved: true },
      ]
    }
  },
  {
    id: "safetube",
    name: "SafeTube",
    tagline: "Works with YouTube",
    description: "YouTube creators your kids love. No algorithm. No autoplay. Just the channels you've approved.",
    icon: PlaySquare,
    gradient: "from-red-500 to-orange-500",
    href: "https://getsafetube.com",
    highlight: "Uses YouTube",
    preview: {
      type: "video",
      items: [
        { title: "How Rockets Work", channel: "Mark Rober", views: "12M" },
        { title: "Science Experiments", channel: "CrunchLabs", views: "3.2M" },
        { title: "Animal Adventures", channel: "Nat Geo Kids", views: "890K" },
      ]
    }
  },
  {
    id: "safereads",
    name: "SafeReads",
    tagline: "Works with any book",
    description: "Scan a barcode at the bookstore. Search any title. Get a full content analysis before they read it.",
    icon: BookOpen,
    gradient: "from-emerald-500 to-teal-500",
    href: "https://getsafereads.com",
    highlight: "AI-powered",
    preview: {
      type: "book",
      analysis: {
        title: "Percy Jackson",
        rating: "Ages 10+",
        flags: [
          { label: "Violence", level: "Mild", color: "yellow" },
          { label: "Language", level: "None", color: "green" },
          { label: "Romance", level: "None", color: "green" },
        ]
      }
    }
  },
];

function MusicPreview({ items }: { items: { title: string; artist: string; approved: boolean }[] }) {
  return (
    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-4 text-white">
      <p className="text-xs opacity-70 mb-3">Approved Songs</p>
      <div className="space-y-2">
        {items.map((song) => (
          <div key={song.title} className="flex items-center gap-3 bg-white/10 rounded-lg px-3 py-2">
            <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center">
              <Music className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{song.title}</p>
              <p className="text-xs opacity-70 truncate">{song.artist}</p>
            </div>
            <div className="w-5 h-5 bg-emerald-400 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VideoPreview({ items }: { items: { title: string; channel: string; views: string }[] }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <p className="text-xs text-gray-500 mb-3">Approved Channels</p>
      <div className="space-y-2">
        {items.map((video) => (
          <div key={video.title} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2 shadow-sm">
            <div className="w-12 h-8 bg-gradient-to-br from-red-400 to-orange-400 rounded flex items-center justify-center">
              <PlaySquare className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{video.title}</p>
              <p className="text-xs text-gray-500 truncate">{video.channel} • {video.views} views</p>
            </div>
            <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BookPreview({ analysis }: { analysis: { title: string; rating: string; flags: { label: string; level: string; color: string }[] } }) {
  return (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center shadow-md">
          <BookOpen className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="font-semibold text-gray-900">{analysis.title}</p>
          <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
            {analysis.rating}
          </span>
        </div>
      </div>
      <p className="text-xs text-gray-500 mb-2">Content Analysis</p>
      <div className="grid grid-cols-3 gap-2">
        {analysis.flags.map((flag) => (
          <div key={flag.label} className="bg-white rounded-lg px-2 py-1.5 text-center shadow-sm">
            <p className="text-xs text-gray-500">{flag.label}</p>
            <p className={`text-xs font-semibold ${flag.color === 'green' ? 'text-emerald-600' : 'text-amber-600'}`}>
              {flag.level}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AppCards() {
  return (
    <section id="apps" className="py-12 sm:py-16 bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-navy sm:text-4xl mb-4">
            Three apps. One subscription.
          </h2>
          <p className="text-lg text-navy/60 max-w-2xl mx-auto">
            Each one works with platforms your kids already use. You just control what they can access.
          </p>
        </div>

        {/* App cards grid */}
        <div className="grid gap-8 md:grid-cols-3">
          {apps.map((app) => (
            <div
              key={app.id}
              className="bg-gray-50 rounded-2xl p-6 flex flex-col"
            >
              {/* Platform highlight badge */}
              <div className="mb-4">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy/60 bg-white px-3 py-1 rounded-full border border-gray-200">
                  {app.highlight}
                </span>
              </div>

              {/* App header */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${app.gradient} flex items-center justify-center shadow-lg`}>
                  <app.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-navy text-lg">{app.name}</h3>
                  <p className="text-sm text-navy/60">{app.tagline}</p>
                </div>
              </div>

              {/* Description */}
              <p className="text-navy/70 mb-4 flex-grow">
                {app.description}
              </p>

              {/* Preview */}
              <div className="mb-4">
                {app.preview.type === "music" && app.preview.items && (
                  <MusicPreview items={app.preview.items as { title: string; artist: string; approved: boolean }[]} />
                )}
                {app.preview.type === "video" && app.preview.items && (
                  <VideoPreview items={app.preview.items as { title: string; channel: string; views: string }[]} />
                )}
                {app.preview.type === "book" && app.preview.analysis && (
                  <BookPreview analysis={app.preview.analysis} />
                )}
              </div>

              {/* Link */}
              <a
                href={app.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-navy/60 hover:text-navy transition-colors"
              >
                Learn more about {app.name}
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          ))}
        </div>

        {/* Bundle callout */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full text-sm font-medium">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            All three included in Safe Family for $9.99/month
          </div>
        </div>
      </div>
    </section>
  );
}
