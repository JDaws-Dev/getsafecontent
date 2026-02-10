import { useEffect } from 'react';
import { Link } from 'react-router-dom';

function LandingPageSimple() {
  // Add FAQ Schema markup for Google featured snippets (SEO)
  useEffect(() => {
    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Does Apple Music have parental controls?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Apple Music has basic parental controls through Screen Time that filter songs labeled 'explicit'. However, many inappropriate songs slip through because they're not labeled. Apple Music also can't hide album artwork or notify you of bad searches. SafeTunes gives you complete control by letting you approve every album."
          }
        },
        {
          "@type": "Question",
          "name": "How do I block explicit songs on Apple Music?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Go to Settings > Screen Time > Content Restrictions > Music to enable Apple's 'Clean' filter. But this only blocks songs labeled 'explicit' - many slip through. SafeTunes works differently: instead of blocking, you approve. Your child can only play albums you've specifically approved."
          }
        },
        {
          "@type": "Question",
          "name": "Can I hide inappropriate album covers on Apple Music?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Apple Music doesn't offer any way to hide album artwork. SafeTunes is the only solution that lets you approve music while hiding covers you don't want your child to see. You toggle artwork visibility on a per-album basis."
          }
        },
        {
          "@type": "Question",
          "name": "Why doesn't Apple Music's explicit filter work?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Apple Music's filter relies on record labels to mark songs as 'explicit'. Many songs with inappropriate themes, violent lyrics, or mature content aren't labeled. The filter also doesn't address provocative album artwork, which your child can still see."
          }
        },
        {
          "@type": "Question",
          "name": "How do I know if my child searches for bad content on Apple Music?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Apple Music doesn't notify parents of searches. SafeTunes notifies you instantly when your child searches for content outside their approved library. You see exactly what they searched for, and the search is automatically blocked."
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
      {/* Simple Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 88.994 96.651">
                  <path d="M44.516,0v47.835c-.628.592-1.894-.232-2.774-.408-10.205-2.043-21.424,7.753-16.888,18.082,5.228,11.906,24.562,7.626,26.602-4.966.158-12.344.543-24.817.231-37.18-.01-.404-.181-.761-.194-1.16.138-.314.351-.336.66-.321.458.023,2.31.729,2.842.955,4.05,1.723,9.412,6.762,9.412,11.473v4.972c0,.135-.441.687-.1.894,1.809-2.076,3.087-4.729,3.459-7.48,1.916-14.144-14.809-18.642-16.24-30.063-.068-.546-.203-1.066.494-.894,11.509,2.848,22.868,6.412,34.333,9.432,1.504.879,2.371,2.06,2.527,3.837-.747,15.337,2.184,31.696-3.436,46.306-5.899,15.337-19.374,26.415-34.03,33-1.43.642-4.278,1.969-5.692,2.264-2.548.531-7.594-1.962-10.028-3.123C16.659,84.376,1.212,67.91.153,45.855c-.49-10.206.391-20.798,0-31.045.116-1.814,1.557-3.391,3.234-3.926L43.071.047l1.445-.047Z"/>
                </svg>
              </div>
              <span className="text-2xl font-bold text-gray-900">SafeTunes</span>
            </Link>

            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link to="/login" className="text-gray-600 hover:text-gray-900 font-medium text-xs sm:text-base whitespace-nowrap">
                Parent Login
              </Link>
              <Link to="/kids" className="text-gray-600 hover:text-gray-900 font-medium text-xs sm:text-base whitespace-nowrap">
                Kid Login
              </Link>
              <Link
                to="/signup"
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg font-semibold transition text-xs sm:text-base whitespace-nowrap"
              >
                Try Free
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero - Dark gradient with two-column layout */}
      <section className="py-10 sm:py-16 bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              {/* Left: Text Content */}
              <div className="text-center lg:text-left">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 bg-purple-500/20 text-purple-300 px-4 py-2 rounded-full text-sm font-semibold mb-6 border border-purple-500/30">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 88.994 96.651">
                    <path d="M44.516,0v47.835c-.628.592-1.894-.232-2.774-.408-10.205-2.043-21.424,7.753-16.888,18.082,5.228,11.906,24.562,7.626,26.602-4.966.158-12.344.543-24.817.231-37.18-.01-.404-.181-.761-.194-1.16.138-.314.351-.336.66-.321.458.023,2.31.729,2.842.955,4.05,1.723,9.412,6.762,9.412,11.473v4.972c0,.135-.441.687-.1.894,1.809-2.076,3.087-4.729,3.459-7.48,1.916-14.144-14.809-18.642-16.24-30.063-.068-.546-.203-1.066.494-.894,11.509,2.848,22.868,6.412,34.333,9.432,1.504.879,2.371,2.06,2.527,3.837-.747,15.337,2.184,31.696-3.436,46.306-5.899,15.337-19.374,26.415-34.03,33-1.43.642-4.278,1.969-5.692,2.264-2.548.531-7.594-1.962-10.028-3.123C16.659,84.376,1.212,67.91.153,45.855c-.49-10.206.391-20.798,0-31.045.116-1.814,1.557-3.391,3.234-3.926L43.071.047l1.445-.047Z"/>
                  </svg>
                  Apple Music Parental Controls
                </div>

                {/* Headline */}
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                  The Apple Music Parental Dashboard <br className="hidden sm:block" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">That Actually Works</span>
                </h1>

                {/* Subhead */}
                <p className="text-lg sm:text-xl text-gray-300 mb-6 max-w-xl mx-auto lg:mx-0">
                  A web app that gives you a parent dashboard and your kids a safe music player.
                  You approve albums, they can only play what you've approved.
                </p>

                {/* Power benefit statement */}
                <div className="flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-2 text-sm text-purple-200 mb-6">
                  <span>They play ONLY approved music</span>
                  <span>You see what they search for</span>
                  <span>Block inappropriate covers instantly</span>
                </div>

                {/* CTA */}
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-4">
                  <Link
                    to="/signup"
                    className="w-full sm:w-auto bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-4 rounded-xl font-bold text-lg transition shadow-lg shadow-purple-500/25"
                  >
                    Get 7 Days Free — No Credit Card
                  </Link>
                </div>

                {/* Micro-copy under CTA */}
                <p className="text-gray-400 text-sm mb-6">Takes 5 minutes to set up. Cancel anytime.</p>

                {/* Trust line - family count */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 text-sm text-gray-300 mb-4">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Trusted by families worldwide</span>
                  <span className="text-gray-500">•</span>
                  <span>COPPA Compliant</span>
                  <span className="text-gray-500">•</span>
                  <span>No Data Selling</span>
                </div>

                {/* Clarity line with kid access URL */}
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                  <span className="text-purple-300">Kids access at</span>
                  <span className="text-white font-mono font-bold">getsafetunes.com/play</span>
                </div>
                <p className="mt-3 text-gray-400 text-sm">
                  Works with your existing Apple Music subscription
                </p>
              </div>

              {/* Right: Hero Image */}
              <div className="order-first lg:order-none flex flex-1 relative w-full items-center justify-center lg:justify-end">
                <div className="relative max-w-xs sm:max-w-sm lg:max-w-lg w-full">
                  <div
                    className="relative aspect-[4/5] overflow-hidden shadow-2xl"
                    style={{ borderRadius: '0 3rem 3rem 3rem' }}
                  >
                    <img
                      src="https://images.pexels.com/photos/1490844/pexels-photo-1490844.jpeg?auto=compress&cs=tinysrgb&w=600&h=750&fit=crop"
                      alt="Boy listening to music with headphones"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Apps Announcement Banner */}
      <section className="py-4 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-700">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-3 text-center">
            {/* iOS Icon */}
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-900" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
            </div>
            {/* Android Icon */}
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.523 2.592a.5.5 0 0 0-.867-.5l-1.48 2.56a7.502 7.502 0 0 0-6.352 0l-1.48-2.56a.5.5 0 0 0-.867.5l1.432 2.482a7.528 7.528 0 0 0-3.91 6.576H20a7.528 7.528 0 0 0-3.91-6.576l1.433-2.482zM7 9.5a1 1 0 1 1 2 0 1 1 0 0 1-2 0zm8 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM4 12.65V19.5a2 2 0 0 0 2 2h1V12H4.5a.5.5 0 0 0-.5.65zm15 0V19.5a2 2 0 0 1-2 2h-1V12h2.5a.5.5 0 0 1 .5.65zM8 12v10h8V12H8z"/>
              </svg>
            </div>
            {/* Text */}
            <span className="text-white font-semibold text-sm">iOS & Android Apps Coming Soon</span>
          </div>
        </div>
      </section>

      {/* Demo Video Section - YouTube embed in phone mockup */}
      <section className="py-12 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-2">
              See How It Works
            </h2>
            <p className="text-gray-500 text-center mb-8">
              Watch a quick demo of the parent and kid experience
            </p>

            {/* Phone mockup container */}
            <div className="flex justify-center">
              <div className="relative">
                {/* Phone frame */}
                <div className="bg-gray-900 rounded-[3rem] p-3 shadow-2xl">
                  <div className="bg-black rounded-[2.5rem] overflow-hidden" style={{ width: '320px', maxWidth: '80vw' }}>
                    {/* Notch */}
                    <div className="bg-black h-8 flex items-center justify-center">
                      <div className="w-24 h-6 bg-gray-900 rounded-full"></div>
                    </div>
                    {/* YouTube Embed */}
                    <div style={{ aspectRatio: '9/16' }}>
                      <iframe
                        className="w-full h-full"
                        src="https://www.youtube.com/embed/A3V_AN36pUs"
                        title="SafeTunes Demo"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    </div>
                    {/* Home indicator */}
                    <div className="bg-black h-8 flex items-center justify-center">
                      <div className="w-32 h-1 bg-gray-600 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
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
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200">
                <div className="mb-4">
                  <span className="inline-block bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-bold mb-3">
                    PARENT DASHBOARD
                  </span>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">You Approve Albums</h3>
                  <p className="text-gray-600 mb-4">
                    Search all of Apple Music. Approve entire albums or just specific songs. Hide inappropriate artwork. Review your kids' requests.
                  </p>
                </div>
                <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
                  <img
                    src="/screenshots/4_ADMIN SEARCH APPROVE.png"
                    alt="Parent dashboard showing album approval interface"
                    className="w-full h-auto"
                  />
                </div>
                <ul className="mt-4 space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Search Apple Music catalog</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Approve albums with one tap</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Hide album artwork per-album</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>AI lyric reviews for quick decisions</span>
                  </li>
                </ul>
              </div>

              {/* Kid Player */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-200">
                <div className="mb-4">
                  <span className="inline-block bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold mb-3">
                    KID PLAYER
                  </span>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">They Browse Safely</h3>
                  <p className="text-gray-600 mb-4">
                    Your kids log in at getsafetunes.com/play with a PIN. They can only browse and play music you've approved. Simple, safe, no workarounds.
                  </p>
                </div>
                <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
                  <img
                    src="/screenshots/KID HOME.png"
                    alt="Kid player interface showing safe music library"
                    className="w-full h-auto"
                  />
                </div>
                <ul className="mt-4 space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Only approved music visible</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Request new albums from you</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Works on any device with browser</span>
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

            {/* Request Flow - Redesigned as visual timeline */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 md:p-8 border-2 border-green-200">
              {/* Header */}
              <div className="text-center mb-8">
                <span className="inline-block bg-green-600 text-white px-3 py-1 rounded-full text-sm font-bold mb-3">
                  REQUEST FLOW
                </span>
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Kids Request, You Approve</h3>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Your child finds a song at school. Taps request. You get notified. Review it, approve it—done in under a minute.
                </p>
              </div>

              {/* 2-Step Visual Flow */}
              <div className="grid md:grid-cols-2 gap-6 md:gap-8 items-start max-w-4xl mx-auto">
                {/* Step 1: Kid Requests */}
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-10 h-10 bg-green-600 text-white rounded-full font-bold text-lg mb-3">1</div>
                  <h4 className="font-bold text-gray-900 mb-1">She taps "Request"</h4>
                  <p className="text-sm text-gray-500 mb-3">Your phone buzzes instantly</p>
                  <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
                    <img
                      src="/screenshots/KID_REQUEST.png"
                      alt="Kid requesting an album"
                      className="w-full h-auto"
                    />
                  </div>
                </div>

                {/* Mobile arrow - shows on mobile only */}
                <div className="flex md:hidden justify-center -my-2">
                  <div className="bg-green-100 rounded-full p-2">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>
                </div>

                {/* Step 2: You Approve */}
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-10 h-10 bg-green-600 text-white rounded-full font-bold text-lg mb-3">2</div>
                  <h4 className="font-bold text-gray-900 mb-1">You approve in 10 seconds</h4>
                  <p className="text-sm text-gray-500 mb-3">She can play it immediately</p>
                  <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
                    <img
                      src="/screenshots/2_ADMIN ALBUM REQUEST.png"
                      alt="Parent approving album request"
                      className="w-full h-auto"
                    />
                  </div>
                </div>
              </div>

              {/* Benefits bar */}
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
                    AI summarizes lyrics for you
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

            {/* Protection in Action - Redesigned with centered header */}
            <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-6 md:p-8 border-2 border-red-200 mt-8">
              {/* Header */}
              <div className="text-center mb-6">
                <span className="inline-block bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold mb-3">
                  PROTECTION IN ACTION
                </span>
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Know When They Search for Bad Content</h3>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  If your child searches for something outside their approved library, they see a friendly message—and you get notified instantly.
                </p>
              </div>

              {/* Screenshot centered */}
              <div className="max-w-lg mx-auto mb-6">
                <p className="text-xs text-gray-500 mb-2 text-center font-medium">What you see in your dashboard:</p>
                <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
                  <img
                    src="/screenshots/6-ADMIN_BLOCKED SEARCH.png"
                    alt="Parent notification when child searches for inappropriate content"
                    className="w-full h-auto"
                  />
                </div>
              </div>

              {/* Benefits bar */}
              <div className="pt-4 border-t border-red-200">
                <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-gray-700">
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Instant notification
                  </span>
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    See what they searched
                  </span>
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    No shame, just protection
                  </span>
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Opens conversation
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hide Album Artwork - Unique Feature Callout */}
      <section className="py-16 bg-gradient-to-br from-amber-500 to-orange-600">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              {/* Content */}
              <div className="text-white">
                <div className="inline-block bg-white/20 text-white px-3 py-1 rounded-full text-sm font-bold mb-4 border border-white/30">
                  ONLY WITH SAFETUNES
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                  Hide Inappropriate Album Covers
                </h2>
                <p className="text-lg text-amber-100 mb-6">
                  Even "clean" albums can have provocative covers. With SafeTunes, you approve the music but hide the artwork your kids shouldn't see.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-white flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span><strong>Per-album control</strong> — Show artwork for kid-friendly covers, hide the rest</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-white flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span><strong>One-tap toggle</strong> — Kids see a simple placeholder instead</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-white flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span><strong>No other app does this</strong> — Unique to SafeTunes</span>
                  </li>
                </ul>
              </div>
              {/* Visual - Before/After comparison */}
              <div className="relative">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  {/* Before/After */}
                  <p className="text-amber-200 text-xs uppercase font-semibold mb-3 text-center">What your kid sees:</p>
                  <div className="flex items-center justify-center gap-4 mb-4">
                    {/* Before */}
                    <div className="text-center">
                      <div className="w-20 h-20 bg-gradient-to-br from-pink-400 to-red-500 rounded-lg flex items-center justify-center mb-2 relative overflow-hidden">
                        <div className="absolute inset-0 backdrop-blur-md bg-black/30"></div>
                        <span className="text-white text-xs font-bold z-10">EXPLICIT</span>
                      </div>
                      <p className="text-amber-200 text-xs">Before</p>
                    </div>
                    {/* Arrow */}
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                    {/* After */}
                    <div className="text-center">
                      <div className="w-20 h-20 bg-gray-800 rounded-lg flex items-center justify-center mb-2">
                        <svg className="w-10 h-10 text-gray-500" fill="currentColor" viewBox="0 0 88.994 96.651">
                          <path d="M44.516,0v47.835c-.628.592-1.894-.232-2.774-.408-10.205-2.043-21.424,7.753-16.888,18.082,5.228,11.906,24.562,7.626,26.602-4.966.158-12.344.543-24.817.231-37.18-.01-.404-.181-.761-.194-1.16.138-.314.351-.336.66-.321.458.023,2.31.729,2.842.955,4.05,1.723,9.412,6.762,9.412,11.473v4.972c0,.135-.441.687-.1.894,1.809-2.076,3.087-4.729,3.459-7.48,1.916-14.144-14.809-18.642-16.24-30.063-.068-.546-.203-1.066.494-.894,11.509,2.848,22.868,6.412,34.333,9.432,1.504.879,2.371,2.06,2.527,3.837-.747,15.337,2.184,31.696-3.436,46.306-5.899,15.337-19.374,26.415-34.03,33-1.43.642-4.278,1.969-5.692,2.264-2.548.531-7.594-1.962-10.028-3.123C16.659,84.376,1.212,67.91.153,45.855c-.49-10.206.391-20.798,0-31.045.116-1.814,1.557-3.391,3.234-3.926L43.071.047l1.445-.047Z"/>
                        </svg>
                      </div>
                      <p className="text-green-300 text-xs font-semibold">After</p>
                    </div>
                  </div>
                  {/* Testimonial */}
                  <div className="bg-white/10 rounded-lg p-4 text-center">
                    <p className="text-amber-100 text-sm">
                      "The album cover had a half-naked woman on it. Now my daughter just sees a music note icon. Problem solved."
                    </p>
                    <p className="text-amber-200 text-xs mt-2">— Rachel T., Mom of 2, Florida</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* AI Lyric Review Feature */}
      <section className="py-16 bg-gradient-to-br from-blue-600 to-indigo-700">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              {/* Visual */}
              <div className="relative order-2 md:order-1">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  {/* Song being analyzed */}
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/20">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 88.994 96.651">
                        <path d="M44.516,0v47.835c-.628.592-1.894-.232-2.774-.408-10.205-2.043-21.424,7.753-16.888,18.082,5.228,11.906,24.562,7.626,26.602-4.966.158-12.344.543-24.817.231-37.18-.01-.404-.181-.761-.194-1.16.138-.314.351-.336.66-.321.458.023,2.31.729,2.842.955,4.05,1.723,9.412,6.762,9.412,11.473v4.972c0,.135-.441.687-.1.894,1.809-2.076,3.087-4.729,3.459-7.48,1.916-14.144-14.809-18.642-16.24-30.063-.068-.546-.203-1.066.494-.894,11.509,2.848,22.868,6.412,34.333,9.432,1.504.879,2.371,2.06,2.527,3.837-.747,15.337,2.184,31.696-3.436,46.306-5.899,15.337-19.374,26.415-34.03,33-1.43.642-4.278,1.969-5.692,2.264-2.548.531-7.594-1.962-10.028-3.123C16.659,84.376,1.212,67.91.153,45.855c-.49-10.206.391-20.798,0-31.045.116-1.814,1.557-3.391,3.234-3.926L43.071.047l1.445-.047Z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">"Money Trees"</p>
                      <p className="text-blue-200 text-xs">Kendrick Lamar</p>
                    </div>
                    <div className="ml-auto">
                      <span className="bg-white/20 text-white px-2 py-1 rounded text-xs">AI Analysis</span>
                    </div>
                  </div>
                  {/* Analysis result */}
                  <div className="space-y-3">
                    <div className="bg-red-500/20 rounded-lg p-3 border border-red-400/30">
                      <p className="text-red-300 text-xs uppercase font-semibold mb-1">⚠️ Content Warning</p>
                      <p className="text-white text-sm">"Contains explicit drug references, glorifies substance abuse, and includes violent imagery."</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="bg-red-500/30 text-red-200 px-2 py-1 rounded text-xs font-medium">Drug References</span>
                      <span className="bg-red-500/30 text-red-200 px-2 py-1 rounded text-xs font-medium">Violence</span>
                    </div>
                    {/* Verdict */}
                    <div className="pt-3 border-t border-white/20">
                      <div className="flex items-center gap-2">
                        <span className="text-red-400 text-lg">✗</span>
                        <span className="text-red-300 font-semibold text-sm">Not Recommended for Kids</span>
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
                  Instant Lyric Reviews
                </h2>
                <p className="text-lg text-blue-100 mb-6">
                  Don't have time to read every song's lyrics? Our AI analyzes songs and gives you a plain-English summary of what they're about.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-white flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span><strong>One-tap summaries</strong> — See what a song is really about before approving</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-white flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span><strong>Theme detection</strong> — Flags violence, drugs, profanity, and mature themes</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-white flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span><strong>Save hours</strong> — No more Googling lyrics for every song request</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Light gray section */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-4">
            How It Works
          </h2>
          <p className="text-xl text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            Three simple steps to safe music for your family
          </p>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Step 1 */}
            <div className="text-center p-6 bg-white rounded-2xl shadow-sm">
              <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <span className="text-3xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">You Search & Approve</h3>
              <p className="text-gray-600 mb-4">
                Search "Taylor Swift" in your dashboard. See all 12 albums. Tap "Approve" on the ones you want. Done in seconds.
              </p>
              <div className="bg-purple-50 rounded-lg p-3 text-left">
                <p className="text-purple-800 text-sm font-medium">Example:</p>
                <p className="text-purple-600 text-sm">"I approved 50 albums in 10 minutes on my first day."</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="text-center p-6 bg-white rounded-2xl shadow-sm">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <span className="text-3xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Your Kid Logs In & Plays</h3>
              <p className="text-gray-600 mb-4">
                Emma goes to getsafetunes.com/play. Types her 4-digit PIN. Sees 50 approved albums. Taps play. That's it.
              </p>
              <div className="bg-blue-50 rounded-lg p-3 text-left">
                <p className="text-blue-800 text-sm font-medium">Key point:</p>
                <p className="text-blue-600 text-sm">She can ONLY see what you've approved. Nothing else exists for her.</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="text-center p-6 bg-white rounded-2xl shadow-sm">
              <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <span className="text-3xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">She Requests, You Decide</h3>
              <p className="text-gray-600 mb-4">
                Emma wants "Folklore" by Taylor Swift. She taps Request. You get a notification. Review lyrics. Approve in 10 seconds.
              </p>
              <div className="bg-green-50 rounded-lg p-3 text-left">
                <p className="text-green-800 text-sm font-medium">You're in control:</p>
                <p className="text-green-600 text-sm">Approve or deny. She gets instant feedback either way.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem/Solution - White section */}
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
                    <p className="font-bold text-gray-900">Apple Music's Filter</p>
                    <p className="text-gray-600 text-sm">Still lets through questionable content and bad album covers</p>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 rounded-xl p-5 border-2 border-red-200">
                <div className="flex items-start gap-3">
                  <span className="text-red-500 text-2xl">✗</span>
                  <div>
                    <p className="font-bold text-gray-900">Spotify Kids</p>
                    <p className="text-gray-600 text-sm">Only Kidz Bop covers. Your 10-year-old wants real artists.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-xl p-6 border-2 border-green-400">
              <div className="flex items-center justify-center gap-3 mb-2">
                <span className="text-green-600 text-2xl">✓</span>
                <p className="font-bold text-green-900 text-xl">SafeTunes</p>
              </div>
              <p className="text-green-800 text-center text-lg">
                Real artists. Real music. Only what you approve.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials - Social Proof */}
      <section className="py-16 bg-purple-600">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-center text-white mb-8">What Parents Are Saying</h2>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Testimonial 1 */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-white italic mb-4">
                  "I walked in on my 11-year-old listening to WAP. That same night I set up SafeTunes. Now she has 400+ songs she loves, and I finally have peace of mind."
                </p>
                <p className="text-purple-200 font-medium text-sm">— Jennifer M., Mom of 2</p>
              </div>

              {/* Testimonial 2 */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-white italic mb-4">
                  "My teen actually ASKED to use this instead of fighting me. He likes picking albums to request, and I like knowing exactly what he's listening to."
                </p>
                <p className="text-purple-200 font-medium text-sm">— David R., Dad of 1, Texas</p>
              </div>

              {/* Testimonial 3 */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-white italic mb-4">
                  "No more fighting over music. I approved 200 albums the first week. Now my 8-year-old just plays without me worrying. Total game-changer."
                </p>
                <p className="text-purple-200 font-medium text-sm">— Michelle K., Mom of 3, California</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ - Gray section */}
      <section className="py-16 bg-gray-100">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
              Common Questions
            </h2>

            <div className="space-y-4">
              {/* #1 MOST IMPORTANT FAQ - The bypass question */}
              <div className="bg-purple-50 rounded-xl p-5 shadow-sm border-2 border-purple-400">
                <h3 className="font-bold text-purple-900 mb-2">Can't my kid just open regular Apple Music and bypass this?</h3>
                <p className="text-purple-800">No! Your child uses SafeTunes at <span className="font-mono font-semibold">getsafetunes.com/play</span>—a completely separate player that only shows approved music. They don't need the Apple Music app installed. You can block the Apple Music app using Screen Time (we'll show you how). It's like giving them a "kid version" of Apple Music that you fully control.</p>
              </div>

              <div className="bg-red-50 rounded-xl p-5 shadow-sm border-2 border-red-200">
                <h3 className="font-bold text-red-900 mb-2">Why doesn't Apple Music's built-in filter work?</h3>
                <p className="text-red-800">Apple Music's "Clean" filter only blocks songs labeled "explicit" by record labels—many inappropriate songs slip through. It also can't hide provocative album covers or notify you when kids search for bad content. SafeTunes fixes all of this.</p>
              </div>

              <div className="bg-white rounded-xl p-5 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-2">Do I need a separate music subscription?</h3>
                <p className="text-gray-600">No! SafeTunes works with your existing Apple Music family subscription.</p>
              </div>

              <div className="bg-white rounded-xl p-5 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-2">What devices does it work on?</h3>
                <p className="text-gray-600">Any device with a browser—iPhone, iPad, Android, Chromebook, PC, Mac.</p>
              </div>

              <div className="bg-purple-50 rounded-xl p-5 shadow-sm border-2 border-purple-200">
                <h3 className="font-bold text-purple-900 mb-2">What if my child searches for inappropriate content?</h3>
                <p className="text-purple-800">You get notified instantly. The search is blocked and they see encouragement instead of shame.</p>
              </div>

              <div className="bg-white rounded-xl p-5 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-2">Can I hide album covers?</h3>
                <p className="text-gray-600">Yes! You choose which albums show artwork. Perfect for questionable covers.</p>
              </div>

              <div className="bg-green-50 rounded-xl p-5 shadow-sm border-2 border-green-200">
                <h3 className="font-bold text-green-900 mb-2">Will my kid resent me for monitoring their music?</h3>
                <p className="text-green-800">Research shows transparent, reasonable restrictions actually strengthen trust. SafeTunes encourages conversation, not sneaking. Kids can request any album—you just get to review it first. Most parents find it opens up great discussions about music and values.</p>
              </div>

              <div className="bg-white rounded-xl p-5 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-2">How often will they request new music?</h3>
                <p className="text-gray-600">Varies, but most families settle into 2-5 requests per week once your library is built up. The first week is busiest as you approve their favorites.</p>
              </div>

              <div className="bg-white rounded-xl p-5 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-2">Can they request music from school or a friend's house?</h3>
                <p className="text-gray-600">Yes! They can request from anywhere with an internet connection. You approve in seconds from your phone.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing - White section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Simple Pricing</h2>
              <p className="text-gray-600">One plan. Everything included. Cancel anytime.</p>
            </div>

            {/* CTA Card */}
            <div className="max-w-md mx-auto">
              <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl p-8 text-white shadow-xl">
                <div className="text-center mb-6">
                  <div className="text-5xl font-bold mb-1">$4.99</div>
                  <div className="text-purple-200">/month after trial</div>
                </div>

                <ul className="space-y-3 mb-8">
                  {['7-day free trial', 'No credit card to start', 'Unlimited children', 'Unlimited albums', 'Cancel anytime'].map((item, i) => (
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
                  className="block w-full bg-white text-purple-600 hover:bg-gray-100 text-center py-4 rounded-xl font-bold text-lg transition"
                >
                  Get 7 Days Free
                </Link>
              </div>
            </div>

            {/* Reassurance line */}
            <p className="text-center text-gray-500 text-sm mt-6">
              Already tried Apple Music's filter? SafeTunes is the only solution that actually works.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA - Dark section */}
      <section className="py-16 bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to Finally Sleep at Night?
            </h2>
            <p className="text-xl text-gray-400 mb-8">
              Give your kids the music they love. Keep your peace of mind.
            </p>
            <Link
              to="/signup"
              className="inline-block bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-10 py-4 rounded-xl font-bold text-lg transition shadow-lg"
            >
              Start 7-Day Free Trial
            </Link>
            <p className="text-gray-500 text-sm mt-4">
              No credit card required • Works with Apple Music
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 text-gray-400 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <p className="text-sm">&copy; 2026 SafeTunes. All rights reserved.</p>
              {/* Instagram Link */}
              <a
                href="https://instagram.com/getsafetunes"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition"
                title="Follow us on Instagram"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
            </div>
            <div className="flex gap-6 text-sm">
              <Link to="/privacy" className="hover:text-white transition">Privacy</Link>
              <Link to="/terms" className="hover:text-white transition">Terms</Link>
              <Link to="/login" className="hover:text-white transition">Parent Login</Link>
              <Link to="/kids" className="hover:text-white transition">Kid Login</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPageSimple;
