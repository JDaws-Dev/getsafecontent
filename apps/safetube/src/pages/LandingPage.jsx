import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  // FAQ accordion state
  const [openFaq, setOpenFaq] = useState(null);

  // Add FAQ Schema markup for Google featured snippets (SEO)
  useEffect(() => {
    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Does YouTube have parental controls?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "YouTube has YouTube Kids and Supervised Experiences, but they're limited. YouTube Kids is babyish for older kids, and the algorithm still recommends questionable content. SafeTube gives you a true whitelist - your kids can ONLY watch channels and videos you've specifically approved."
          }
        },
        {
          "@type": "Question",
          "name": "How do I block inappropriate videos on YouTube?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "YouTube's Restricted Mode blocks some content but misses a lot. SafeTube works differently: instead of blocking, you approve. Your child can only watch channels and videos you've specifically added to their approved list. Nothing else."
          }
        },
        {
          "@type": "Question",
          "name": "Can my kid bypass SafeTube and just use regular YouTube?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No! Your child uses SafeTube at getsafetube.com/play - a completely separate player that only shows approved content. They don't need the YouTube app. You can block YouTube using Screen Time or Family Link."
          }
        },
        {
          "@type": "Question",
          "name": "Is YouTube Kids safe for my child?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "YouTube Kids filters out most adult content, but inappropriate videos still slip through. The algorithm can lead kids down rabbit holes to concerning content. SafeTube eliminates the algorithm entirely - kids only see what you've hand-picked."
          }
        }
      ]
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(faqSchema);
    script.id = 'faq-schema';
    document.head.appendChild(script);

    return () => {
      const existingScript = document.getElementById('faq-schema');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Header - Sticky */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-9 h-9 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">SafeTube</span>
            </Link>

            <div className="flex items-center space-x-2 sm:space-x-4">
              <a
                href="https://getsafefamily.com"
                className="hidden sm:block text-gray-400 hover:text-gray-600 font-medium text-xs sm:text-sm"
              >
                Safe Family
              </a>
              <span className="hidden sm:block text-gray-300">|</span>
              <Link to="/login" className="text-gray-600 hover:text-gray-900 font-medium text-xs sm:text-sm">
                Parent Login
              </Link>
              <Link to="/play" className="text-gray-600 hover:text-gray-900 font-medium text-xs sm:text-sm">
                Kid Login
              </Link>
              <Link
                to="/signup"
                className="btn-brand rounded-lg text-xs sm:text-sm whitespace-nowrap"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero - Red/orange gradient matching OG image */}
      <section className="py-10 sm:py-16 lg:py-20 bg-gradient-to-br from-red-600 to-orange-500">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16 max-w-7xl mx-auto">
            {/* Left side - Text content */}
            <div className="flex-1 text-center lg:text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-full text-sm font-semibold mb-6 border border-white/30">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                YouTube Parental Controls
              </div>

              {/* Headline */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                The YouTube Parental Dashboard{" "}
                <span className="text-white underline decoration-white/50">That Actually Works</span>
              </h1>

              {/* Subhead */}
              <p className="text-lg sm:text-xl text-white/90 mb-6 max-w-xl mx-auto lg:mx-0">
                You get a parent dashboard. Your kids get a safe YouTube player.
                You approve channels and videos, they can only watch what you've approved.
                No algorithm, no recommendations, no rabbit holes.
              </p>

              {/* Power benefit statement */}
              <div className="flex flex-col sm:flex-row flex-wrap justify-center lg:justify-start gap-2 sm:gap-x-6 text-xs sm:text-sm text-white/90 mb-6">
                <span className="flex items-center justify-center lg:justify-start gap-1">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  They watch ONLY approved content
                </span>
                <span className="flex items-center justify-center lg:justify-start gap-1">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  You see what they search for
                </span>
                <span className="flex items-center justify-center lg:justify-start gap-1">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  No algorithm recommendations
                </span>
              </div>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-4">
                <Link
                  to="/signup"
                  className="w-full sm:w-auto bg-white hover:bg-gray-100 text-red-600 px-8 py-4 rounded-xl font-bold text-lg transition shadow-lg"
                >
                  Get 7 Days Free — No Credit Card
                </Link>
              </div>

              {/* Micro-copy under CTA */}
              <p className="text-white/70 text-sm mb-6">Takes 5 minutes to set up. Cancel anytime.</p>

              {/* Trust line */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 text-sm text-white/80 mb-4">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>COPPA Compliant</span>
                <span className="text-white/50">•</span>
                <span>No Data Selling</span>
                <span className="text-white/50">•</span>
                <span>Cancel Anytime</span>
              </div>

              {/* Kid access URL */}
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                <span className="text-white/80">Kids access at</span>
                <span className="text-white font-mono font-bold">getsafetube.com/play</span>
              </div>
            </div>

            {/* Right side - Hero Photo */}
            <div className="flex-1 relative w-full flex items-center justify-center lg:justify-end">
              <div className="relative max-w-md lg:max-w-lg w-full">
                <div
                  className="relative aspect-[4/5] overflow-hidden shadow-2xl"
                  style={{ borderRadius: '0 3rem 3rem 3rem' }}
                >
                  <img
                    src="https://images.pexels.com/photos/5765883/pexels-photo-5765883.jpeg?auto=compress&cs=tinysrgb&w=600&h=750&fit=crop"
                    alt="Kids watching videos together on tablet"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Apps Coming Soon Banner */}
      <section className="py-3 bg-gradient-to-r from-red-700 to-orange-600">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-3 text-center">
            {/* iOS Icon */}
            <div className="w-6 h-6 bg-white/20 rounded flex items-center justify-center">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
            </div>
            {/* Android Icon */}
            <div className="w-6 h-6 bg-white/20 rounded flex items-center justify-center">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.523 2.592a.5.5 0 0 0-.867-.5l-1.48 2.56a7.502 7.502 0 0 0-6.352 0l-1.48-2.56a.5.5 0 0 0-.867.5l1.432 2.482a7.528 7.528 0 0 0-3.91 6.576H20a7.528 7.528 0 0 0-3.91-6.576l1.433-2.482zM7 9.5a1 1 0 1 1 2 0 1 1 0 0 1-2 0zm8 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM4 12.65V19.5a2 2 0 0 0 2 2h1V12H4.5a.5.5 0 0 0-.5.65zm15 0V19.5a2 0 0 1-2 2h-1V12h2.5a.5.5 0 0 1 .5.65zM8 12v10h8V12H8z"/>
              </svg>
            </div>
            <span className="text-white font-semibold text-sm">iOS & Android Apps Coming Soon</span>
          </div>
        </div>
      </section>

      {/* Demo Video Section */}
      <section className="py-12 sm:py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-3">
              See How It Works
            </h2>
            <p className="text-gray-600 text-center mb-8 max-w-2xl mx-auto">
              Watch a quick demo of SafeTube in action - from parent setup to kid experience.
            </p>

            {/* Responsive YouTube Embed */}
            <div className="relative w-full overflow-hidden rounded-2xl shadow-2xl bg-black" style={{ paddingBottom: '56.25%' }}>
              <iframe
                className="absolute top-0 left-0 w-full h-full"
                src="https://www.youtube-nocookie.com/embed/yq6PRWWIEXs?rel=0&modestbranding=1"
                title="SafeTube Demo - How to set up parental controls for YouTube"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      </section>

      {/* Product Screenshots Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-4">
              See The Product In Action
            </h2>
            <p className="text-xl text-gray-600 text-center mb-12 max-w-3xl mx-auto">
              Two separate interfaces. Complete control. Total peace of mind.
            </p>

            <div className="grid md:grid-cols-2 gap-8 mb-12">
              {/* Parent Dashboard */}
              <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-6 border-2 border-red-200">
                <div className="mb-4">
                  <span className="inline-block bg-gradient-to-r from-red-500 to-orange-500 text-white px-3 py-1 rounded-full text-sm font-bold mb-3">
                    PARENT DASHBOARD
                  </span>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">You Approve Channels & Videos</h3>
                  <p className="text-gray-600 mb-4">
                    Search YouTube. Approve entire channels for easy access, or pick individual videos for precise control. Review your kids' requests.
                  </p>
                </div>
                <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
                  {/* Mock Parent Dashboard UI */}
                  <div className="bg-gray-100 px-3 py-2 border-b border-gray-200 flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                      <div className="w-3 h-3 rounded-full bg-green-400"></div>
                    </div>
                    <div className="flex-1 bg-white rounded px-2 py-1 text-xs text-gray-400 text-center">getsafetube.com/admin</div>
                  </div>
                  <div className="p-4 space-y-3">
                    {/* Search bar mock */}
                    <div className="flex gap-2">
                      <div className="flex-1 bg-gray-100 rounded-lg px-3 py-2 flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <span className="text-gray-400 text-sm">Search YouTube channels...</span>
                      </div>
                    </div>
                    {/* Channel results mock */}
                    <div className="space-y-2">
                      {[
                        { name: 'Mark Rober', subs: '26M', color: 'bg-blue-500' },
                        { name: 'Dude Perfect', subs: '60M', color: 'bg-green-500' },
                        { name: 'SmarterEveryDay', subs: '11M', color: 'bg-orange-500' },
                      ].map((ch, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                          <div className={`w-10 h-10 ${ch.color} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
                            {ch.name[0]}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 text-sm">{ch.name}</p>
                            <p className="text-gray-500 text-xs">{ch.subs} subscribers</p>
                          </div>
                          <button className="bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-medium">
                            Approve
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <ul className="mt-4 space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Search any YouTube channel or video</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Approve channels with one tap</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Set time limits per child</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>See watch history and blocked searches</span>
                  </li>
                </ul>
              </div>

              {/* Kid Player */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-200">
                <div className="mb-4">
                  <span className="inline-block bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold mb-3">
                    KID PLAYER
                  </span>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">They Watch Safely</h3>
                  <p className="text-gray-600 mb-4">
                    Your kids log in at getsafetube.com/play with a PIN. They can only browse and watch content you've approved. No algorithm, no rabbit holes.
                  </p>
                </div>
                <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
                  {/* Mock Kid Player UI */}
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">E</span>
                      </div>
                      <span className="text-white font-medium text-sm">Emma's Videos</span>
                    </div>
                    <div className="text-blue-200 text-xs">45m left today</div>
                  </div>
                  <div className="p-4">
                    <p className="text-gray-500 text-xs uppercase font-semibold mb-3">Your Channels</p>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { name: 'Mark Rober', emoji: '🔬', color: 'bg-blue-100' },
                        { name: 'Dude Perfect', emoji: '🏀', color: 'bg-green-100' },
                        { name: 'Brave Wilderness', emoji: '🦎', color: 'bg-yellow-100' },
                        { name: 'SciShow Kids', emoji: '🧪', color: 'bg-purple-100' },
                        { name: 'Nat Geo Kids', emoji: '🌍', color: 'bg-orange-100' },
                        { name: 'Numberblocks', emoji: '🔢', color: 'bg-pink-100' },
                      ].map((ch, i) => (
                        <div key={i} className={`${ch.color} rounded-lg p-2 text-center`}>
                          <div className="text-2xl mb-1">{ch.emoji}</div>
                          <p className="text-gray-700 text-xs font-medium truncate">{ch.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <ul className="mt-4 space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Only approved channels and videos visible</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Request new channels from you</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Works on any device with a browser</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>PIN protection for each kid</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Request Flow */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 md:p-8 border-2 border-green-200">
              <div className="text-center mb-8">
                <span className="inline-block bg-green-600 text-white px-3 py-1 rounded-full text-sm font-bold mb-3">
                  REQUEST FLOW
                </span>
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Kids Request, You Approve</h3>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Your child finds a channel at school. Taps request. You get notified. Review it, approve it—done in under a minute.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-10 h-10 bg-green-600 text-white rounded-full font-bold text-lg mb-3">1</div>
                  <h4 className="font-bold text-gray-900 mb-1">Kid finds a channel</h4>
                  <p className="text-sm text-gray-500">Searches YouTube within SafeTube</p>
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-10 h-10 bg-green-600 text-white rounded-full font-bold text-lg mb-3">2</div>
                  <h4 className="font-bold text-gray-900 mb-1">Taps "Request"</h4>
                  <p className="text-sm text-gray-500">You get notified instantly</p>
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-10 h-10 bg-green-600 text-white rounded-full font-bold text-lg mb-3">3</div>
                  <h4 className="font-bold text-gray-900 mb-1">You approve</h4>
                  <p className="text-sm text-gray-500">They can watch immediately</p>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-green-200">
                <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-gray-700">
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Never miss a request
                  </span>
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Preview the channel first
                  </span>
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    One tap to approve or deny
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Channel Review Feature - Key Differentiator */}
      <section className="py-16 bg-gradient-to-br from-purple-600 to-indigo-700">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              {/* Visual */}
              <div className="relative order-2 md:order-1">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  {/* Channel being analyzed */}
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/20">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">"FunnyPranks4Kids"</p>
                      <p className="text-purple-200 text-xs">850K subscribers • Looks kid-friendly...</p>
                    </div>
                    <div className="ml-auto">
                      <span className="bg-white/20 text-white px-2 py-1 rounded text-xs">AI Review</span>
                    </div>
                  </div>
                  {/* Analysis result */}
                  <div className="space-y-3">
                    <div className="bg-red-500/30 rounded-lg p-3 border border-red-400/50">
                      <p className="text-red-300 text-xs uppercase font-semibold mb-1">🚫 NOT RECOMMENDED</p>
                      <p className="text-white text-sm">"Despite kid-friendly branding, recent videos contain bullying behavior, crude humor, and dangerous stunts. Several videos feature pranks that could encourage harmful imitation."</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="bg-red-500/40 text-red-200 px-2 py-1 rounded text-xs font-medium">Dangerous Stunts</span>
                      <span className="bg-red-500/40 text-red-200 px-2 py-1 rounded text-xs font-medium">Bullying Content</span>
                      <span className="bg-red-500/40 text-red-200 px-2 py-1 rounded text-xs font-medium">Crude Language</span>
                    </div>
                    {/* Age Recommendation */}
                    <div className="pt-3 border-t border-white/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-red-400 text-lg">🛡️</span>
                          <span className="text-red-300 font-semibold text-sm">Minimum Age: 16+ (Not for children)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Content */}
              <div className="text-white order-1 md:order-2">
                <div className="inline-block bg-white/20 text-white px-3 py-1 rounded-full text-sm font-bold mb-4 border border-white/30">
                  AI-POWERED
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                  Instant Channel Reviews
                </h2>
                <p className="text-lg text-purple-100 mb-6">
                  Not sure if a channel is appropriate? Our AI analyzes the channel's content and recent videos to give you a quick safety assessment.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-white flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span><strong>One-tap reviews</strong> — Get a safety summary before approving</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-white flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span><strong>Content flags</strong> — Violence, language, scary content, mature themes</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-white flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span><strong>Age recommendations</strong> — Know if it's right for your 7 or 12 year old</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* No Algorithm - Unique Feature */}
      <section className="py-16 bg-gradient-to-br from-red-600 to-orange-500">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="text-white">
                <div className="inline-block bg-white/20 text-white px-3 py-1 rounded-full text-sm font-bold mb-4 border border-white/30">
                  ONLY WITH SAFETUBE
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                  No Algorithm. No Rabbit Holes.
                </h2>
                <p className="text-lg text-white/90 mb-6">
                  YouTube's algorithm is designed to keep kids watching—and it often leads them to concerning content. SafeTube eliminates the algorithm entirely.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-white flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span><strong>No "Up Next" suggestions</strong> — Only approved content plays</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-white flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span><strong>No recommended videos</strong> — They browse YOUR curated library</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-white flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span><strong>No "watch next" autoplay</strong> — Videos stop when they're done</span>
                  </li>
                </ul>
              </div>
              <div className="relative">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  <p className="text-white/80 text-xs uppercase font-semibold mb-3 text-center">What your kid sees:</p>
                  <div className="space-y-3">
                    <div className="bg-white rounded-lg p-3 flex items-center gap-3">
                      <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                        <span className="text-2xl">🎮</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">Gaming Channel</p>
                        <p className="text-green-600 text-xs font-medium">✓ Approved</p>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-2xl">🔬</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">Science Channel</p>
                        <p className="text-green-600 text-xs font-medium">✓ Approved</p>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 flex items-center gap-3">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <span className="text-2xl">🎨</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">Art Tutorials</p>
                        <p className="text-green-600 text-xs font-medium">✓ Approved</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-white text-center text-sm mt-4 font-medium">Only your hand-picked channels. Nothing else.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Time Limits Feature */}
      <section className="py-16 bg-gradient-to-br from-blue-600 to-indigo-700">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="relative order-2 md:order-1">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  <div className="text-center mb-4">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-3">
                      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-3xl font-bold text-white">1h 30m</p>
                    <p className="text-blue-200 text-sm">Daily limit for Emma</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-blue-200">Watched today</span>
                      <span className="text-white font-medium">45 minutes</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div className="bg-green-400 h-2 rounded-full" style={{ width: '50%' }}></div>
                    </div>
                    <p className="text-green-300 text-xs mt-2">45 minutes remaining</p>
                  </div>
                </div>
              </div>
              <div className="text-white order-1 md:order-2">
                <div className="inline-block bg-white/20 text-white px-3 py-1 rounded-full text-sm font-bold mb-4 border border-white/30">
                  SCREEN TIME
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                  Built-In Time Limits
                </h2>
                <p className="text-lg text-blue-100 mb-6">
                  Set daily watch limits for each child. When time's up, SafeTube stops. No more battles over "just one more video."
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-white flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span><strong>Per-child limits</strong> — Different limits for different kids</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-white flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span><strong>Automatic cutoff</strong> — No arguing, app enforces limits</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-white flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span><strong>View history</strong> — See exactly how much they watched</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-4">
            How It Works
          </h2>
          <p className="text-xl text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            Three simple steps to safe YouTube for your family
          </p>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center p-6 bg-white rounded-2xl shadow-sm">
              <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <span className="text-3xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">You Search & Approve</h3>
              <p className="text-gray-600 mb-4">
                Search "Mark Rober" in your dashboard. See his channel. Tap "Approve". Done in seconds.
              </p>
              <div className="bg-red-50 rounded-lg p-3 text-left">
                <p className="text-red-800 text-sm font-medium">Example:</p>
                <p className="text-red-600 text-sm">"I approved 20 channels in 5 minutes on my first day."</p>
              </div>
            </div>

            <div className="text-center p-6 bg-white rounded-2xl shadow-sm">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <span className="text-3xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Your Kid Logs In & Watches</h3>
              <p className="text-gray-600 mb-4">
                Emma goes to getsafetube.com/play. Types her 4-digit PIN. Sees her approved channels. Taps play. That's it.
              </p>
              <div className="bg-blue-50 rounded-lg p-3 text-left">
                <p className="text-blue-800 text-sm font-medium">Key point:</p>
                <p className="text-blue-600 text-sm">She can ONLY see what you've approved. Nothing else exists for her.</p>
              </div>
            </div>

            <div className="text-center p-6 bg-white rounded-2xl shadow-sm">
              <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <span className="text-3xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">She Requests, You Decide</h3>
              <p className="text-gray-600 mb-4">
                Emma wants "Dude Perfect". She taps Request. You get a notification. Check the channel. Approve in 10 seconds.
              </p>
              <div className="bg-green-50 rounded-lg p-3 text-left">
                <p className="text-green-800 text-sm font-medium">You're in control:</p>
                <p className="text-green-600 text-sm">Approve or deny. She gets instant feedback either way.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem/Solution */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-8">
              You've Tried Everything Else...
            </h2>

            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-red-50 rounded-xl p-5 border-2 border-red-200">
                <div className="flex items-start gap-3">
                  <span className="text-red-500 text-2xl">✗</span>
                  <div>
                    <p className="font-bold text-gray-900">YouTube Kids</p>
                    <p className="text-gray-600 text-sm">Too babyish for older kids. Weird algorithm. Creepy videos slip through.</p>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 rounded-xl p-5 border-2 border-red-200">
                <div className="flex items-start gap-3">
                  <span className="text-red-500 text-2xl">✗</span>
                  <div>
                    <p className="font-bold text-gray-900">Restricted Mode</p>
                    <p className="text-gray-600 text-sm">Easy to bypass. Misses tons of inappropriate content. Kids know how to turn it off.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-xl p-6 border-2 border-green-400">
              <div className="flex items-center justify-center gap-3 mb-2">
                <span className="text-green-600 text-2xl">✓</span>
                <p className="font-bold text-green-900 text-xl">SafeTube</p>
              </div>
              <p className="text-green-800 text-center text-lg">
                Real YouTube. Your control. Only what you approve.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-gradient-to-r from-red-600 to-orange-500">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-center text-white mb-8">What Parents Are Saying</h2>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-white italic mb-4">
                  "My son was going down rabbit holes of weird gaming videos. Now he has 30 channels he loves and I can actually relax when he's watching."
                </p>
                <p className="text-white/80 font-medium text-sm">— Sarah M., Mom of 2</p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-white italic mb-4">
                  "YouTube Kids was too babyish for my 10-year-old. SafeTube lets him watch real content creators that I've vetted. Perfect middle ground."
                </p>
                <p className="text-white/80 font-medium text-sm">— Mike R., Dad of 1, Ohio</p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-white italic mb-4">
                  "The time limits feature is amazing. No more 'just one more video' arguments. When time's up, it's up. My daughter actually respects it now."
                </p>
                <p className="text-white/80 font-medium text-sm">— Jennifer K., Mom of 3, Texas</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ - Collapsible Accordions */}
      <section className="py-16 bg-gray-100">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
              Common Questions
            </h2>

            <div className="space-y-3">
              {[
                {
                  id: 'bypass',
                  question: "Can't my kid just open regular YouTube and bypass this?",
                  answer: "No! Your child uses SafeTube at getsafetube.com/play—a completely separate player that only shows approved content. They don't need the YouTube app. You can block YouTube using Screen Time or Family Link.",
                  featured: true
                },
                {
                  id: 'youtube-kids',
                  question: "Why not just use YouTube Kids?",
                  answer: "YouTube Kids is limited to pre-selected content that's often too babyish for older kids. The algorithm still controls what's shown. SafeTube gives YOU complete control—your kids see exactly what you've approved, nothing more.",
                  link: { text: "See full comparison", url: "/compare" }
                },
                {
                  id: 'devices',
                  question: "What devices does it work on?",
                  answer: "Any device with a browser—iPhone, iPad, Android tablets, Chromebooks, PCs, Macs. No app to install."
                },
                {
                  id: 'multiple-kids',
                  question: "Can I set different content for different kids?",
                  answer: "Yes! Each child has their own profile with their own approved channels and videos. Your teen can have different content than your 7-year-old."
                },
                {
                  id: 'inappropriate',
                  question: "What if they search for something inappropriate?",
                  answer: "You get notified instantly. They see a friendly message encouraging them to request content from you instead."
                }
              ].map((faq) => (
                <div
                  key={faq.id}
                  className={`rounded-xl shadow-sm overflow-hidden transition-all duration-200 ${
                    faq.featured ? 'border-2 border-red-400' : 'border border-gray-200'
                  } ${openFaq === faq.id ? (faq.featured ? 'bg-red-50' : 'bg-white') : 'bg-white'}`}
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left"
                  >
                    <h3 className={`font-bold pr-4 ${faq.featured ? 'text-red-900' : 'text-gray-900'}`}>
                      {faq.question}
                    </h3>
                    <svg
                      className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${
                        openFaq === faq.id ? 'rotate-180' : ''
                      } ${faq.featured ? 'text-red-600' : 'text-gray-500'}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-200 ${
                      openFaq === faq.id ? 'max-h-48 pb-4' : 'max-h-0'
                    }`}
                  >
                    <p className={`px-5 ${faq.featured ? 'text-red-800' : 'text-gray-600'}`}>
                      {faq.answer}
                      {faq.link && (
                        <Link to={faq.link.url} className="block mt-2 text-red-600 hover:text-red-700 font-medium text-sm">
                          {faq.link.text} →
                        </Link>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Simple Pricing</h2>
              <p className="text-gray-600">One plan. Everything included. Cancel anytime.</p>
            </div>

            <div className="max-w-md mx-auto">
              <div className="bg-gradient-to-br from-red-600 to-orange-500 rounded-2xl p-8 text-white shadow-xl">
                <div className="text-center mb-6">
                  <div className="text-5xl font-bold mb-1">$4.99</div>
                  <div className="text-white/80">/month after trial</div>
                </div>

                <ul className="space-y-3 mb-8">
                  {['7-day free trial', 'No credit card to start', 'Unlimited children', 'Unlimited channels', 'Time limits included', 'Cancel anytime'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to="/signup"
                  className="block w-full bg-white text-red-600 hover:bg-gray-100 text-center py-4 rounded-xl font-bold text-lg transition"
                >
                  Get 7 Days Free
                </Link>
              </div>
            </div>

            {/* Money-back guarantee */}
            <div className="mt-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl flex items-center justify-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="text-sm font-medium">30-day money-back guarantee — no questions asked</span>
            </div>

            <p className="text-center text-gray-500 text-sm mt-4">
              Tried YouTube Kids and it didn't work? SafeTube is the solution that actually gives you control.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to Take Back Control of YouTube?
            </h2>
            <p className="text-xl text-gray-400 mb-8">
              Give your kids the videos they love. Keep your peace of mind.
            </p>
            <Link
              to="/signup"
              className="btn-brand inline-block rounded-xl text-lg"
            >
              Start 7-Day Free Trial
            </Link>
            <p className="text-gray-500 text-sm mt-4">
              No credit card required • Works on any device
            </p>
          </div>
        </div>
      </section>

      {/* SafeTunes Cross-Promotion */}
      <section className="py-10 bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 88.994 96.651">
                    <path d="M44.516,0v47.835c-.628.592-1.894-.232-2.774-.408-10.205-2.043-21.424,7.753-16.888,18.082,5.228,11.906,24.562,7.626,26.602-4.966.158-12.344.543-24.817.231-37.18-.01-.404-.181-.761-.194-1.16.138-.314.351-.336.66-.321.458.023,2.31.729,2.842.955,4.05,1.723,9.412,6.762,9.412,11.473v4.972c0,.135-.441.687-.1.894,1.809-2.076,3.087-4.729,3.459-7.48,1.916-14.144-14.809-18.642-16.24-30.063-.068-.546-.203-1.066.494-.894,11.509,2.848,22.868,6.412,34.333,9.432,1.504.879,2.371,2.06,2.527,3.837-.747,15.337,2.184,31.696-3.436,46.306-5.899,15.337-19.374,26.415-34.03,33-1.43.642-4.278,1.969-5.692,2.264-2.548.531-7.594-1.962-10.028-3.123C16.659,84.376,1.212,67.91.153,45.855c-.49-10.206.391-20.798,0-31.045.116-1.814,1.557-3.391,3.234-3.926L43.071.047l1.445-.047Z"/>
                  </svg>
                </div>
                <div className="text-white">
                  <p className="text-sm font-medium text-white/80">Also from our team</p>
                  <p className="text-lg font-bold">Need to control Apple Music too?</p>
                </div>
              </div>
              <a
                href="https://getsafetunes.com"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white text-purple-600 hover:bg-gray-100 px-6 py-3 rounded-xl font-bold text-sm transition whitespace-nowrap shadow-lg"
              >
                Try SafeTunes →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1a1a2e] text-white py-10">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* App Links */}
          <div className="flex flex-wrap justify-center gap-6 sm:gap-8">
            <a href="https://getsafetunes.com" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-white/70 hover:text-white transition-colors">
              SafeTunes
            </a>
            <a href="https://getsafetube.com" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-white/70 hover:text-white transition-colors">
              SafeTube
            </a>
            <a href="https://getsafereads.com" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-white/70 hover:text-white transition-colors">
              SafeReads
            </a>
          </div>

          {/* Legal Links */}
          <div className="mt-6 flex flex-wrap justify-center gap-4 sm:gap-6">
            <span className="flex items-center gap-4 sm:gap-6">
              <Link to="/privacy" className="text-sm text-white/50 hover:text-white/70 transition-colors">Privacy</Link>
              <span className="text-white/30 hidden sm:inline">|</span>
            </span>
            <span className="flex items-center gap-4 sm:gap-6">
              <Link to="/terms" className="text-sm text-white/50 hover:text-white/70 transition-colors">Terms</Link>
            </span>
          </div>

          {/* Contact */}
          <div className="mt-6 text-center">
            <a href="mailto:jeremiah@getsafefamily.com" className="text-sm text-white/50 hover:text-white/70 transition-colors">
              jeremiah@getsafefamily.com
            </a>
          </div>

          {/* Copyright */}
          <div className="mt-6 text-center">
            <p className="text-sm text-white/40">
              © {new Date().getFullYear()} Safe Family
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
