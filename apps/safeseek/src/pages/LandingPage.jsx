import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Shield, Clock, Eye, Brain, Sparkles, CheckCircle2,
  ArrowRight, Users, Lock, Zap, BookOpen, AlertTriangle, X,
  ChevronDown, ChevronUp, Globe, Ban, Monitor, MessageCircle,
  Image, Fingerprint, Mic, Volume2, GraduationCap, Accessibility,
  RefreshCw, Moon, ImageIcon, Star, Quote
} from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: 'Every answer is safe. Period.',
    description: 'No links to click, no websites to wander into. Your child gets a direct, age-appropriate explanation — and nothing else. You never have to wonder what they saw.',
  },
  {
    icon: Mic,
    title: 'They ask questions out loud — like talking to a teacher',
    description: 'Your 5-year-old can\'t type "photosynthesis" — but they can say it. Voice search lets even the youngest kids explore their curiosity independently.',
  },
  {
    icon: Volume2,
    title: 'Answers read aloud for early readers',
    description: 'Kids who are still learning to read don\'t get left behind. SafeNet reads every answer out loud, so they can learn at their own pace without needing your help.',
  },
  {
    icon: GraduationCap,
    title: 'Answers they can actually understand',
    description: 'You set their grade level. A kindergartner gets simple words and short sentences. A 7th grader gets real depth. Every answer meets your child exactly where they are.',
  },
  {
    icon: Accessibility,
    title: 'Built for every kind of learner',
    description: 'Dyslexia-friendly fonts, ADHD-focused layouts, ESL-simplified language, high-contrast for low vision. Every child deserves to learn comfortably — not just the ones who fit the mold.',
  },
  {
    icon: Eye,
    title: 'See every question they ask',
    description: 'Full search history. Flagged queries highlighted. You\'ll know what your child is curious about — and you\'ll catch the questions that need a real conversation.',
  },
  {
    icon: RefreshCw,
    title: 'They learn at their own speed',
    description: '"Make it simpler," "More details," or "Tell me a story" — one tap changes how the answer is delivered. They stay curious instead of getting frustrated.',
  },
  {
    icon: Ban,
    title: 'You decide what\'s off-limits',
    description: 'Block topics you\'re not ready to discuss yet. If your child tries to search something blocked, they can request access — and you approve or deny from your phone.',
  },
  {
    icon: ImageIcon,
    title: 'Images without the danger',
    description: 'Real image results from Google, filtered through SafeSearch before your child sees anything. Visual diagrams for science, geography, and more — no surprises.',
  },
  {
    icon: BookOpen,
    title: 'Facts, not fiction',
    description: 'Every answer is grounded in Wikipedia and trusted educational sources. No AI hallucinations. No made-up information. Just real knowledge your child can trust.',
  },
  {
    icon: Moon,
    title: 'Easy on their eyes at night',
    description: 'Dark mode for evening homework sessions. Because learning doesn\'t stop at sundown, and neither should their comfort.',
  },
  {
    icon: Clock,
    title: 'Screen time you actually control',
    description: 'Set daily search limits and allowed hours. When time\'s up, it\'s up. No arguments, no negotiations — the app handles it for you.',
  },
];

const problems = [
  {
    icon: Globe,
    title: 'Google wasn\'t built for your child',
    description: 'One wrong query and they see things you can\'t unsee. Ads, algorithm rabbit holes, unfiltered results — and it only takes one click. The anxiety never goes away.',
  },
  {
    icon: Monitor,
    title: 'There\'s no safe place for them to search',
    description: 'They need to research for school, explore questions, feed their curiosity. But every search engine treats them like an adult. The result? You become their human Google — and that doesn\'t scale.',
  },
  {
    icon: AlertTriangle,
    title: 'You can\'t be their filter forever',
    description: 'You can\'t stand behind them every time they type a question. And the guilt of knowing something could slip through? That\'s the weight every parent carries. You need protection that works when you\'re not watching.',
  },
];

const comparisonRows = [
  { feature: 'Age-appropriate filtering', safenet: true, google: false, googleKids: 'Partial' },
  { feature: 'No ads', safenet: true, google: false, googleKids: false },
  { feature: 'Direct answers (no links)', safenet: true, google: false, googleKids: false },
  { feature: 'Parent search visibility', safenet: true, google: false, googleKids: false },
  { feature: 'Blocked topic controls', safenet: true, google: false, googleKids: 'Partial' },
  { feature: 'Daily time limits', safenet: true, google: false, googleKids: false },
  { feature: 'Per-kid profiles', safenet: true, google: false, googleKids: true },
  { feature: 'AI-powered answers', safenet: true, google: 'Partial', googleKids: false },
  { feature: 'Voice search', safenet: true, google: true, googleKids: false },
  { feature: 'Read aloud (text-to-speech)', safenet: true, google: false, googleKids: false },
  { feature: 'Accessibility adaptations', safenet: true, google: false, googleKids: false },
  { feature: 'Grade-level reading adjustment', safenet: true, google: false, googleKids: false },
];

const faqs = [
  {
    question: 'What ages is SafeNet designed for?',
    answer: 'SafeNet works for kids ages 4-16. The AI adjusts reading level and content depth based on each child\'s age. Younger kids get simpler explanations with basic vocabulary, while older kids get more detailed, nuanced answers. You set the age for each kid profile, and the AI does the rest.',
  },
  {
    question: 'Is it actually safe? How do you filter content?',
    answer: 'Every search query and every answer passes through multiple layers of AI filtering before your child sees anything. We block inappropriate topics, filter out harmful content, and adjust language to be age-appropriate. You also control which topic categories are allowed or blocked for each child. No system is 100% perfect, but SafeNet is built from the ground up for safety rather than having it bolted on as an afterthought.',
  },
  {
    question: 'Does it use AI? Will it make things up?',
    answer: 'Yes, SafeNet uses AI to generate direct, kid-friendly answers. But unlike chatbots, our answers are grounded in verified sources like Wikipedia and educational databases. We prioritize factual accuracy and clearly present information at an appropriate level. If the AI isn\'t confident in an answer, it says so rather than guessing.',
  },
  {
    question: 'Can my kid bypass SafeNet and use regular Google?',
    answer: 'SafeNet is a standalone search experience at its own URL. Your child uses SafeNet instead of Google. You can block Google and other search engines using Screen Time (Apple), Family Link (Google), or your router settings. SafeNet becomes their only way to search the internet.',
  },
  {
    question: 'Can my child talk to SafeNet?',
    answer: 'Yes! SafeNet includes voice search so kids can speak their questions instead of typing. This is especially helpful for younger children who are still learning to type, or anyone who prefers asking questions out loud. SafeNet can also read answers aloud using text-to-speech, making it a truly hands-free research experience.',
  },
  {
    question: 'Does it work for kids with learning differences?',
    answer: 'Absolutely. SafeNet includes built-in accessibility adaptations for dyslexia (OpenDyslexic font, increased spacing), ADHD (reduced distractions, focused layouts), ESL learners (simplified language), and low vision (larger text, high contrast). These can be enabled per kid profile so each child gets an experience tailored to how they learn best.',
  },
  {
    question: 'Can I set a specific reading level?',
    answer: 'Yes. Parents can set a specific grade level (K through 12) for each kid profile. SafeNet adjusts vocabulary, sentence complexity, and explanation depth to match. A kindergartner gets simple words and short sentences, while a 10th grader gets detailed, nuanced explanations. Kids can also tap "Make it simpler" or "More details" to adjust answers on the fly.',
  },
  {
    question: 'What about images? Can they search for images?',
    answer: 'Yes! SafeNet includes Google Images integration with SafeSearch filtering built in, so kids see real image results that are filtered for safety. Answers also include visual diagrams and flowcharts for concepts like the water cycle or how volcanoes work, making learning more visual and engaging.',
  },
  {
    question: 'How is this different from Google SafeSearch?',
    answer: 'Google SafeSearch is a basic filter that misses a lot. It still shows links to external websites, still has ads, and still lets kids click through to content you can\'t control. SafeNet is fundamentally different: kids never leave the app, never click external links, and every answer is generated specifically for their age level. Plus, you see every search they make.',
  },
];

const steps = [
  {
    number: '1',
    title: 'Set up in 2 minutes',
    description: 'Create a profile for each child. Pick their age, set blocked topics, choose their reading level. Done before your coffee gets cold.',
    icon: Shield,
  },
  {
    number: '2',
    title: 'Hand them the device',
    description: 'They type or speak any question. SafeNet filters every answer through your rules before they see a single word. No links to click, no danger to find.',
    icon: Search,
  },
  {
    number: '3',
    title: 'Check in when you want to',
    description: 'Every search is logged. Concerning queries are flagged. You see what they\'re curious about — and you\'ll know when it\'s time for a real conversation.',
    icon: Eye,
  },
];

const testimonials = [
  {
    quote: 'Before SafeNet, I was my daughter\'s personal search engine. She\'d ask me 20 questions a day and I\'d have to screen every result. Now she searches on her own and I actually get things done — without worrying about what she\'ll find.',
    name: 'Sarah M.',
    role: 'Mom of 2',
  },
  {
    quote: 'My son Googled something innocent for a school project and the results were horrifying. I took away his internet access for a month. With SafeNet, he got it back — and I finally stopped dreading homework time.',
    name: 'David R.',
    role: 'Dad of 3',
  },
  {
    quote: 'My daughter has ADHD and would melt down trying to read long Google results. SafeNet gives her answers at her level, reads them out loud, and she actually finishes her research now. She told me, "Mom, I like learning again." I cried.',
    name: 'Jennifer K.',
    role: 'Homeschool Mom',
  },
];

const primaryFeatures = features.slice(0, 4);
const secondaryFeatures = features.slice(4);

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
  const [openFaqs, setOpenFaqs] = useState(new Set([0, 1, 2]));

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
              <span className="text-xl font-bold text-[#1a1a2e]">SafeNet</span>
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
                The only search engine{' '}
                <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                  built for kids
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-gray-600 max-w-xl mx-auto lg:mx-0 mb-6 leading-relaxed">
                They explore freely. You sleep at night. SafeNet filters every answer before your child sees it — no links, no ads, no danger.
              </p>

              <div className="flex flex-col sm:flex-row flex-wrap justify-center lg:justify-start gap-2 sm:gap-x-6 text-sm text-gray-500 mb-8">
                <span className="flex items-center justify-center lg:justify-start gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  No ads, no tracking, no data selling
                </span>
                <span className="flex items-center justify-center lg:justify-start gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  They never leave the app
                </span>
                <span className="flex items-center justify-center lg:justify-start gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  You see every search they make
                </span>
                <span className="flex items-center justify-center lg:justify-start gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  COPPA compliant & encrypted
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-4">
                <Link
                  to="/signup"
                  className="w-full sm:w-auto bg-gradient-to-r from-[#F5A962] to-[#E88B6A] hover:from-[#f0a050] hover:to-[#e07d5a] text-white font-bold px-8 py-4 rounded-xl text-lg shadow-lg hover:shadow-xl transition-all inline-flex items-center justify-center gap-2"
                >
                  Start Free for 7 Days — $4.99/mo after
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
                <span>No credit card required</span>
                <span className="text-gray-300">|</span>
                <span>Cancel anytime</span>
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
                    src="https://images.pexels.com/photos/4145035/pexels-photo-4145035.jpeg?auto=compress&cs=tinysrgb&w=600&h=750&fit=crop"
                    alt="Child studying on tablet at desk"
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
              You want them to learn, explore, and ask questions. But every time they open a search engine, your stomach drops. Because you know what's out there.
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
                What if every search your child made was safe before they saw it?
              </h3>
            </div>
            <p className="text-blue-100 text-sm sm:text-base max-w-xl mx-auto">
              That's SafeNet. No external links. No ads. No algorithm deciding what your child sees. Just direct, age-appropriate answers — filtered through your rules.
            </p>
          </div>
        </div>
      </section>

      {/* ========== TESTIMONIALS ========== */}
      <section className="px-4 sm:px-6 py-16 sm:py-20 lg:py-24 bg-[#FDF8F3]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4 border border-green-100">
              <Users className="w-4 h-4" />
              Trusted by families
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1a1a2e] mb-4">
              "I finally stopped worrying."
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <Quote className="w-6 h-6 text-blue-200 mb-3" />
                <p className="text-gray-700 leading-relaxed mb-6 text-sm">
                  "{t.quote}"
                </p>
                <div className="border-t border-gray-100 pt-4">
                  <p className="font-semibold text-[#1a1a2e] text-sm">{t.name}</p>
                  <p className="text-gray-500 text-xs">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== HOW IT WORKS ========== */}
      <section id="how-it-works" className="px-4 sm:px-6 py-16 sm:py-20 lg:py-24 bg-[#FDF8F3]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1a1a2e] mb-4">Up and running before bedtime</h2>
            <p className="text-gray-600 text-lg max-w-xl mx-auto">
              No technical setup. No router changes. No IT degree required. Three steps and your kids are searching safely.
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
              You set the boundaries. They explore with freedom.
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Every feature exists to answer one question: "Is my child safe right now?" The answer is always yes.
            </p>
          </div>
          {/* Primary features - large hero cards */}
          <div className="grid sm:grid-cols-2 gap-6 mb-8">
            {primaryFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="bg-[#FDF8F3] rounded-2xl p-8 border border-gray-100 hover:shadow-lg hover:border-blue-200 transition-all group"
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mb-5 shadow-md">
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-[#1a1a2e] mb-3">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>

          {/* Secondary features - smaller row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {secondaryFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="bg-[#FDF8F3] rounded-xl p-4 border border-gray-100 hover:shadow-md hover:border-blue-100 transition-all group"
                >
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-100 transition">
                    <Icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-sm font-bold text-[#1a1a2e] mb-1">{feature.title}</h3>
                  <p className="text-gray-500 leading-relaxed text-xs">{feature.description}</p>
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
                <span className="text-white/90 text-sm font-medium">safenet.com/search</span>
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
                    <p className="text-sm font-semibold text-blue-800 mb-2">SafeNet Answer</p>
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
              How SafeNet compares
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
                      <span className="font-bold text-[#1a1a2e]">SafeNet</span>
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
                    <ComparisonCell value={row.safenet} />
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
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1a1a2e] mb-4">Less than a coffee per month</h2>
            <p className="text-gray-600 text-lg">$4.99 for total peace of mind. Cancel in 2 clicks, anytime. No questions asked.</p>
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
                <h3 className="text-lg font-bold text-[#1a1a2e] mb-1">SafeNet</h3>
                <p className="text-gray-500 text-sm mb-4">Total peace of mind for every search</p>
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
                Try 7 Days Free — No Credit Card
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
                  'SafeNet \u2014 Every search result filtered for their age',
                  'SafeTunes \u2014 They hear only music you\'ve approved',
                  'SafeTube \u2014 They watch only channels you\'ve approved',
                  'SafeReads \u2014 Know what\'s in a book before they read it',
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
                isOpen={openFaqs.has(i)}
                onToggle={() => {
                  setOpenFaqs((prev) => {
                    const next = new Set(prev);
                    if (next.has(i)) {
                      next.delete(i);
                    } else {
                      next.add(i);
                    }
                    return next;
                  });
                }}
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
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4 leading-tight">
            They're going to search the internet whether you like it or not.
          </h2>
          <p className="text-blue-100 text-xl mb-3 max-w-xl mx-auto font-medium">
            The question is: will they do it safely?
          </p>
          <p className="text-blue-200 text-base mb-8 max-w-lg mx-auto">
            You can't stand behind them forever. But you can give them a search engine that was built — from the ground up — to protect them. Built by a parent who needed this for his own kids.
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
          <p className="text-blue-200 text-sm mt-4">$4.99/mo after trial. No credit card to start. Cancel in 2 clicks.</p>

          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-white/80 mt-6">
            <span className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-white" />
              COPPA Compliant
            </span>
            <span className="text-white/40">|</span>
            <span>End-to-End Encrypted</span>
            <span className="text-white/40">|</span>
            <span>No Ads Ever</span>
            <span className="text-white/40">|</span>
            <span>We Never Sell Data</span>
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
              <span className="font-bold text-white">SafeNet</span>
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
