import { useEffect } from 'react';
import { Link } from 'react-router-dom';

function FoundBadMusicPage() {
  // Set page title and meta tags for SEO
  useEffect(() => {
    document.title = 'Apple Music Parental Controls That Actually Work | SafeTunes';

    // Set meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.name = 'description';
      document.head.appendChild(metaDescription);
    }
    metaDescription.content = "Apple Music parental controls don't block everything. SafeTunes lets you approve every album your child can listen to, hide album artwork, and get notified of bad searches. Free 7-day trial.";

    // Add FAQ Schema markup for Google featured snippets
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

    // Cleanup on unmount
    return () => {
      document.title = 'SafeTunes';
      const existingScript = document.getElementById('faq-schema');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  return (
    <>
      <div className="min-h-screen bg-white">
        {/* Header */}
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
              <Link
                to="/signup"
                className="btn-brand rounded-lg"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </header>

        {/* Hero - Empathetic, understanding */}
        <section className="py-12 sm:py-16 bg-gradient-to-b from-red-50 to-white">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-full text-sm font-semibold mb-6">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  You're not alone
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                  You Just Found Out Your Child<br />
                  <span className="text-red-600">Listened to Something They Shouldn't Have</span>
                </h1>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  It's a terrible feeling. Maybe you heard explicit lyrics coming from their room. Maybe you saw an album cover that made your stomach drop. You're upset, worried, and wondering how to prevent this from happening again.
                </p>

                {/* Trust signals */}
                <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mt-8 text-sm text-gray-600">
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Setup in 5 minutes
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    No credit card required
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Works with Apple Music
                  </span>
                </div>

                {/* Secondary CTA after hero */}
                <div className="mt-8">
                  <Link
                    to="/signup"
                    className="btn-brand inline-block rounded-xl text-lg"
                  >
                    Fix This Now - Start Free Trial
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Validation */}
        <section className="py-12 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                First, Take a Breath
              </h2>
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-200 mb-8">
                <p className="text-blue-900 text-lg mb-4">
                  <strong>This happens to caring parents every day.</strong> You gave your child access to music because you wanted them to enjoy it. Apple Music's "explicit content" filter doesn't catch everything—and it definitely doesn't filter album artwork.
                </p>
                <p className="text-blue-800">
                  The good news? You caught it. And now you can fix it.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* The Problem */}
        <section className="py-12 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                Why Apple Music's Built-in Controls Don't Work
              </h2>

              <div className="space-y-4">
                <div className="bg-white rounded-xl p-5 border border-gray-200">
                  <div className="flex items-start gap-3">
                    <span className="text-red-500 text-xl">✗</span>
                    <div>
                      <p className="font-bold text-gray-900">The "Clean" Filter Misses Content</p>
                      <p className="text-gray-600">Many songs with inappropriate themes aren't labeled "explicit." Your child can still access them.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-5 border border-gray-200">
                  <div className="flex items-start gap-3">
                    <span className="text-red-500 text-xl">✗</span>
                    <div>
                      <p className="font-bold text-gray-900">Album Artwork Isn't Filtered At All</p>
                      <p className="text-gray-600">Even "clean" versions of albums show the same provocative covers. There's no way to hide them in Apple Music.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-5 border border-gray-200">
                  <div className="flex items-start gap-3">
                    <span className="text-red-500 text-xl">✗</span>
                    <div>
                      <p className="font-bold text-gray-900">Kids Can Search Anything</p>
                      <p className="text-gray-600">They can look up any artist, any song. You have no visibility into what they're searching for.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The Solution */}
        <section className="py-12 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
                The Solution: You Approve Everything
              </h2>
              <p className="text-gray-600 text-center mb-8">
                SafeTunes gives you complete control over what your child can listen to on Apple Music.
              </p>

              <div className="grid sm:grid-cols-2 gap-6 mb-8">
                <div className="bg-green-50 rounded-xl p-6 border-2 border-green-200">
                  <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">You Choose Every Album</h3>
                  <p className="text-gray-600 text-sm">Search Apple Music, preview songs, and approve only what you're comfortable with. Kids can only play approved music.</p>
                </div>

                <div className="bg-green-50 rounded-xl p-6 border-2 border-green-200">
                  <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">Hide Album Artwork</h3>
                  <p className="text-gray-600 text-sm">Approve the music but hide covers you don't want them seeing. Kids see a simple placeholder instead.</p>
                </div>

                <div className="bg-green-50 rounded-xl p-6 border-2 border-green-200">
                  <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">Get Notified of Bad Searches</h3>
                  <p className="text-gray-600 text-sm">If your child searches for inappropriate content, you get an instant notification. The search is blocked automatically.</p>
                </div>

                <div className="bg-green-50 rounded-xl p-6 border-2 border-green-200">
                  <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">Kids Can Request Music</h3>
                  <p className="text-gray-600 text-sm">They find something they want? They request it, you review it. Great opportunity for conversations about music choices.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* AI Lyric Review - Never Be Blindsided Again */}
        <section className="py-12 bg-gradient-to-br from-blue-600 to-indigo-700">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                {/* Visual */}
                <div className="relative order-2 md:order-1">
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-white font-semibold">AI Analysis</span>
                    </div>
                    <div className="space-y-3">
                      <div className="bg-red-500/20 rounded-lg p-3 border border-red-400/30">
                        <p className="text-red-300 text-xs uppercase font-semibold mb-1">⚠️ Content Warning</p>
                        <p className="text-white text-sm">"This song contains explicit drug references, glorifies substance abuse, and includes violent imagery."</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="bg-red-500/30 text-red-200 px-2 py-1 rounded text-xs font-medium">Drug References</span>
                        <span className="bg-red-500/30 text-red-200 px-2 py-1 rounded text-xs font-medium">Violence</span>
                        <span className="bg-yellow-500/30 text-yellow-200 px-2 py-1 rounded text-xs font-medium">Not Recommended</span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Content */}
                <div className="text-white order-1 md:order-2">
                  <div className="inline-block bg-red-500/30 text-white px-3 py-1 rounded-full text-sm font-bold mb-4 border border-red-400/30">
                    NEVER BE BLINDSIDED AGAIN
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                    AI Lyric Reviews Before You Approve
                  </h2>
                  <p className="text-lg text-blue-100 mb-6">
                    Don't have time to Google every song's lyrics? Our AI tells you exactly what a song is about—before your kid ever hears it.
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-white flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>Flags drugs, violence, profanity, sexual content</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-white flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>Plain-English summaries, not just "explicit" labels</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-white flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>Know exactly what you're approving</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Demo Video - See How Fast You Can Fix This */}
        <section className="py-12 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
                See How Fast You Can Lock This Down
              </h2>
              <p className="text-gray-500 text-center mb-8">
                Watch how quickly you can take control of your child's music
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

        {/* Testimonial */}
        <section className="py-12 bg-purple-600">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <div className="flex justify-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-xl text-white italic mb-4">
                "I walked in on my 11-year-old listening to WAP. I was horrified. That same night I set up SafeTunes. Now I approve every album before she can play it. She has 400+ songs she loves, and I finally have peace of mind."
              </p>
              <p className="text-purple-200 font-medium">— Jennifer M., Mom of 11 &amp; 13yo daughters</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Lock Down Their Music Library Tonight
              </h2>
              <p className="text-xl font-medium text-gray-700 mb-2">
                Setup takes 5 minutes. Free for 7 days. No credit card needed.
              </p>
              <p className="text-gray-500 mb-8">
                Join thousands of parents who sleep better knowing their kids' music is safe.
              </p>

              <Link
                to="/signup"
                className="btn-brand inline-block rounded-xl text-lg mb-6"
              >
                Start 7-Day Free Trial
              </Link>

              <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Works with Apple Music
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  $4.99/month after trial
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Cancel anytime
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ for SEO */}
        <section className="py-12 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
                Frequently Asked Questions
              </h2>

              <div className="space-y-4">
                <div className="bg-white rounded-xl p-5 shadow-sm">
                  <h3 className="font-bold text-gray-900 mb-2">Does Apple Music have parental controls?</h3>
                  <p className="text-gray-600 text-sm">Apple Music has basic parental controls through Screen Time that filter songs labeled "explicit". However, many inappropriate songs slip through because they're not labeled. Apple Music also can't hide album artwork or notify you of bad searches. SafeTunes gives you complete control by letting you approve every album.</p>
                </div>

                <div className="bg-white rounded-xl p-5 shadow-sm">
                  <h3 className="font-bold text-gray-900 mb-2">How do I block explicit songs on Apple Music?</h3>
                  <p className="text-gray-600 text-sm">Go to Settings &gt; Screen Time &gt; Content Restrictions &gt; Music to enable Apple's "Clean" filter. But this only blocks songs labeled "explicit" - many slip through. SafeTunes works differently: instead of blocking, you approve. Your child can only play albums you've specifically approved.</p>
                </div>

                <div className="bg-white rounded-xl p-5 shadow-sm">
                  <h3 className="font-bold text-gray-900 mb-2">Can I hide inappropriate album covers on Apple Music?</h3>
                  <p className="text-gray-600 text-sm">Apple Music doesn't offer any way to hide album artwork. SafeTunes is the only solution that lets you approve music while hiding covers you don't want your child to see. You toggle artwork visibility on a per-album basis.</p>
                </div>

                <div className="bg-white rounded-xl p-5 shadow-sm">
                  <h3 className="font-bold text-gray-900 mb-2">Why doesn't Apple Music's explicit filter work?</h3>
                  <p className="text-gray-600 text-sm">Apple Music's filter relies on record labels to mark songs as "explicit". Many songs with inappropriate themes, violent lyrics, or mature content aren't labeled. The filter also doesn't address provocative album artwork, which your child can still see.</p>
                </div>

                <div className="bg-white rounded-xl p-5 shadow-sm">
                  <h3 className="font-bold text-gray-900 mb-2">How do I know if my child searches for bad content on Apple Music?</h3>
                  <p className="text-gray-600 text-sm">Apple Music doesn't notify parents of searches. SafeTunes notifies you instantly when your child searches for content outside their approved library. You see exactly what they searched for, and the search is automatically blocked.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-gray-400 py-8">
          <div className="container mx-auto px-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm">&copy; 2025 SafeTunes. All rights reserved.</p>
              <div className="flex gap-6 text-sm">
                <Link to="/privacy" className="hover:text-white transition">Privacy</Link>
                <Link to="/terms" className="hover:text-white transition">Terms</Link>
                <Link to="/" className="hover:text-white transition">Home</Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

export default FoundBadMusicPage;
