import { Link } from 'react-router-dom';
import { useState } from 'react';
import ImprovedHero from '../components/landing/ImprovedHero';
import InteractiveFeaturePreview from '../components/landing/InteractiveFeaturePreview';
import ComparisonTable from '../components/landing/ComparisonTable';
import InstallationGuide from '../components/landing/InstallationGuide';
import StickyCTA from '../components/landing/StickyCTA';

function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Add smooth scrolling behavior
  const handleSmoothScroll = (e, targetId) => {
    e.preventDefault();
    const element = document.getElementById(targetId);
    if (element) {
      const offset = 80; // Account for sticky header
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      {/* Child Login Helper Banner */}
      <div className="bg-blue-600 text-white py-2 text-center text-sm">
        <span>Setting up your child's device? </span>
        <Link to="/play" className="font-semibold underline hover:text-blue-100">
          Go to Kid Login →
        </Link>
      </div>

      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-8">
              <Link to="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 sm:w-7 sm:h-7 text-white" fill="currentColor" viewBox="0 0 88.994 96.651">
                    <path d="M44.516,0v47.835c-.628.592-1.894-.232-2.774-.408-10.205-2.043-21.424,7.753-16.888,18.082,5.228,11.906,24.562,7.626,26.602-4.966.158-12.344.543-24.817.231-37.18-.01-.404-.181-.761-.194-1.16.138-.314.351-.336.66-.321.458.023,2.31.729,2.842.955,4.05,1.723,9.412,6.762,9.412,11.473v4.972c0,.135-.441.687-.1.894,1.809-2.076,3.087-4.729,3.459-7.48,1.916-14.144-14.809-18.642-16.24-30.063-.068-.546-.203-1.066.494-.894,11.509,2.848,22.868,6.412,34.333,9.432,1.504.879,2.371,2.06,2.527,3.837-.747,15.337,2.184,31.696-3.436,46.306-5.899,15.337-19.374,26.415-34.03,33-1.43.642-4.278,1.969-5.692,2.264-2.548.531-7.594-1.962-10.028-3.123C16.659,84.376,1.212,67.91.153,45.855c-.49-10.206.391-20.798,0-31.045.116-1.814,1.557-3.391,3.234-3.926L43.071.047l1.445-.047Z"/>
                  </svg>
                </div>
                <span className="text-xl sm:text-2xl font-bold text-gray-900">SafeTunes</span>
              </Link>

              {/* Desktop Navigation Links */}
              <nav className="hidden md:flex items-center space-x-6">
                <a
                  href="#how-it-works"
                  onClick={(e) => handleSmoothScroll(e, 'how-it-works')}
                  className="text-gray-700 hover:text-purple-600 font-medium transition cursor-pointer"
                >
                  How It Works
                </a>
                <a
                  href="#pricing"
                  onClick={(e) => handleSmoothScroll(e, 'pricing')}
                  className="text-gray-700 hover:text-purple-600 font-medium transition cursor-pointer"
                >
                  Pricing
                </a>
                <a
                  href="#faq"
                  onClick={(e) => handleSmoothScroll(e, 'faq')}
                  className="text-gray-700 hover:text-purple-600 font-medium transition cursor-pointer"
                >
                  FAQ
                </a>
                <a
                  href="#why"
                  onClick={(e) => handleSmoothScroll(e, 'why')}
                  className="text-gray-700 hover:text-purple-600 font-medium transition cursor-pointer"
                >
                  Why This Exists
                </a>
              </nav>
            </div>

            {/* Desktop Auth Buttons - Mobile-optimized with min 48px tap targets */}
            <div className="hidden sm:flex items-center space-x-4">
              <Link to="/login" className="text-gray-700 hover:text-gray-900 font-medium min-h-[48px] px-4 flex items-center">
                Login
              </Link>
              <Link
                to="/signup"
                className="btn-brand min-h-[48px] rounded-lg flex items-center"
              >
                Start 7-Day Free Trial
              </Link>
            </div>

            {/* Mobile Menu Button - Ensuring 48x48px minimum tap target */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden p-2 text-gray-700 hover:text-gray-900 min-w-[48px] min-h-[48px] flex items-center justify-center"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile Menu - Mobile-optimized with min 48px tap targets */}
          {mobileMenuOpen && (
            <div className="sm:hidden mt-4 pb-4 space-y-3 border-t border-gray-200 pt-4">
              <a
                href="#how-it-works"
                onClick={(e) => handleSmoothScroll(e, 'how-it-works')}
                className="block text-center text-gray-700 hover:text-purple-600 font-medium py-3 min-h-[48px] cursor-pointer flex items-center justify-center"
              >
                How It Works
              </a>
              <a
                href="#pricing"
                onClick={(e) => handleSmoothScroll(e, 'pricing')}
                className="block text-center text-gray-700 hover:text-purple-600 font-medium py-3 min-h-[48px] cursor-pointer flex items-center justify-center"
              >
                Pricing
              </a>
              <a
                href="#faq"
                onClick={(e) => handleSmoothScroll(e, 'faq')}
                className="block text-center text-gray-700 hover:text-purple-600 font-medium py-3 min-h-[48px] cursor-pointer flex items-center justify-center"
              >
                FAQ
              </a>
              <a
                href="#why"
                onClick={(e) => handleSmoothScroll(e, 'why')}
                className="block text-center text-gray-700 hover:text-purple-600 font-medium py-3 min-h-[48px] cursor-pointer flex items-center justify-center"
              >
                Why This Exists
              </a>
              <div className="border-t border-gray-200 pt-3 space-y-2">
                <Link
                  to="/login"
                  className="block text-center text-gray-700 hover:text-gray-900 font-medium py-3 min-h-[48px] flex items-center justify-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="btn-brand block text-center min-h-[48px] rounded-lg flex items-center justify-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Start 7-Day Free Trial
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section - New Conversion-Optimized Hero */}
      <ImprovedHero />

      {/* Quick Social Proof - Build trust immediately */}
      <section className="bg-gradient-to-br from-purple-50 to-pink-50 py-8">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-6 h-6 text-yellow-400 fill-current" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <p className="text-gray-700 text-lg italic mb-2">
              "Finally, peace of mind! My kids have safe access to real music, and I don't worry anymore."
            </p>
            <p className="text-sm text-gray-600">— Sarah M., Mom of 3</p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="container mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="max-w-6xl mx-auto">

          {/* The Realization - Enhanced emotional connection */}
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 sm:p-6 md:p-8 mb-8 max-w-4xl mx-auto">
            <div className="flex items-start gap-3 sm:gap-4">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-red-600 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-base sm:text-lg md:text-xl font-bold text-red-900 mb-3">You've tried the alternatives...</p>
                <ul className="space-y-2 sm:space-y-3 text-sm sm:text-base text-gray-700">
                  <li className="flex items-start">
                    <span className="mr-2 flex-shrink-0">✗</span>
                    <span><strong>Apple Music's "explicit" filter</strong> — Still lets through questionable content and inappropriate album covers</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 flex-shrink-0">✗</span>
                    <span><strong>Spotify Kids</strong> — Only Kidz Bop covers. Your 10-year-old wants real artists, not baby music</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Feature Preview - Tabbed "How It Works" */}
      <div id="how-it-works" className="scroll-mt-20">
        <InteractiveFeaturePreview />
      </div>

      {/* Comparison Table - Visual competitor comparison */}
      <ComparisonTable />

      {/* Installation Guide - Address "web app vs native app" confusion */}
      <InstallationGuide />

      {/* Main Content - Feature Showcases */}
      <section className="container mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="max-w-6xl mx-auto">

          {/* Album Artwork Feature - GAME CHANGER with Screenshot */}
          <div className="max-w-5xl mx-auto mb-12 px-4">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-4 border-green-400">
              <div className="grid md:grid-cols-2 gap-0">
                {/* Screenshot */}
                <div className="order-2 md:order-1 bg-gradient-to-br from-gray-100 to-gray-200 p-4 flex items-center justify-center">
                  <div className="relative w-full max-w-md">
                    <img
                      src="/screenshots/5_ADMIN_HIDE ALBUM.png"
                      alt="Hide album artwork feature - protect kids from inappropriate covers"
                      className="w-full h-auto rounded-lg shadow-2xl border-4 border-gray-800"
                    />
                    {/* Device Frame Indicator */}
                    <div className="absolute -top-2 -left-2 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                      📱 LIVE APP
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="order-1 md:order-2 p-6 sm:p-8 flex flex-col justify-center bg-gradient-to-br from-green-50 to-emerald-50">
                  <div className="inline-block bg-green-600 text-white px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide mb-4 self-start">
                    Game Changer Feature
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                    Hide Questionable Album Covers
                  </h3>
                  <p className="text-base sm:text-lg text-gray-700 mb-4">
                    Even "clean" albums can have provocative covers. SafeTunes gives you selective control—choose which albums show artwork and which don't. Approve the music, hide the cover if needed.
                  </p>
                  <ul className="space-y-3 text-sm sm:text-base text-gray-700">
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span><strong>Per-album control</strong> — Hide artwork for questionable covers, show for kid-friendly ones</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span><strong>Instant toggle</strong> — Kids see placeholder instead of album cover, music stays accessible</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span><strong>Per-child settings</strong> — Different kids, different ages, different artwork rules</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Kid Request System - Visual Showcase */}
          <div className="max-w-5xl mx-auto mb-12 px-4">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-4 border-blue-400">
              <div className="grid md:grid-cols-2 gap-0">
                {/* Content */}
                <div className="p-6 sm:p-8 flex flex-col justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
                  <div className="inline-block bg-blue-600 text-white px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide mb-4 self-start">
                    Smart Request System
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                    Kids Can Request, You Approve
                  </h3>
                  <p className="text-base sm:text-lg text-gray-700 mb-4">
                    Your child found an album they want? They can request it right from their device. You get notified and approve or deny with one tap.
                  </p>
                  <ul className="space-y-3 text-sm sm:text-base text-gray-700">
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>Kids can't browse freely—only request specific albums</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>You review every request before it becomes available</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>Great teaching moment—discuss why some music isn't appropriate</span>
                    </li>
                  </ul>
                </div>

                {/* Screenshot */}
                <div className="bg-gradient-to-br from-gray-100 to-gray-200 p-4 flex items-center justify-center">
                  <div className="relative w-full max-w-md">
                    <img
                      src="/screenshots/KID_REQUEST.png"
                      alt="Kid request interface - children can request albums for parent approval"
                      className="w-full h-auto rounded-lg shadow-2xl border-4 border-gray-800"
                    />
                    {/* Device Frame Indicator */}
                    <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                      📱 LIVE APP
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Blocked Search Notification - THE BIG ONE */}
          <div className="max-w-5xl mx-auto mb-12 px-4">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-4 border-red-400">
              <div className="grid md:grid-cols-2 gap-0">
                {/* Screenshot */}
                <div className="order-2 md:order-1 bg-gradient-to-br from-gray-100 to-gray-200 p-4 flex items-center justify-center">
                  <div className="relative w-full max-w-md">
                    <img
                      src="/screenshots/6-ADMIN_BLOCKED SEARCH.png"
                      alt="Parent notification when child searches for inappropriate content"
                      className="w-full h-auto rounded-lg shadow-2xl border-4 border-gray-800"
                    />
                    {/* Device Frame Indicator */}
                    <div className="absolute -top-2 -left-2 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                      🔔 PARENT ALERT
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="order-1 md:order-2 p-6 sm:p-8 flex flex-col justify-center bg-gradient-to-br from-red-50 to-orange-50">
                  <div className="inline-block bg-red-600 text-white px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide mb-4 self-start">
                    Protection That Matters
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                    Get Notified When Kids Search Inappropriate Content
                  </h3>
                  <p className="text-base sm:text-lg text-gray-700 mb-4">
                    If your child searches for explicit artists, albums, or songs, you get an instant notification. No judgment, no punishment—just an opportunity for a conversation.
                  </p>
                  <ul className="space-y-3 text-sm sm:text-base text-gray-700">
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span><strong>Instant parent notification</strong> — Know exactly what they searched for and when</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span><strong>Search gets blocked</strong> — They can't access the content, but they know you'll find out</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span><strong>Perfect teaching moment</strong> — Have the conversation when it matters most</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Kid Side: Blocked Content with Bible Verses */}
          <div className="max-w-5xl mx-auto mb-12 px-4">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-4 border-purple-500">
              <div className="grid md:grid-cols-2 gap-0">
                {/* Content */}
                <div className="p-6 sm:p-8 flex flex-col justify-center bg-gradient-to-br from-purple-50 to-indigo-50">
                  <div className="inline-block bg-purple-600 text-white px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide mb-4 self-start">
                    Positive Encouragement
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                    Kids See Encouragement, Not Shame
                  </h3>
                  <p className="text-base sm:text-lg text-gray-700 mb-4">
                    When a search is blocked, your child doesn't just see "No." They see encouraging messages about guarding their heart and mind, with wisdom from scripture—timeless principles about thinking on what is true, honorable, and pure.
                  </p>
                  <ul className="space-y-3 text-sm sm:text-base text-gray-700">
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-purple-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span><strong>Positive messages instead of shame</strong> — Encouragement to choose what's healthy</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-purple-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span><strong>Faith-based encouragement (optional setting)</strong> — Scripture for Christian families, universal wisdom for others</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-purple-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span><strong>Accountability without fear</strong> — They know you'll be notified, building honesty</span>
                    </li>
                  </ul>
                </div>

                {/* Screenshot */}
                <div className="bg-gradient-to-br from-gray-100 to-gray-200 p-4 flex items-center justify-center">
                  <div className="relative w-full max-w-md">
                    <img
                      src="/screenshots/KID_BAD CONTENT.png"
                      alt="Kid blocked search screen with encouraging Bible verses"
                      className="w-full h-auto rounded-lg shadow-2xl border-4 border-gray-800"
                    />
                    {/* Device Frame Indicator */}
                    <div className="absolute -top-2 -right-2 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                      📖 KID VIEW
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Massive CTA - Positioned after feature showcases */}
      <section className="container mx-auto px-4 sm:px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-10 border-2 border-purple-200">
            <div className="text-center">
              <Link
                to="/signup"
                className="btn-brand block sm:inline-block px-12 sm:px-20 py-6 rounded-2xl font-bold text-xl sm:text-2xl transition shadow-lg hover:shadow-2xl transform hover:scale-105"
              >
                Start 7-Day Free Trial
              </Link>
              <p className="text-gray-700 mt-6 text-base sm:text-lg">
                <strong>Only $4.99/month</strong> after trial • Less than a coffee • Cancel anytime
              </p>
              <p className="text-sm text-gray-500 mt-3">Set up in 5 minutes • Works on any device</p>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <p className="font-semibold text-green-900 text-base">7-Day Money-Back Guarantee</p>
                </div>
                <p className="text-green-800 text-sm">
                  Try it risk-free. If it doesn't give you peace of mind, get a full refund. No questions asked.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof - Enhanced testimonials */}
      <section className="bg-gradient-to-br from-purple-50 to-pink-50 py-8 sm:py-12">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-8">
              What Parents Are Saying
            </h2>

            <div className="bg-white rounded-2xl p-5 sm:p-6 border-2 border-purple-200 shadow-lg max-w-2xl mx-auto mb-6">
              <div className="flex gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-base text-gray-800 italic mb-3">
                "I approved 10 pop albums in 5 minutes. My daughter thinks I'm the coolest mom ever, and I actually sleep at night knowing what she's listening to."
              </p>
              <p className="font-semibold text-sm text-gray-900">— Sarah M., mom of 3</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-5 sm:p-6 border-2 border-purple-200 shadow-lg">
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-base text-gray-800 italic mb-3">
                  "I approved 15 full albums in 20 minutes. My 10-year-old has hundreds of songs to choose from. When she asks for more, I just approve the whole album if it's clean. So easy!"
                </p>
                <p className="font-semibold text-sm text-gray-900">— Rachel D., mom of 2</p>
              </div>

              <div className="bg-white rounded-2xl p-5 sm:p-6 border-2 border-purple-200 shadow-lg">
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-base text-gray-800 italic mb-3">
                  "Some albums have 2-3 inappropriate songs mixed in. I just approve the clean songs individually and skip the rest. My daughter still gets the Taylor Swift songs she loves, without the ones I don't want her hearing."
                </p>
                <p className="font-semibold text-sm text-gray-900">— Amanda L., mom of 1</p>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Pricing Section */}
      <section id="pricing" className="py-12 sm:py-16 md:py-20 bg-gray-50 scroll-mt-20">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-lg mx-auto">
            <div className="text-center mb-6 sm:mb-8">
              <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-800 px-3 py-1.5 rounded-full text-xs font-semibold mb-3">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 88.994 96.651">
                  <path d="M44.516,0v47.835c-.628.592-1.894-.232-2.774-.408-10.205-2.043-21.424,7.753-16.888,18.082,5.228,11.906,24.562,7.626,26.602-4.966.158-12.344.543-24.817.231-37.18-.01-.404-.181-.761-.194-1.16.138-.314.351-.336.66-.321.458.023,2.31.729,2.842.955,4.05,1.723,9.412,6.762,9.412,11.473v4.972c0,.135-.441.687-.1.894,1.809-2.076,3.087-4.729,3.459-7.48,1.916-14.144-14.809-18.642-16.24-30.063-.068-.546-.203-1.066.494-.894,11.509,2.848,22.868,6.412,34.333,9.432,1.504.879,2.371,2.06,2.527,3.837-.747,15.337,2.184,31.696-3.436,46.306-5.899,15.337-19.374,26.415-34.03,33-1.43.642-4.278,1.969-5.692,2.264-2.548.531-7.594-1.962-10.028-3.123C16.659,84.376,1.212,67.91.153,45.855c-.49-10.206.391-20.798,0-31.045.116-1.814,1.557-3.391,3.234-3.926L43.071.047l1.445-.047Z"/>
                </svg>
                Works with Apple Music
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Less Than a Coffee. The Value of Sleeping at Night.
              </h2>
              <p className="text-base sm:text-lg text-gray-600 px-2">
                Less than Netflix. Works with your existing Apple Music subscription. Total peace of mind.
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border-2 border-purple-600 overflow-hidden">
              <div className="p-6 sm:p-8">
                <div className="text-center mb-6">
                  <div className="flex items-center justify-center mb-2">
                    <span className="text-4xl sm:text-5xl font-bold text-gray-900">$4.99</span>
                    <span className="text-gray-600 ml-2 text-lg sm:text-xl">/month</span>
                  </div>
                  <p className="text-sm sm:text-base text-gray-600">or $49/year (save $11)</p>
                </div>

                <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm sm:text-base text-gray-700">Unlimited children</span>
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm sm:text-base text-gray-700">Unlimited approved albums</span>
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm sm:text-base text-gray-700">Manage from any device</span>
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm sm:text-base text-gray-700">7-day money-back guarantee</span>
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm sm:text-base text-gray-700">Cancel anytime</span>
                  </li>
                </ul>

                <Link
                  to="/signup"
                  className="btn-brand block w-full text-center rounded-lg text-base sm:text-lg"
                >
                  Start 7-Day Free Trial
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick FAQ - Enhanced with parent concerns */}
      <section id="faq" className="bg-white py-12 scroll-mt-20">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-900 mb-3">
              Questions Parents Ask
            </h2>
            <p className="text-center text-gray-600 mb-8 text-sm sm:text-base">
              We get it. You need answers before trusting something with your kids' ears.
            </p>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-1">
                  How does it actually work?
                </h3>
                <p className="text-gray-600 text-sm">
                  You search Apple Music and approve albums or individual songs—your choice. Want to approve Taylor Swift's entire 'Folklore' album? One tap. Want to cherry-pick only the 8 clean songs from an album? You can do that too. Your kids can only play exactly what you've approved—nothing else.
                </p>
              </div>

              <div className="bg-red-50 rounded-lg p-4 border-2 border-red-300">
                <h3 className="font-semibold text-red-900 mb-1">
                  🔔 What if my child tries to search for inappropriate content?
                </h3>
                <p className="text-red-800 text-sm">
                  You get an instant notification showing exactly what they searched for. The search is blocked automatically, and your child sees positive encouragement with timeless wisdom instead of shame. It creates the perfect opportunity for a loving conversation about guarding their heart and mind.
                </p>
              </div>

              <div className="bg-purple-50 rounded-lg p-4 border-2 border-purple-300">
                <h3 className="font-semibold text-purple-900 mb-1">
                  Can I hide album artwork?
                </h3>
                <p className="text-purple-800 text-sm">
                  YES! This is our most-loved feature. You have selective control—choose which albums show artwork and which don't. Perfect for albums with questionable covers while keeping kid-friendly artwork visible. Kids see a simple placeholder instead.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-1">
                  Can my kids request new music?
                </h3>
                <p className="text-gray-600 text-sm">
                  Yes! Kids can request albums from Apple Music. You get a notification on your phone and can approve or deny with one tap. It's a great teaching opportunity and keeps you connected to what they're interested in.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-1">
                  Do you offer tools to help me find appropriate music faster?
                </h3>
                <p className="text-gray-600 text-sm">
                  Yes! SafeTunes includes smart tools to help you build your library quickly. Get personalized music recommendations based on your child's age and preferences, or review song lyrics with AI-powered content analysis before approving. However, you always have final approval—these are just time-saving tools to help you make informed decisions.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-1">
                  What devices does SafeTunes work on?
                </h3>
                <p className="text-gray-600 text-sm">
                  SafeTunes works on any device with a web browser—iPhone, iPad, Android phones and tablets, Chromebooks, Windows PCs, and Macs. Parents manage everything from their phone or computer. Kids can play their approved music from any device. A native iOS app is coming in Q1 2026 for an even better experience.
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-300">
                <h3 className="font-semibold text-blue-900 mb-1">
                  Who is this for?
                </h3>
                <p className="text-blue-800 text-sm">
                  SafeTunes was built by a Christian parent, but it's for any family who cares about what their kids listen to. When content is blocked, kids see positive messages about making healthy choices and guarding their mind, along with scripture verses (Philippians 4:8, Psalm 101:3) about thinking on what is true, honorable, and pure. These timeless principles resonate with many families and help kids develop discernment about their content choices.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why I Created This - Condensed */}
      <section id="why" className="bg-gradient-to-br from-purple-50 to-pink-50 py-10 sm:py-12">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-6">
              Why I Built SafeTunes
            </h2>
            <div className="bg-white rounded-xl shadow-md p-6 sm:p-8 border-2 border-purple-200">
              <p className="text-base sm:text-lg text-gray-700 mb-5 leading-relaxed">
                I'm a teacher, uncle, and soon-to-be stepdad who cares deeply about the kids in my life.
              </p>
              <p className="text-base sm:text-lg text-gray-700 mb-5 leading-relaxed">
                Every day I see kids with incredible potential—my students, my nieces and nephews, and my future stepchildren.
                They're all navigating a world full of both beauty and noise.
              </p>
              <p className="text-base sm:text-lg text-gray-700 mb-5 leading-relaxed">
                Music shapes who kids become. But I couldn't find tools that actually worked.
                Apple Music's filters miss too much. Spotify Kids feels like a cage.
                I wanted something better—<strong>real music with real protection</strong>.
              </p>
              <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
                So I built SafeTunes. It's my way of protecting the kids I love.
                I hope it helps you do the same.
              </p>
              <div className="border-t border-gray-200 pt-4 mt-6">
                <p className="text-sm text-gray-600 italic">— Jeremiah, creator of SafeTunes</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* iOS App Coming Soon */}
      <section className="bg-white py-8 sm:py-10 border-t border-gray-200">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mx-auto">
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <svg className="w-8 h-8 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base sm:text-lg mb-2">Native iOS App Coming Q1 2026</h3>
                  <p className="text-sm sm:text-base text-gray-700">
                    SafeTunes works perfectly in any browser right now—iPhone, iPad, Chromebook, Android, you name it.
                    We're building a native iOS app for an even better experience, launching early 2026.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-12 sm:py-16 md:py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4 sm:mb-6 px-2">
              Ready to Finally Sleep at Night?
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-6 sm:mb-8 px-2">
              Give your kids the music they love. Keep your peace of mind. It's that simple.
            </p>
            <div className="space-y-3 sm:space-y-4 mb-6">
              <div className="flex items-center justify-center space-x-2 text-sm sm:text-base text-gray-700">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Approve albums—kids play any songs from them</span>
              </div>
              <div className="flex items-center justify-center space-x-2 text-sm sm:text-base text-gray-700">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Selective artwork control per album</span>
              </div>
              <div className="flex items-center justify-center space-x-2 text-sm sm:text-base text-gray-700">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>5-minute setup, works on any device</span>
              </div>
            </div>
            <Link
              to="/signup"
              className="btn-brand inline-block rounded-lg text-base sm:text-lg mb-4 w-full sm:w-auto text-center"
            >
              Start 7-Day Free Trial
            </Link>
            <p className="text-xs sm:text-sm text-gray-500 mt-4 px-2">
              Only $4.99/month after trial • Works with your existing Apple Music subscription
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 sm:py-12">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-8">
            <div>
              <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Product</h4>
              <ul className="space-y-1.5 sm:space-y-2 text-gray-400 text-xs sm:text-sm">
                <li><a href="#pricing" className="hover:text-white transition">Pricing</a></li>
                <li><a href="#faq" className="hover:text-white transition">FAQ</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition">How It Works</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Safe Family</h4>
              <ul className="space-y-1.5 sm:space-y-2 text-gray-400 text-xs sm:text-sm">
                <li>
                  <a href="https://getsafetube.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                    SafeTube
                  </a>
                </li>
                <li>
                  <a href="https://getsafereads.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                    SafeReads
                  </a>
                </li>
                <li>
                  <a href="https://getsafefamily.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                    Get All 3 Apps
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Contact</h4>
              <ul className="space-y-1.5 sm:space-y-2 text-gray-400 text-xs sm:text-sm">
                <li>
                  <a href="mailto:jeremiah@getsafefamily.com" className="hover:text-white transition">
                    jeremiah@getsafefamily.com
                  </a>
                </li>
              </ul>
            </div>
            <div className="col-span-1 sm:col-span-2 md:col-span-1">
              <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">SafeTunes</h4>
              <p className="text-gray-400 text-xs sm:text-sm">
                Built by a teacher, uncle, and soon-to-be stepdad who wanted better for the kids in his life.
              </p>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 sm:pt-8 text-center text-gray-400 text-xs sm:text-sm">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
              <Link to="/privacy" className="hover:text-white transition">Privacy Policy</Link>
              <span className="hidden sm:inline">•</span>
              <Link to="/terms" className="hover:text-white transition">Terms of Service</Link>
            </div>
            <p>&copy; 2026 SafeTunes. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Sticky Mobile CTA - Appears after scroll */}
      <StickyCTA />
    </div>
  );
}

export default LandingPage;
