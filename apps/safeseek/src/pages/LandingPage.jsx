import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Shield, Clock, Eye, Brain, Sparkles, CheckCircle2,
  ArrowRight, Users, Lock, Zap, BookOpen, AlertTriangle, X,
  ChevronDown, ChevronUp, Globe, Ban, Monitor, MessageCircle,
  Image, Fingerprint, Mic, Volume2, GraduationCap, Accessibility,
  RefreshCw, Moon, ImageIcon
} from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Answers',
    description: 'No links, no browsing. Kids get direct, age-appropriate explanations written at their reading level.',
  },
  {
    icon: Mic,
    title: 'Voice Search',
    description: 'Kids can speak their questions out loud. Perfect for younger children who can\'t type yet or anyone who prefers talking.',
  },
  {
    icon: Volume2,
    title: 'Read Aloud',
    description: 'SafeSeek reads answers out loud with text-to-speech. Great for early readers and kids who learn better by listening.',
  },
  {
    icon: GraduationCap,
    title: 'Reading Level by Grade',
    description: 'Parents set K-12 reading levels per kid. Answers match their exact comprehension level, not just a rough age range.',
  },
  {
    icon: Accessibility,
    title: 'Accessibility Built In',
    description: 'Adaptations for dyslexia, ADHD, ESL learners, and low vision. Every child can use SafeSeek comfortably.',
  },
  {
    icon: Eye,
    title: 'Parent Dashboard',
    description: 'See every search your child makes. Flagged queries are highlighted so you can follow up on anything concerning.',
  },
  {
    icon: RefreshCw,
    title: 'Flexible Answer Styles',
    description: '"Make it simpler," "More details," or "Tell me a story" — kids can change how answers are delivered with one tap.',
  },
  {
    icon: Ban,
    title: 'Topic Controls & Requests',
    description: 'Block or allow topics per kid. Kids can request access to blocked topics, and parents approve or deny from the dashboard.',
  },
  {
    icon: ImageIcon,
    title: 'Safe Image Results',
    description: 'Google Images with SafeSearch built in. Real image results, filtered for kids. Visual diagrams for concepts like the water cycle.',
  },
  {
    icon: BookOpen,
    title: 'Wikipedia Integration',
    description: 'Answers are grounded in real facts from trusted sources. No hallucinations, no made-up information.',
  },
  {
    icon: Moon,
    title: 'Dark Mode',
    description: 'Easy on the eyes for nighttime research sessions. Kids can switch between light and dark themes.',
  },
  {
    icon: Clock,
    title: 'Time Limits',
    description: 'Set daily search caps and allowed hours. No more late-night research spirals.',
  },
];

const problems = [
  {
    icon: Globe,
    title: 'Google is too dangerous',
    description: 'The algorithm leads to inappropriate content within clicks. Ads everywhere. No age filtering. One wrong query and they\'re down a rabbit hole you can\'t undo.',
  },
  {
    icon: Monitor,
    title: 'YouTube Kids isn\'t a search engine',
    description: 'Kids need to research for school, explore questions, and learn. They need answers, not just videos. But there\'s no safe way to let them search.',
  },
  {
    icon: AlertTriangle,
    title: 'You can\'t monitor every search',
    description: 'You\'re not going to look over their shoulder 24/7. And even if you could, you\'d miss things. You need a system that filters before they see it.',
  },
];

const comparisonRows = [
  { feature: 'Age-appropriate filtering', safeseek: true, google: false, googleKids: 'Partial' },
  { feature: 'No ads', safeseek: true, google: false, googleKids: false },
  { feature: 'Direct answers (no links)', safeseek: true, google: false, googleKids: false },
  { feature: 'Parent search visibility', safeseek: true, google: false, googleKids: false },
  { feature: 'Blocked topic controls', safeseek: true, google: false, googleKids: 'Partial' },
  { feature: 'Daily time limits', safeseek: true, google: false, googleKids: false },
  { feature: 'Per-kid profiles', safeseek: true, google: false, googleKids: true },
  { feature: 'AI-powered answers', safeseek: true, google: 'Partial', googleKids: false },
  { feature: 'Voice search', safeseek: true, google: true, googleKids: false },
  { feature: 'Read aloud (text-to-speech)', safeseek: true, google: false, googleKids: false },
  { feature: 'Accessibility adaptations', safeseek: true, google: false, googleKids: false },
  { feature: 'Grade-level reading adjustment', safeseek: true, google: false, googleKids: false },
];

const faqs = [
  {
    question: 'What ages is SafeSeek designed for?',
    answer: 'SafeSeek works for kids ages 4-16. The AI adjusts reading level and content depth based on each child\'s age. Younger kids get simpler explanations with basic vocabulary, while older kids get more detailed, nuanced answers. You set the age for each kid profile, and the AI does the rest.',
  },
  {
    question: 'Is it actually safe? How do you filter content?',
    answer: 'Every search query and every answer passes through multiple layers of AI filtering before your child sees anything. We block inappropriate topics, filter out harmful content, and adjust language to be age-appropriate. You also control which topic categories are allowed or blocked for each child. No system is 100% perfect, but SafeSeek is built from the ground up for safety rather than having it bolted on as an afterthought.',
  },
  {
    question: 'Does it use AI? Will it make things up?',
    answer: 'Yes, SafeSeek uses AI to generate direct, kid-friendly answers. But unlike chatbots, our answers are grounded in verified sources like Wikipedia and educational databases. We prioritize factual accuracy and clearly present information at an appropriate level. If the AI isn\'t confident in an answer, it says so rather than guessing.',
  },
  {
    question: 'Can my kid bypass SafeSeek and use regular Google?',
    answer: 'SafeSeek is a standalone search experience at its own URL. Your child uses SafeSeek instead of Google. You can block Google and other search engines using Screen Time (Apple), Family Link (Google), or your router settings. SafeSeek becomes their only way to search the internet.',
  },
  {
    question: 'Can my child talk to SafeSeek?',
    answer: 'Yes! SafeSeek includes voice search so kids can speak their questions instead of typing. This is especially helpful for younger children who are still learning to type, or anyone who prefers asking questions out loud. SafeSeek can also read answers aloud using text-to-speech, making it a truly hands-free research experience.',
  },
  {
    question: 'Does it work for kids with learning differences?',
    answer: 'Absolutely. SafeSeek includes built-in accessibility adaptations for dyslexia (OpenDyslexic font, increased spacing), ADHD (reduced distractions, focused layouts), ESL learners (simplified language), and low vision (larger text, high contrast). These can be enabled per kid profile so each child gets an experience tailored to how they learn best.',
  },
  {
    question: 'Can I set a specific reading level?',
    answer: 'Yes. Parents can set a specific grade level (K through 12) for each kid profile. SafeSeek adjusts vocabulary, sentence complexity, and explanation depth to match. A kindergartner gets simple words and short sentences, while a 10th grader gets detailed, nuanced explanations. Kids can also tap "Make it simpler" or "More details" to adjust answers on the fly.',
  },
  {
    question: 'What about images? Can they search for images?',
    answer: 'Yes! SafeSeek includes Google Images integration with SafeSearch filtering built in, so kids see real image results that are filtered for safety. Answers also include visual diagrams and flowcharts for concepts like the water cycle or how volcanoes work, making learning more visual and engaging.',
  },
  {
    question: 'How is this different from Google SafeSearch?',
    answer: 'Google SafeSearch is a basic filter that misses a lot. It still shows links to external websites, still has ads, and still lets kids click through to content you can\'t control. SafeSeek is fundamentally different: kids never leave the app, never click external links, and every answer is generated specifically for their age level. Plus, you see every search they make.',
  },
];

const steps = [
  {
    number: '1',
    title: 'You set the rules',
    description: 'Age range, strictness level, blocked topics. Create a profile for each kid in under 2 minutes.',
    icon: Shield,
  },
  {
    number: '2',
    title: 'They search freely',
    description: 'Real questions, real answers. Just filtered through your settings. No links, no rabbit holes, no danger.',
    icon: Search,
  },
  {
    number: '3',
    title: 'You see everything',
    description: 'Search history, flagged queries, blocked attempts. Full transparency into what your kids are curious about.',
    icon: Eye,
  },
];

function FaqItem({ faq, isOpen, onToggle }) {
  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden transition-all hover:border-blue-200">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 sm:p-6 text-left bg-white hover:bg-gray-50 transition"
      >
        <span className="font-semibold text-brand-navy pr-4">{faq.question}</span>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-blue-500 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
        )}
      </button>
      {isOpen && (
        <div className="px-5 sm:px-6 pb-5 sm:pb-6 bg-white">
          <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
        </div>
      )}
    </div>
  );
}

function ComparisonCell({ value }) {
  if (value === true) {
    return (
      <td className="px-4 py-3 text-center">
        <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
      </td>
    );
  }
  if (value === false) {
    return (
      <td className="px-4 py-3 text-center">
        <X className="w-5 h-5 text-red-400 mx-auto" />
      </td>
    );
  }
  return (
    <td className="px-4 py-3 text-center">
      <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{value}</span>
    </td>
  );
}

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqs.map((faq) => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer,
        },
      })),
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(faqSchema);
    script.id = 'faq-schema';
    document.head.appendChild(script);

    return () => {
      const el = document.getElementById('faq-schema');
      if (el) el.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#FDF8F3]">
      {/* Sticky Header */}
      <header className="bg-[#FDF8F3]/95 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex justify-between items-center">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-md">
                <Search className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-[#1a1a2e]">SafeSeek</span>
            </Link>
            <div className="flex items-center gap-2 sm:gap-4">
              <a
                href="https://getsafefamily.com"
                className="hidden sm:block text-gray-400 hover:text-gray-600 font-medium text-sm"
              >
                Safe Family
              </a>
              <span className="hidden sm:block text-gray-300">|</span>
              <Link to="/login" className="text-gray-600 hover:text-gray-900 font-medium text-xs sm:text-sm">
                Parent Login
              </Link>
              <Link to="/search" className="text-gray-600 hover:text-gray-900 font-medium text-xs sm:text-sm hidden sm:block">
                Kid Search
              </Link>
              <Link
                to="/signup"
                className="bg-gradient-to-r from-[#F5A962] to-[#E88B6A] hover:from-[#f0a050] hover:to-[#e07d5a] text-white font-semibold px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm shadow-md hover:shadow-lg transition-all whitespace-nowrap"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ========== HERO ========== */}
      <section className="px-4 sm:px-6 pt-12 sm:pt-16 lg:pt-20 pb-16 sm:pb-20 lg:pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
            {/* Left: Text */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6 border border-blue-100">
                <Sparkles className="w-4 h-4" />
                AI-powered kid-safe search
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-[#1a1a2e] leading-tight mb-6">
                The search engine that actually{' '}
                <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                  keeps kids safe
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-gray-600 max-w-xl mx-auto lg:mx-0 mb-6 leading-relaxed">
                Your kids type or speak their questions. SafeSeek gives them age-appropriate answers — no links, no ads, no rabbit holes. You control the boundaries.
              </p>

              <div className="flex flex-col sm:flex-row flex-wrap justify-center lg:justify-start gap-2 sm:gap-x-6 text-sm text-gray-500 mb-8">
                <span className="flex items-center justify-center lg:justify-start gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Voice search & read aloud
                </span>
                <span className="flex items-center justify-center lg:justify-start gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Direct answers, no external links
                </span>
                <span className="flex items-center justify-center lg:justify-start gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  You see every search
                </span>
                <span className="flex items-center justify-center lg:justify-start gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Grade-level reading adjustment
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-4">
                <Link
                  to="/signup"
                  className="w-full sm:w-auto bg-gradient-to-r from-[#F5A962] to-[#E88B6A] hover:from-[#f0a050] hover:to-[#e07d5a] text-white font-bold px-8 py-4 rounded-xl text-lg shadow-lg hover:shadow-xl transition-all inline-flex items-center justify-center gap-2"
                >
                  Start 7-Day Free Trial
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  to="/search"
                  className="w-full sm:w-auto border-2 border-gray-200 hover:border-blue-300 text-[#1a1a2e] font-semibold px-8 py-4 rounded-xl text-lg transition-all inline-flex items-center justify-center gap-2 bg-white"
                >
                  <Search className="w-5 h-5" />
                  Try a Demo Search
                </Link>
              </div>

              <div className="flex items-center justify-center lg:justify-start gap-3 text-sm text-gray-500">
                <span className="font-semibold text-[#1a1a2e]">$4.99/mo</span>
                <span className="text-gray-300">|</span>
                <span>No credit card required</span>
              </div>
            </div>

            {/* Right: Hero Image */}
            <div className="flex-1 relative w-full flex items-center justify-center lg:justify-end">
              <div className="relative max-w-md lg:max-w-lg w-full">
                <div
                  className="relative aspect-[4/5] overflow-hidden shadow-2xl"
                  style={{ borderRadius: '0 3rem 3rem 3rem' }}
                >
                  <img
                    src="https://images.pexels.com/photos/4145153/pexels-photo-4145153.jpeg?auto=compress&cs=tinysrgb&w=600&h=750&fit=crop"
                    alt="Child using laptop safely"
                    className="w-full h-full object-cover"
                    loading="eager"
                  />
                </div>
                {/* Floating badge */}
                <div className="absolute -bottom-4 -left-4 sm:left-4 bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <Shield className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Every search</p>
                    <p className="text-sm font-bold text-[#1a1a2e]">AI-filtered first</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== PROBLEM SECTION ========== */}
      <section className="px-4 sm:px-6 py-16 sm:py-20 lg:py-24 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 bg-red-50 text-red-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4 border border-red-100">
              <AlertTriangle className="w-4 h-4" />
              Sound familiar?
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1a1a2e] mb-4">
              The internet wasn't built for kids
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Every parent knows the anxiety. You want your kids to learn and explore, but every search engine feels like a minefield.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 sm:gap-8 mb-12">
            {problems.map((problem) => {
              const Icon = problem.icon;
              return (
                <div
                  key={problem.title}
                  className="bg-red-50/50 rounded-2xl p-6 sm:p-8 border border-red-100/50"
                >
                  <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-red-500" />
                  </div>
                  <h3 className="text-lg font-bold text-[#1a1a2e] mb-2">{problem.title}</h3>
                  <p className="text-gray-600 leading-relaxed text-sm">{problem.description}</p>
                </div>
              );
            })}
          </div>

          {/* Solution callout */}
          <div className="bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl p-6 sm:p-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Search className="w-6 h-6 text-white" />
              <h3 className="text-xl sm:text-2xl font-bold text-white">
                SafeSeek: AI filters every answer before your kid sees it.
              </h3>
            </div>
            <p className="text-blue-100 text-sm sm:text-base max-w-xl mx-auto">
              No external links. No ads. No algorithm. Just direct, age-appropriate answers to their questions.
            </p>
          </div>
        </div>
      </section>

      {/* ========== HOW IT WORKS ========== */}
      <section id="how-it-works" className="px-4 sm:px-6 py-16 sm:py-20 lg:py-24 bg-[#FDF8F3]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1a1a2e] mb-4">How It Works</h2>
            <p className="text-gray-600 text-lg max-w-xl mx-auto">
              Set it up in under 2 minutes. Your kids search with confidence.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.number} className="text-center">
                  <div className="relative mx-auto mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-7 h-7 bg-gradient-to-r from-[#F5A962] to-[#E88B6A] rounded-full flex items-center justify-center text-white text-xs font-bold shadow">
                      {step.number}
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-[#1a1a2e] mb-2">{step.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{step.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========== FEATURES GRID ========== */}
      <section id="features" className="px-4 sm:px-6 py-16 sm:py-20 lg:py-24 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1a1a2e] mb-4">
              Everything parents need
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Voice search, read aloud, accessibility, grade-level answers, and full parent controls. You set the rules, AI does the work.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="bg-[#FDF8F3] rounded-2xl p-6 border border-gray-100 hover:shadow-md hover:border-blue-100 transition-all group"
                >
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-100 transition">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-[#1a1a2e] mb-2">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed text-sm">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========== LIVE DEMO / PREVIEW ========== */}
      <section id="demo" className="px-4 sm:px-6 py-16 sm:py-20 lg:py-24 bg-[#FDF8F3]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1a1a2e] mb-4">See it in action</h2>
            <p className="text-gray-600 text-lg max-w-xl mx-auto">
              Here's what happens when your kid types or asks "How do volcanoes erupt?" — then taps Read Aloud to hear the answer.
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            {/* Browser chrome */}
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 px-5 sm:px-6 py-4 flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 bg-white/30 rounded-full" />
                <div className="w-3 h-3 bg-white/30 rounded-full" />
                <div className="w-3 h-3 bg-white/30 rounded-full" />
              </div>
              <div className="flex-1 bg-white/20 rounded-lg px-4 py-1.5 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-white/70" />
                <span className="text-white/90 text-sm font-medium">safeseek.com/search</span>
              </div>
            </div>

            <div className="p-5 sm:p-8">
              {/* Search bar */}
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <div className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-12 py-4 text-gray-700 text-lg font-medium">
                  How do volcanoes erupt?
                </div>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center" title="Voice search">
                  <Mic className="w-4 h-4 text-blue-600" />
                </div>
              </div>

              {/* Age badge */}
              <div className="flex items-center gap-2 mb-4">
                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">
                  Age 8 - Grade 3 Level
                </span>
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Safe
                </span>
              </div>

              {/* AI answer card */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-blue-800 mb-2">SafeSeek Answer</p>
                    <p className="text-sm text-blue-700 leading-relaxed">
                      Volcanoes erupt when hot melted rock called <strong>magma</strong> rises up from deep inside the Earth.
                      Think of it like shaking a soda bottle — pressure builds up until it has to escape!
                      When the magma reaches the surface, it's called <strong>lava</strong>. Along with the lava,
                      volcanoes also release ash and gases into the air.
                    </p>
                  </div>
                </div>
              </div>

              {/* Answer controls */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <div className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer hover:bg-blue-200 transition">
                  <Volume2 className="w-3.5 h-3.5" />
                  Read Aloud
                </div>
                <div className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-medium">
                  Make it simpler
                </div>
                <div className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-medium">
                  More details
                </div>
                <div className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-medium">
                  Tell me a story
                </div>
              </div>

              {/* Source cards */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Sources</p>
                {[
                  { title: 'How Volcanoes Work', source: 'National Geographic Kids' },
                  { title: 'Volcano Facts for Children', source: 'Science Fun for Kids' },
                  { title: 'Why Do Volcanoes Erupt?', source: 'Britannica Kids' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                    <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">{item.title}</p>
                      <p className="text-xs text-gray-400">{item.source}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="text-center mt-8">
            <Link
              to="/search"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-[#F5A962] to-[#E88B6A] hover:from-[#f0a050] hover:to-[#e07d5a] text-white font-semibold px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all"
            >
              <Search className="w-4 h-4" />
              Try it yourself
            </Link>
          </div>
        </div>
      </section>

      {/* ========== COMPARISON TABLE ========== */}
      <section id="compare" className="px-4 sm:px-6 py-16 sm:py-20 lg:py-24 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1a1a2e] mb-4">
              How SafeSeek compares
            </h2>
            <p className="text-gray-600 text-lg max-w-xl mx-auto">
              There's nothing else like it. Here's why.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-4 text-left font-semibold text-[#1a1a2e] min-w-[180px]">Feature</th>
                  <th className="px-4 py-4 text-center min-w-[100px]">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                        <Search className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-bold text-[#1a1a2e]">SafeSeek</span>
                    </div>
                  </th>
                  <th className="px-4 py-4 text-center min-w-[100px]">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                        <Globe className="w-4 h-4 text-gray-500" />
                      </div>
                      <span className="font-semibold text-gray-600">Google</span>
                    </div>
                  </th>
                  <th className="px-4 py-4 text-center min-w-[120px]">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                        <Globe className="w-4 h-4 text-gray-500" />
                      </div>
                      <span className="font-semibold text-gray-600">Google Kids</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {comparisonRows.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    <td className="px-4 py-3 font-medium text-[#1a1a2e]">{row.feature}</td>
                    <ComparisonCell value={row.safeseek} />
                    <ComparisonCell value={row.google} />
                    <ComparisonCell value={row.googleKids} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ========== PRICING ========== */}
      <section id="pricing" className="px-4 sm:px-6 py-16 sm:py-20 lg:py-24 bg-[#FDF8F3]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1a1a2e] mb-4">Simple pricing</h2>
            <p className="text-gray-600 text-lg">One plan. Full protection. Cancel anytime.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Individual Plan */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-blue-200 shadow-lg relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow">
                  MOST POPULAR
                </span>
              </div>
              <div className="text-center mb-6 pt-2">
                <h3 className="text-lg font-bold text-[#1a1a2e] mb-1">SafeSeek</h3>
                <p className="text-gray-500 text-sm mb-4">Safe search for your family</p>
                <div>
                  <span className="text-5xl font-extrabold text-[#1a1a2e]">$4.99</span>
                  <span className="text-gray-500 text-lg">/month</span>
                </div>
              </div>

              <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold mb-5 w-full justify-center">
                <Zap className="w-3.5 h-3.5" />
                7-DAY FREE TRIAL - NO CREDIT CARD
              </div>

              <ul className="space-y-3 mb-6">
                {[
                  'Unlimited kid profiles',
                  'Unlimited searches',
                  'AI-filtered answers',
                  'Voice search & read aloud',
                  'Grade-level reading adjustment',
                  'Accessibility adaptations',
                  'Parent search dashboard',
                  'Blocked topic controls',
                  'Daily time limits',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-gray-700">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>

              <Link
                to="/signup"
                className="block w-full bg-gradient-to-r from-[#F5A962] to-[#E88B6A] hover:from-[#f0a050] hover:to-[#e07d5a] text-white font-bold py-3.5 rounded-xl text-center shadow-md hover:shadow-lg transition-all"
              >
                Start Free Trial
              </Link>
            </div>

            {/* Bundle Plan */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm">
              <div className="text-center mb-6">
                <h3 className="text-lg font-bold text-[#1a1a2e] mb-1">Safe Family Bundle</h3>
                <p className="text-gray-500 text-sm mb-4">All 4 apps, one price</p>
                <div>
                  <span className="text-5xl font-extrabold text-[#1a1a2e]">$9.99</span>
                  <span className="text-gray-500 text-lg">/month</span>
                </div>
                <p className="text-green-600 text-xs font-semibold mt-1">Save 50% vs. buying separately</p>
              </div>

              <ul className="space-y-3 mb-6">
                {[
                  'SafeSeek - Safe search',
                  'SafeTunes - Clean music',
                  'SafeTube - YouTube controls',
                  'SafeReads - Curated books',
                  'All features included',
                  'One family account',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-gray-700">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>

              <a
                href="https://getsafefamily.com/pricing"
                className="block w-full bg-[#1a1a2e] hover:bg-[#2a2a3e] text-white font-bold py-3.5 rounded-xl text-center shadow-md hover:shadow-lg transition-all"
              >
                View Bundle
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ========== FAQ ========== */}
      <section id="faq" className="px-4 sm:px-6 py-16 sm:py-20 lg:py-24 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1a1a2e] mb-4">
              Common questions
            </h2>
            <p className="text-gray-600 text-lg">
              Everything parents ask before signing up.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <FaqItem
                key={i}
                faq={faq}
                isOpen={openFaq === i}
                onToggle={() => setOpenFaq(openFaq === i ? null : i)}
              />
            ))}
          </div>

          <div className="text-center mt-8">
            <p className="text-gray-500 text-sm">
              Still have questions?{' '}
              <a href="mailto:jeremiah@getsafefamily.com" className="text-blue-600 hover:text-blue-700 font-medium">
                Email us anytime
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* ========== FINAL CTA BANNER ========== */}
      <section className="px-4 sm:px-6 py-16 sm:py-20 bg-gradient-to-r from-blue-600 to-cyan-500">
        <div className="max-w-3xl mx-auto text-center">
          <Lock className="w-10 h-10 text-white/80 mx-auto mb-4" />
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">
            Let them be curious. Safely.
          </h2>
          <p className="text-blue-100 text-lg mb-8 max-w-xl mx-auto">
            Built by parents, for parents. SafeSeek is part of the Safe Family suite of apps
            that keep kids safe online.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 bg-white text-blue-600 font-bold px-8 py-4 rounded-xl hover:bg-blue-50 transition shadow-lg text-lg"
            >
              Start 7-Day Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
          <p className="text-blue-200 text-sm mt-4">$4.99/mo after trial. No credit card to start. Cancel anytime.</p>

          <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-white/80 mt-6">
            <Shield className="w-4 h-4 text-white" />
            <span>COPPA Compliant</span>
            <span className="text-white/40">|</span>
            <span>No Data Selling</span>
            <span className="text-white/40">|</span>
            <span>Cancel Anytime</span>
          </div>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="px-4 sm:px-6 py-12 bg-[#1a1a2e] text-white/70">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <Search className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white">SafeSeek</span>
              <span className="text-white/40 text-sm ml-2">by Safe Family</span>
            </div>

            {/* Links */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
              <a href="https://getsafefamily.com/privacy" className="hover:text-white transition">Privacy</a>
              <a href="https://getsafefamily.com/terms" className="hover:text-white transition">Terms</a>
              <Link to="/login" className="hover:text-white transition">Parent Login</Link>
              <Link to="/search" className="hover:text-white transition">Kid Search</Link>
              <a href="https://getsafefamily.com" className="hover:text-white transition">Safe Family</a>
            </div>

            {/* Contact */}
            <div className="text-sm text-center md:text-right">
              <a href="mailto:jeremiah@getsafefamily.com" className="hover:text-white transition">
                jeremiah@getsafefamily.com
              </a>
            </div>
          </div>

          <div className="border-t border-white/10 mt-8 pt-6 text-center text-xs text-white/40">
            &copy; 2026 Safe Family. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
