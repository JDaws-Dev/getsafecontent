import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function ComparePage() {
  const [openFaq, setOpenFaq] = useState(null);

  // Add SEO meta tags
  useEffect(() => {
    // Update page title
    document.title = 'SafeTube vs YouTube Kids - The Best Alternative for Kids 8-14 | SafeTube';

    // Update meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.name = 'description';
      document.head.appendChild(metaDescription);
    }
    metaDescription.content = 'Compare SafeTube vs YouTube Kids. SafeTube is the perfect YouTube alternative for kids who\'ve outgrown YouTube Kids. Parent-approved content, no algorithm, works for ages 8-14.';

    // Add FAQ Schema markup for Google featured snippets
    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is the best YouTube Kids alternative for older kids?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "SafeTube is the best YouTube Kids alternative for kids ages 8-14. Unlike YouTube Kids which targets younger children, SafeTube lets parents approve real YouTube content while maintaining complete control. Kids get access to channels like Mark Rober and Dude Perfect that aren't on YouTube Kids."
          }
        },
        {
          "@type": "Question",
          "name": "Why is YouTube Kids not good for older kids?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "YouTube Kids is designed for children under 8. The content is too babyish for tweens and teens—lots of nursery rhymes and toddler content. Older kids want real YouTube creators, gaming content, and educational channels that aren't available on YouTube Kids. SafeTube bridges this gap by letting parents approve any YouTube content."
          }
        },
        {
          "@type": "Question",
          "name": "How does SafeTube compare to YouTube Kids?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "SafeTube uses a whitelist approach where parents approve specific channels, while YouTube Kids uses algorithm-based filtering. SafeTube has no recommendations or autoplay to unapproved content, gives parents complete visibility into watch history, and works for kids ages 8-14 who've outgrown YouTube Kids content."
          }
        },
        {
          "@type": "Question",
          "name": "Is SafeTube safer than YouTube Kids?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "SafeTube provides more parental control than YouTube Kids. With YouTube Kids, an algorithm decides what's appropriate and inappropriate content still slips through. With SafeTube, nothing plays unless a parent explicitly approved it—zero algorithmic recommendations, zero rabbit holes."
          }
        },
        {
          "@type": "Question",
          "name": "Can my 10-year-old use SafeTube?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes! SafeTube is specifically designed for kids ages 8-14 who've outgrown YouTube Kids. You can approve age-appropriate YouTube channels like science creators, gaming channels, sports content, and more. Each child gets their own profile with personalized approved content."
          }
        }
      ]
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(faqSchema);
    script.id = 'faq-schema-compare';
    document.head.appendChild(script);

    return () => {
      const existingScript = document.getElementById('faq-schema-compare');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  const comparisonData = [
    {
      feature: 'Target Age',
      safetube: '8-14 years old',
      youtubeKids: 'Under 8 years old',
      winner: 'depends',
      note: 'SafeTube is for kids who\'ve outgrown YouTube Kids'
    },
    {
      feature: 'Content Selection',
      safetube: 'Parent-approved whitelist',
      youtubeKids: 'Algorithm-filtered',
      winner: 'safetube',
      note: 'You decide what\'s appropriate, not an algorithm'
    },
    {
      feature: 'Available Content',
      safetube: 'All of YouTube (parent-approved)',
      youtubeKids: 'Limited kid-friendly library',
      winner: 'safetube',
      note: 'Access to real creators like Mark Rober, Dude Perfect'
    },
    {
      feature: 'Algorithm/Recommendations',
      safetube: 'None - only approved content shown',
      youtubeKids: 'Algorithm recommends videos',
      winner: 'safetube',
      note: 'No rabbit holes, no "up next" suggestions'
    },
    {
      feature: 'Inappropriate Content Risk',
      safetube: 'Zero (whitelist only)',
      youtubeKids: 'Low but content slips through',
      winner: 'safetube',
      note: 'Disturbing content has appeared on YouTube Kids'
    },
    {
      feature: 'Parental Visibility',
      safetube: 'Full watch history + blocked searches',
      youtubeKids: 'Limited activity reports',
      winner: 'safetube',
      note: 'See exactly what they watched and tried to search'
    },
    {
      feature: 'Time Limits',
      safetube: 'Built-in per-child limits',
      youtubeKids: 'Timer feature',
      winner: 'tie',
      note: 'Both offer time management'
    },
    {
      feature: 'Content Requests',
      safetube: 'Kids can request channels',
      youtubeKids: 'No request feature',
      winner: 'safetube',
      note: 'Easy way for kids to discover new content safely'
    },
    {
      feature: 'Multiple Profiles',
      safetube: 'Yes, with individual libraries',
      youtubeKids: 'Yes, with age settings',
      winner: 'tie',
      note: 'Both support multiple children'
    },
    {
      feature: 'Device Support',
      safetube: 'Any browser (web-based)',
      youtubeKids: 'iOS, Android, Smart TVs',
      winner: 'youtubekids',
      note: 'SafeTube works on any device with a browser'
    },
    {
      feature: 'Cost',
      safetube: '$4.99/month',
      youtubeKids: 'Free',
      winner: 'youtubekids',
      note: 'SafeTube offers 7-day free trial'
    },
    {
      feature: 'Ads',
      safetube: 'Standard YouTube ads',
      youtubeKids: 'Limited, family-friendly ads',
      winner: 'youtubekids',
      note: 'YouTube Premium removes ads on both'
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
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
              <Link to="/login" className="text-gray-600 hover:text-gray-900 font-medium text-xs sm:text-sm">
                Parent Login
              </Link>
              <Link
                to="/signup"
                className="btn-brand rounded-lg text-xs sm:text-sm whitespace-nowrap"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - "Graduated from YouTube Kids" */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-red-600 to-orange-500">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-full text-sm font-semibold mb-6 border border-white/30">
              <span className="text-xl">🎓</span>
              YouTube Kids Alternative
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Your Kids Have Graduated From YouTube Kids
            </h1>

            <p className="text-lg sm:text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              YouTube Kids is great for toddlers. But what about your 8, 10, or 12-year-old who wants real YouTube content? SafeTube lets them watch what they love—with you in control.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <Link
                to="/signup"
                className="w-full sm:w-auto bg-white hover:bg-gray-100 text-red-600 px-8 py-4 rounded-xl font-bold text-lg transition shadow-lg"
              >
                Try SafeTube Free for 7 Days
              </Link>
            </div>

            <p className="text-white/70 text-sm">
              No credit card required. Set up in 5 minutes.
            </p>
          </div>
        </div>
      </section>

      {/* Age Positioning - Who Is This For */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-4">
              The "In-Between" Problem
            </h2>
            <p className="text-xl text-gray-600 text-center mb-12 max-w-3xl mx-auto">
              Your kids are too old for YouTube Kids but you're not ready to give them unrestricted YouTube access.
            </p>

            <div className="grid md:grid-cols-3 gap-6">
              {/* YouTube Kids */}
              <div className="bg-red-50 rounded-2xl p-6 border-2 border-red-200 relative">
                <div className="absolute -top-3 left-6 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                  TOO YOUNG
                </div>
                <div className="pt-2">
                  <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">YouTube Kids</h3>
                  <p className="text-gray-600 mb-4">Best for ages 4-8</p>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-red-500">✗</span>
                      <span>Content is too babyish for tweens</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500">✗</span>
                      <span>Missing popular creators</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500">✗</span>
                      <span>Kids feel embarrassed</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* SafeTube - Just Right */}
              <div className="bg-green-50 rounded-2xl p-6 border-2 border-green-400 relative transform md:-translate-y-4 shadow-xl">
                <div className="absolute -top-3 left-6 bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                  JUST RIGHT
                </div>
                <div className="pt-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">SafeTube</h3>
                  <p className="text-green-700 font-semibold mb-4">Best for ages 8-14</p>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600">✓</span>
                      <span>Real YouTube content</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600">✓</span>
                      <span>Parent-approved only</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600">✓</span>
                      <span>No algorithm rabbit holes</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Regular YouTube */}
              <div className="bg-red-50 rounded-2xl p-6 border-2 border-red-200 relative">
                <div className="absolute -top-3 left-6 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                  TOO RISKY
                </div>
                <div className="pt-2">
                  <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Regular YouTube</h3>
                  <p className="text-gray-600 mb-4">No real parental controls</p>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-red-500">✗</span>
                      <span>Algorithm leads to bad content</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500">✗</span>
                      <span>Restricted mode is easily bypassed</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500">✗</span>
                      <span>Endless rabbit holes</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-4">
              SafeTube vs YouTube Kids
            </h2>
            <p className="text-xl text-gray-600 text-center mb-12">
              Side-by-side comparison of features
            </p>

            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left py-4 px-6 font-bold text-gray-700 w-1/4">Feature</th>
                    <th className="text-center py-4 px-4 w-5/16">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          </svg>
                        </div>
                        <span className="font-bold text-gray-900">SafeTube</span>
                      </div>
                    </th>
                    <th className="text-center py-4 px-4 w-5/16">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                          </svg>
                        </div>
                        <span className="font-bold text-gray-900">YouTube Kids</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="py-4 px-6 font-medium text-gray-900">{row.feature}</td>
                      <td className={`py-4 px-4 text-center text-sm ${row.winner === 'safetube' ? 'bg-green-50' : ''}`}>
                        <div className="flex flex-col items-center">
                          <span className={row.winner === 'safetube' ? 'font-semibold text-green-700' : 'text-gray-700'}>
                            {row.safetube}
                          </span>
                          {row.winner === 'safetube' && (
                            <span className="text-green-600 text-xs mt-1">✓ Better</span>
                          )}
                        </div>
                      </td>
                      <td className={`py-4 px-4 text-center text-sm ${row.winner === 'youtubekids' ? 'bg-green-50' : ''}`}>
                        <div className="flex flex-col items-center">
                          <span className={row.winner === 'youtubekids' ? 'font-semibold text-green-700' : 'text-gray-700'}>
                            {row.youtubeKids}
                          </span>
                          {row.winner === 'youtubekids' && (
                            <span className="text-green-600 text-xs mt-1">✓ Better</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {comparisonData.map((row, i) => (
                <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                  <h3 className="font-bold text-gray-900 mb-3">{row.feature}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`rounded-lg p-3 ${row.winner === 'safetube' ? 'bg-green-50 border-2 border-green-300' : 'bg-gray-50'}`}>
                      <p className="text-xs text-gray-500 mb-1">SafeTube</p>
                      <p className={`text-sm ${row.winner === 'safetube' ? 'font-semibold text-green-700' : 'text-gray-700'}`}>
                        {row.safetube}
                      </p>
                    </div>
                    <div className={`rounded-lg p-3 ${row.winner === 'youtubekids' ? 'bg-green-50 border-2 border-green-300' : 'bg-gray-50'}`}>
                      <p className="text-xs text-gray-500 mb-1">YouTube Kids</p>
                      <p className={`text-sm ${row.winner === 'youtubekids' ? 'font-semibold text-green-700' : 'text-gray-700'}`}>
                        {row.youtubeKids}
                      </p>
                    </div>
                  </div>
                  {row.note && (
                    <p className="text-xs text-gray-500 mt-2 italic">{row.note}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Key Difference: Whitelist vs Algorithm */}
      <section className="py-16 bg-gradient-to-br from-red-600 to-orange-500">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-center text-white mb-4">
              The Critical Difference
            </h2>
            <p className="text-xl text-white/90 text-center mb-12 max-w-3xl mx-auto">
              YouTube Kids uses an algorithm to filter content. SafeTube uses your judgment.
            </p>

            <div className="grid md:grid-cols-2 gap-8">
              {/* YouTube Kids Approach */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white">YouTube Kids Approach</h3>
                </div>
                <div className="space-y-4">
                  <div className="bg-white/10 rounded-lg p-4">
                    <p className="text-white/80 text-sm mb-2">How it works:</p>
                    <p className="text-white">Algorithm scans videos and decides what's "kid-friendly"</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-red-300 flex items-start gap-2 text-sm">
                      <span className="text-lg">⚠️</span>
                      <span>Disturbing "Elsagate" videos slipped through</span>
                    </p>
                    <p className="text-red-300 flex items-start gap-2 text-sm">
                      <span className="text-lg">⚠️</span>
                      <span>Algorithm recommends more of what kids click</span>
                    </p>
                    <p className="text-red-300 flex items-start gap-2 text-sm">
                      <span className="text-lg">⚠️</span>
                      <span>You don't know what they'll see next</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* SafeTube Approach */}
              <div className="bg-white rounded-2xl p-6 shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">SafeTube Approach</h3>
                </div>
                <div className="space-y-4">
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <p className="text-green-700 text-sm mb-2">How it works:</p>
                    <p className="text-gray-900 font-medium">You approve each channel. They can ONLY watch approved content.</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-green-700 flex items-start gap-2 text-sm">
                      <span className="text-lg">✓</span>
                      <span>Zero surprise content—ever</span>
                    </p>
                    <p className="text-green-700 flex items-start gap-2 text-sm">
                      <span className="text-lg">✓</span>
                      <span>No algorithm recommendations</span>
                    </p>
                    <p className="text-green-700 flex items-start gap-2 text-sm">
                      <span className="text-lg">✓</span>
                      <span>You know exactly what they can watch</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Real Content for Real Kids */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-4">
              Real Content for Real Kids
            </h2>
            <p className="text-xl text-gray-600 text-center mb-12 max-w-3xl mx-auto">
              YouTube Kids doesn't have the creators your 10-year-old actually wants to watch.
            </p>

            <div className="grid md:grid-cols-2 gap-8 mb-12">
              {/* Available on SafeTube */}
              <div className="bg-green-50 rounded-2xl p-6 border-2 border-green-200">
                <h3 className="text-lg font-bold text-green-800 mb-4 flex items-center gap-2">
                  <span className="text-2xl">✓</span>
                  Available on SafeTube
                </h3>
                <div className="space-y-3">
                  {[
                    { name: 'Mark Rober', desc: 'Engineering & science experiments', subs: '26M subs' },
                    { name: 'Dude Perfect', desc: 'Sports & trick shots', subs: '60M subs' },
                    { name: 'MrBeast', desc: 'Challenges & philanthropy', subs: '200M+ subs' },
                    { name: 'Veritasium', desc: 'Science education', subs: '14M subs' },
                    { name: 'Smarter Every Day', desc: 'Engineering curiosity', subs: '11M subs' },
                    { name: 'Game theory channels', desc: 'Gaming analysis your kids love', subs: 'Various' },
                  ].map((creator, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white rounded-lg p-3">
                      <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">
                        {creator.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{creator.name}</p>
                        <p className="text-gray-500 text-xs truncate">{creator.desc}</p>
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">{creator.subs}</span>
                    </div>
                  ))}
                </div>
                <p className="text-green-700 text-sm mt-4 font-medium">
                  + Any YouTube channel you want to approve
                </p>
              </div>

              {/* YouTube Kids Limitation */}
              <div className="bg-red-50 rounded-2xl p-6 border-2 border-red-200">
                <h3 className="text-lg font-bold text-red-800 mb-4 flex items-center gap-2">
                  <span className="text-2xl">✗</span>
                  YouTube Kids Is Limited To...
                </h3>
                <div className="space-y-3">
                  {[
                    { name: 'Cocomelon', desc: 'Nursery rhymes for toddlers' },
                    { name: 'Baby Shark', desc: 'Preschool songs' },
                    { name: 'Peppa Pig clips', desc: 'Cartoon episodes' },
                    { name: 'Ryan\'s World', desc: 'Toy reviews (controversial)' },
                    { name: 'Kids Diana Show', desc: 'Unboxing & play videos' },
                  ].map((creator, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white rounded-lg p-3">
                      <div className="w-10 h-10 bg-red-400 rounded-full flex items-center justify-center text-white font-bold">
                        {creator.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{creator.name}</p>
                        <p className="text-gray-500 text-xs truncate">{creator.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-red-700 text-sm mt-4 font-medium">
                  Content curated for ages 4-8 only
                </p>
              </div>
            </div>

            {/* Quote */}
            <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl p-6 border-2 border-red-200 max-w-3xl mx-auto">
              <p className="text-lg text-gray-800 italic text-center mb-4">
                "My 10-year-old was embarrassed to use YouTube Kids at a friend's house. Now with SafeTube, she watches Mark Rober and Veritasium—content I'm actually happy about."
              </p>
              <p className="text-center text-gray-600 font-medium">— Sarah M., Parent of 2</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-gray-100">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-8">
              Frequently Asked Questions
            </h2>

            <div className="space-y-3">
              {[
                {
                  id: 'age',
                  question: 'What age is SafeTube good for?',
                  answer: 'SafeTube is ideal for kids ages 8-14 who\'ve outgrown YouTube Kids but aren\'t ready for unrestricted YouTube. However, it works for any age—you control what\'s approved.'
                },
                {
                  id: 'switch',
                  question: 'Should I switch from YouTube Kids to SafeTube?',
                  answer: 'If your child complains YouTube Kids is "too babyish," wants to watch creators like Mark Rober or Dude Perfect, or is finding ways around YouTube Kids restrictions, SafeTube is the natural next step.'
                },
                {
                  id: 'algorithm',
                  question: 'Why is no algorithm better?',
                  answer: 'YouTube\'s algorithm is designed to maximize watch time, often leading kids down concerning rabbit holes. SafeTube shows ONLY what you\'ve approved—no recommendations, no "up next" to unapproved content.'
                },
                {
                  id: 'setup',
                  question: 'Is SafeTube hard to set up?',
                  answer: 'Most parents get started in 5 minutes. Search for channels your kids already watch, approve them with one tap. Your child logs in at getsafetube.com/play with a PIN.'
                },
                {
                  id: 'cost',
                  question: 'Why does SafeTube cost money when YouTube Kids is free?',
                  answer: 'YouTube Kids is free because Google shows ads and collects data. SafeTube gives you actual control over content—a whitelist approach that requires more infrastructure. The $4.99/month gives you peace of mind that\'s worth it.'
                },
                {
                  id: 'devices',
                  question: 'Does SafeTube work on tablets and iPads?',
                  answer: 'Yes! SafeTube works on any device with a web browser—iPads, Android tablets, Chromebooks, laptops, and phones. No app to download.'
                },
              ].map((faq) => (
                <div
                  key={faq.id}
                  className={`bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200 ${
                    openFaq === faq.id ? 'bg-gray-50' : ''
                  }`}
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left"
                  >
                    <h3 className="font-bold text-gray-900 pr-4">{faq.question}</h3>
                    <svg
                      className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform duration-200 ${
                        openFaq === faq.id ? 'rotate-180' : ''
                      }`}
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
                    <p className="px-5 text-gray-600">{faq.answer}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-gradient-to-br from-red-600 to-orange-500">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to Graduate From YouTube Kids?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Give your kids the content they want. Keep the control you need.
            </p>
            <Link
              to="/signup"
              className="inline-block bg-white hover:bg-gray-100 text-red-600 px-10 py-4 rounded-xl font-bold text-lg transition shadow-lg"
            >
              Start Your 7-Day Free Trial
            </Link>
            <p className="text-white/70 text-sm mt-4">
              No credit card required • Cancel anytime • Works on any device
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 text-gray-400 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-sm">
              <Link to="/" className="font-medium text-white/70 hover:text-white transition">
                Home
              </Link>
              <span className="text-white/30 hidden sm:inline">|</span>
              <Link to="/privacy" className="hover:text-white transition">Privacy</Link>
              <span className="text-white/30 hidden sm:inline">|</span>
              <Link to="/terms" className="hover:text-white transition">Terms</Link>
              <span className="text-white/30 hidden sm:inline">|</span>
              <Link to="/support" className="hover:text-white transition">Support</Link>
            </div>
            <div className="text-center">
              <p className="text-sm text-white/40">&copy; {new Date().getFullYear()} SafeTube. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
