import React from 'react';
import { Shield, CheckCircle } from 'lucide-react';

function ImprovedHero() {
  return (
    <section className="relative min-h-[60vh] md:min-h-[80vh] lg:min-h-screen flex items-center bg-gradient-to-br from-purple-600 via-purple-700 to-pink-600 overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -top-20 -left-20 w-40 sm:w-72 h-40 sm:h-72 bg-white rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -right-20 w-48 sm:w-96 h-48 sm:h-96 bg-pink-300 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-20 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Hero Copy */}
            <div className="text-white">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
                <Shield className="w-4 h-4" />
                <span className="text-sm font-semibold">
                  The Parental Control Layer Apple Music Forgot
                </span>
              </div>

              {/* Main Headline - 3 options to choose from */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                Real Music.<br />
                Real Protection.<br />
                <span className="text-pink-200">Zero Worry.</span>
              </h1>

              {/* Alternative Headlines (commented out) */}
              {/*
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                Finally Sleep at Night<br />
                Knowing What Your<br />
                <span className="text-pink-200">Kids Are Listening To</span>
              </h1>
              */}

              {/*
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                Let Them Listen to<br />
                <span className="text-pink-200">Real Artists</span><br />
                Without the Risk
              </h1>
              */}

              {/* Subheadline */}
              <p className="text-xl md:text-2xl text-purple-100 mb-8 leading-relaxed">
                Give your kids access to millions of songs on <strong>Apple Music</strong>—but only the ones <em>you</em> approve.
              </p>

              {/* Key Benefits */}
              <div className="space-y-3 mb-8">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-300 flex-shrink-0 mt-1" />
                  <p className="text-lg text-purple-50">
                    <strong>Bring Your Own Apple Music</strong> subscription—no extra streaming costs
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-300 flex-shrink-0 mt-1" />
                  <p className="text-lg text-purple-50">
                    Block explicit album art and monitor every search
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-300 flex-shrink-0 mt-1" />
                  <p className="text-lg text-purple-50">
                    No Kidz Bop covers—let them hear <em>real artists</em>
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-300 flex-shrink-0 mt-1" />
                  <p className="text-lg text-purple-50">
                    <strong>Approve entire albums or cherry-pick individual songs</strong>—you're in complete control
                  </p>
                </div>
              </div>

              {/* CTA Buttons - Mobile-optimized with min 48px height */}
              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="/signup"
                  className="btn-brand inline-block px-8 py-4 min-h-[48px] rounded-lg font-bold text-lg shadow-xl hover:shadow-2xl text-center flex items-center justify-center"
                >
                  Start Free 7-Day Trial
                </a>
                <a
                  href="#how-it-works"
                  className="inline-block bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 px-8 py-4 min-h-[48px] rounded-lg font-semibold text-lg hover:bg-white/20 transition text-center flex items-center justify-center"
                >
                  See How It Works
                </a>
              </div>

              {/* Trust Badge */}
              <p className="text-sm text-purple-200 mt-6">
                ✓ No credit card required  •  ✓ Cancel anytime  •  ✓ Works with your Apple Music subscription
              </p>
            </div>

            {/* Right: Hero Photo */}
            <div className="relative w-full flex items-center justify-center lg:justify-end">
              <div className="relative max-w-md lg:max-w-lg w-full">
                <div
                  className="relative overflow-hidden shadow-2xl bg-white/10"
                  style={{ borderRadius: '0 3rem 3rem 3rem' }}
                >
                  <img
                    src="https://images.pexels.com/photos/3756766/pexels-photo-3756766.jpeg?auto=compress&cs=tinysrgb&w=800"
                    alt="Kids listening to music with headphones"
                    className="w-full h-auto block"
                    style={{ minHeight: '300px', objectFit: 'cover' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="animate-bounce">
          <svg
            className="w-6 h-6 text-white opacity-75"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
          </svg>
        </div>
      </div>
    </section>
  );
}

export default ImprovedHero;
