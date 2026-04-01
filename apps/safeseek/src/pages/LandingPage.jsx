import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Shield, Clock, Eye, Brain, Sparkles, CheckCircle2,
  ArrowRight, Users, Lock, Zap, BookOpen, AlertTriangle, X,
  ChevronDown, ChevronUp, Globe, Ban, Monitor, MessageCircle,
  Image, Fingerprint, Mic, Volume2, GraduationCap, Accessibility,
  RefreshCw, Moon, ImageIcon, MessageSquare, Library,
  MousePointerClick, Send
} from 'lucide-react';

const features = [
  {
    icon: MessageSquare,
    title: 'A built-in tutor that actually teaches',
    description: 'Not a chatbot. A real built-in tutor that uses the Socratic method — asking questions back, guiding your child to the answer, and celebrating when they get it. Back-and-forth conversations that feel like having a patient teacher in the room.',
  },
  {
    icon: Brain,
    title: 'Every answer is safe. Period.',
    description: 'No links to click, no websites to wander into. Your child gets a direct, age-appropriate explanation — and nothing else. You never have to wonder what they saw.',
  },
  {
    icon: Library,
    title: 'Real research from real sources',
    description: 'Research Mode pulls articles from NASA, National Geographic, Britannica, PBS, Khan Academy, and more — then rewrites them at your child\'s reading level. Branded source cards show where every fact came from. No external links.',
  },
  {
    icon: Mic,
    title: 'They ask questions out loud — like talking to a teacher',
    description: 'Your 5-year-old can\'t type "photosynthesis" — but they can say it. Voice search lets even the youngest kids explore their curiosity independently.',
  },
  {
    icon: Volume2,
    title: 'Answers read aloud for early readers',
    description: 'Kids who are still learning to read don\'t get left behind. SafeStudy reads every answer out loud, so they can learn at their own pace without needing your help.',
  },
  {
    icon: GraduationCap,
    title: 'Answers they can actually understand',
    description: 'You set their grade level (K-12). A kindergartner gets simple words and short sentences. A 7th grader gets real depth. Every answer meets your child exactly where they are.',
  },
  {
    icon: Accessibility,
    title: 'Built for every kind of learner',
    description: 'Dyslexia-friendly fonts, ADHD-focused layouts, ESL-simplified language, high-contrast for low vision. Every child deserves to learn comfortably — not just the ones who fit the mold.',
  },
  {
    icon: Eye,
    title: 'See every question they ask',
    description: 'Full search history and tutor conversations. Flagged queries highlighted. You\'ll know what your child is curious about — and you\'ll catch the questions that need a real conversation.',
  },
  {
    icon: MousePointerClick,
    title: 'Clickable deep dives',
    description: 'Every section in a search result is clickable. Tap to learn more, "Read more" expands inline. They follow their curiosity without ever leaving the safe environment.',
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
    title: 'There\'s no safe place for them to search or get help',
    description: 'They need to research for school, explore questions, get homework help. But every search engine and AI chatbot treats them like an adult. The result? You become their human Google and personal tutor — and that doesn\'t scale.',
  },
  {
    icon: AlertTriangle,
    title: 'You can\'t be their filter forever',
    description: 'You can\'t stand behind them every time they type a question or ask ChatGPT for help. And the guilt of knowing something could slip through? That\'s the weight every parent carries. You need protection that works when you\'re not watching.',
  },
];

const comparisonRows = [
  { feature: 'Built-in Tutor (Socratic method)', safestudy: true, google: false, googleKids: false },
  { feature: 'Age-appropriate filtering', safestudy: true, google: false, googleKids: 'Partial' },
  { feature: 'No ads', safestudy: true, google: false, googleKids: false },
  { feature: 'Direct answers (no links)', safestudy: true, google: false, googleKids: false },
  { feature: 'Research from trusted sources', safestudy: true, google: false, googleKids: false },
  { feature: 'Parent search visibility', safestudy: true, google: false, googleKids: false },
  { feature: 'Blocked topic controls', safestudy: true, google: false, googleKids: 'Partial' },
  { feature: 'Topic request system', safestudy: true, google: false, googleKids: false },
  { feature: 'Daily time limits', safestudy: true, google: false, googleKids: false },
  { feature: 'Per-kid profiles', safestudy: true, google: false, googleKids: true },
  { feature: 'AI-powered answers', safestudy: true, google: 'Partial', googleKids: false },
  { feature: 'Voice search', safestudy: true, google: true, googleKids: false },
  { feature: 'Read aloud (text-to-speech)', safestudy: true, google: false, googleKids: false },
  { feature: 'Accessibility adaptations', safestudy: true, google: false, googleKids: false },
  { feature: 'Grade-level reading (K-12)', safestudy: true, google: false, googleKids: false },
  { feature: 'Clickable deep dives', safestudy: true, google: false, googleKids: false },
  { feature: 'Dark mode', safestudy: true, google: true, googleKids: false },
];

const faqs = [
  {
    question: 'What ages is SafeStudy designed for?',
    answer: 'SafeStudy works for kids ages 4-16. The AI adjusts reading level and content depth based on each child\'s grade level (K-12). Younger kids get simpler explanations with basic vocabulary, while older kids get more detailed, nuanced answers. The Built-in Tutor adapts its teaching style to match — guiding a 6-year-old differently than a 14-year-old.',
  },
  {
    question: 'How does the Built-in Tutor work?',
    answer: 'Tutor Mode is like having a patient, encouraging teacher available 24/7. Your child types a question — like "I don\'t understand fractions" — and the tutor teaches the concept, shows an example, then asks a follow-up question to check understanding. It uses the Socratic method: guiding kids toward the answer rather than just handing it to them. It celebrates their wins, explains things a different way when they\'re confused, and keeps conversations short and focused. Every tutor session is saved so you can see what they\'re working on.',
  },
  {
    question: 'What is Research Mode?',
    answer: 'Research Mode pulls real articles from trusted educational sources — NASA, National Geographic, Britannica, PBS, Khan Academy, Smithsonian, and more. It then rewrites those articles at your child\'s reading level. Each result shows a branded source card so your child learns where real information comes from. No external links are ever shown — everything stays inside SafeStudy.',
  },
  {
    question: 'Is it actually safe? How do you filter content?',
    answer: 'Every search query and every answer passes through multiple layers of AI filtering before your child sees anything. We block inappropriate topics, filter out harmful content, and adjust language to be age-appropriate. You also control which topic categories are allowed or blocked for each child. If your child searches a blocked topic, they can send you a request to unlock it — and you approve or deny. No system is 100% perfect, but SafeStudy is built from the ground up for safety rather than having it bolted on as an afterthought.',
  },
  {
    question: 'Does it use AI? Will it make things up?',
    answer: 'Yes, SafeStudy uses AI for search answers, tutoring, and research. Search answers are grounded in verified sources like Wikipedia and educational databases. Research Mode pulls directly from trusted sites and rewrites for your child\'s level. The Tutor uses the Socratic method and sticks to established knowledge. We prioritize factual accuracy across all modes.',
  },
  {
    question: 'Can my kid bypass SafeStudy and use regular Google?',
    answer: 'SafeStudy is a standalone search experience at its own URL. Your child uses SafeStudy instead of Google. You can block Google and other search engines using Screen Time (Apple), Family Link (Google), or your router settings. SafeStudy becomes their only way to search the internet.',
  },
  {
    question: 'Can my child talk to SafeStudy?',
    answer: 'Yes! SafeStudy includes voice search so kids can speak their questions instead of typing. This is especially helpful for younger children who are still learning to type. SafeStudy can also read answers aloud using text-to-speech. And with Tutor Mode, they can have real back-and-forth conversations about any school subject.',
  },
  {
    question: 'Does it work for kids with learning differences?',
    answer: 'Absolutely. SafeStudy includes built-in accessibility adaptations for dyslexia (OpenDyslexic font, increased spacing), ADHD (reduced distractions, focused layouts), ESL learners (simplified language), and low vision (larger text, high contrast). These can be enabled per kid profile. The Built-in Tutor also adapts — using shorter sentences for dyslexia, getting to the point faster for ADHD, and defining terms for ESL learners.',
  },
  {
    question: 'Can I set a specific reading level?',
    answer: 'Yes. Parents can set a specific grade level (K through 12) for each kid profile. SafeStudy adjusts vocabulary, sentence complexity, and explanation depth to match across search, tutor, and research modes. A kindergartner gets simple words and short sentences, while a 10th grader gets detailed, nuanced explanations.',
  },
  {
    question: 'What about images? Can they search for images?',
    answer: 'Yes! SafeStudy includes Google Images integration with SafeSearch filtering built in, so kids see real image results that are filtered for safety. Answers also include visual diagrams and flowcharts for concepts like the water cycle or how volcanoes work.',
  },
  {
    question: 'How is this different from Google SafeSearch or ChatGPT?',
    answer: 'Google SafeSearch is a basic filter that misses a lot — it still shows links, ads, and lets kids click to uncontrolled content. ChatGPT has no parental controls, no age filtering, and no topic blocking. SafeStudy is fundamentally different: kids never leave the app, every answer is generated for their age level, you control what topics are allowed, the tutor teaches rather than just answering, and you see every search and conversation they have.',
  },
];

const steps = [
  {
    number: '1',
    title: 'Set up in 2 minutes',
    description: 'Create a profile for each child. Pick their grade level, set blocked topics, enable accessibility options. Done before your coffee gets cold.',
    icon: Shield,
  },
  {
    number: '2',
    title: 'They search, learn, and explore',
    description: 'They type or speak any question. Search for answers. Ask the tutor for help. Dive into research articles from NASA and National Geographic. All within the boundaries you set.',
    icon: Search,
  },
  {
    number: '3',
    title: 'Check in when you want to',
    description: 'Every search and tutor conversation is logged. Concerning queries are flagged. Topic requests come to you for approval. You see everything — without hovering.',
    icon: Eye,
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
      <div className={`overflow-hidden transition-all duration-200 bg-white ${isOpen ? 'max-h-96 pb-5 sm:pb-6' : 'max-h-0'}`}>
        <p className="px-5 sm:px-6 text-gray-600 leading-relaxed">{faq.answer}</p>
      </div>
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
              <span className="text-xl font-bold text-[#1a1a2e]">SafeStudy</span>
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
                Safe search + built-in tutor + research tool
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-[#1a1a2e] leading-tight mb-6">
                The search engine{' '}
                <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                  with a tutor inside
                </span>{' '}
                — made for kids
              </h1>

              <p className="text-lg sm:text-xl text-gray-600 max-w-xl mx-auto lg:mx-0 mb-6 leading-relaxed">
                They search safely, get homework help from a built-in tutor, and research with trusted educational sources — all within the boundaries you set. You see everything.
              </p>

              <div className="flex flex-col sm:flex-row flex-wrap justify-center lg:justify-start gap-2 sm:gap-x-6 text-sm text-gray-500 mb-8">
                <span className="flex items-center justify-center lg:justify-start gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Built-in Tutor with Socratic method
                </span>
                <span className="flex items-center justify-center lg:justify-start gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Research from trusted sources
                </span>
                <span className="flex items-center justify-center lg:justify-start gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  No ads, no links, no danger
                </span>
                <span className="flex items-center justify-center lg:justify-start gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Full parent visibility
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
                <a
                  href="#demo"
                  className="w-full sm:w-auto border-2 border-gray-200 hover:border-blue-300 text-[#1a1a2e] font-semibold px-8 py-4 rounded-xl text-lg transition-all inline-flex items-center justify-center gap-2 bg-white"
                >
                  <Search className="w-5 h-5" />
                  See It in Action
                </a>
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
                {/* Floating badge - tutor */}
                <div className="absolute -bottom-4 -left-4 sm:left-4 bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Built-in Tutor</p>
                    <p className="text-sm font-bold text-[#1a1a2e]">Homework help 24/7</p>
                  </div>
                </div>
                {/* Floating badge - safe */}
                <div className="absolute -top-4 -right-4 sm:right-4 bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <Shield className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Every search</p>
                    <p className="text-sm font-bold text-[#1a1a2e]">Parent-approved content</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== THREE MODES SECTION ========== */}
      <section className="px-4 sm:px-6 py-16 sm:py-20 lg:py-24 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4 border border-purple-100">
              <Sparkles className="w-4 h-4" />
              Three powerful modes
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1a1a2e] mb-4">
              More than a search engine
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              SafeStudy is a safe search engine, built-in tutor, and research tool — all in one. Each mode is built from the ground up for kids.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            {/* Search Mode */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 sm:p-8 border border-blue-100">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mb-5 shadow-md">
                <Search className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-[#1a1a2e] mb-2">Search Mode</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Type or speak any question. Get a direct, age-appropriate answer with no links, no ads, and no danger. Tap any section to deep dive further.
              </p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" /> Voice search & read aloud</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" /> Google Images with SafeSearch</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" /> Clickable deep dives</li>
              </ul>
            </div>

            {/* Tutor Mode */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 sm:p-8 border border-purple-200 relative overflow-hidden">
              <div className="absolute top-3 right-3">
                <span className="bg-gradient-to-r from-purple-600 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                  NEW
                </span>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-5 shadow-md">
                <MessageSquare className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-[#1a1a2e] mb-2">Tutor Mode</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                A patient built-in tutor that uses the Socratic method. Real back-and-forth conversations that teach your child to think — not just memorize answers.
              </p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-purple-500 flex-shrink-0" /> Homework help in every subject</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-purple-500 flex-shrink-0" /> Guides, doesn't just give answers</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-purple-500 flex-shrink-0" /> Sessions saved for parents</li>
              </ul>
            </div>

            {/* Research Mode */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 sm:p-8 border border-emerald-100">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mb-5 shadow-md">
                <Library className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-[#1a1a2e] mb-2">Research Mode</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Pulls real articles from NASA, National Geographic, Britannica, PBS, and more. Rewrites them at your child's reading level. Branded source cards.
              </p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" /> 25+ trusted educational sources</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" /> Rewritten for their grade level</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" /> No external links ever</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ========== PROBLEM SECTION ========== */}
      <section className="px-4 sm:px-6 py-16 sm:py-20 lg:py-24 bg-[#FDF8F3]">
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
              You want them to learn, explore, and ask questions. But every time they open a search engine or AI chatbot, your stomach drops. Because you know what's out there.
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
                What if they had a safe search engine, personal tutor, and research library — all in one?
              </h3>
            </div>
            <p className="text-blue-100 text-sm sm:text-base max-w-xl mx-auto">
              That's SafeStudy. No external links. No ads. No unfiltered AI. Just safe answers, guided learning, and real research — within the boundaries you set.
            </p>
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

      {/* ========== HOW TUTOR MODE WORKS ========== */}
      <section className="px-4 sm:px-6 py-16 sm:py-20 lg:py-24 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <div className="inline-flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4 border border-purple-100">
              <MessageSquare className="w-4 h-4" />
              How Tutor Mode works
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1a1a2e] mb-4">
              Like having a patient teacher in the room
            </h2>
            <p className="text-gray-600 text-lg max-w-xl mx-auto">
              Your child asks a question. The tutor teaches the concept, then asks a follow-up to check understanding. Real learning happens through conversation.
            </p>
          </div>

          {/* Tutor conversation demo */}
          <div className="bg-[#FDF8F3] rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-5 sm:px-6 py-4 flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 bg-white/30 rounded-full" />
                <div className="w-3 h-3 bg-white/30 rounded-full" />
                <div className="w-3 h-3 bg-white/30 rounded-full" />
              </div>
              <div className="flex-1 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-white/90" />
                <span className="text-white/90 text-sm font-medium">SafeStudy Tutor — Emma, Grade 4</span>
              </div>
            </div>

            <div className="p-5 sm:p-8 space-y-4">
              {/* Kid message */}
              <div className="flex justify-end">
                <div className="bg-blue-500 text-white px-4 py-3 rounded-2xl rounded-br-md max-w-sm shadow-sm">
                  <p className="text-sm">I don't understand fractions. What does 3/4 mean?</p>
                </div>
              </div>

              {/* Tutor response */}
              <div className="flex justify-start">
                <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-md max-w-md shadow-sm border border-gray-100">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Great question! Imagine you have a pizza cut into <strong>4 equal slices</strong>. If you eat <strong>3 of those slices</strong>, you've eaten 3/4 of the pizza. The bottom number (4) tells you how many pieces total. The top number (3) tells you how many pieces you're talking about.
                  </p>
                  <p className="text-sm text-gray-700 mt-2 leading-relaxed">
                    Can you tell me — if a pie is cut into <strong>8 slices</strong> and you eat <strong>5</strong>, what fraction did you eat?
                  </p>
                </div>
              </div>

              {/* Kid tries */}
              <div className="flex justify-end">
                <div className="bg-blue-500 text-white px-4 py-3 rounded-2xl rounded-br-md max-w-sm shadow-sm">
                  <p className="text-sm">5/8?</p>
                </div>
              </div>

              {/* Tutor celebrates */}
              <div className="flex justify-start">
                <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-md max-w-md shadow-sm border border-gray-100">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Exactly! Great thinking! 5/8 means 5 out of 8 slices. You've got it! Want to try a harder one, or should we talk about what happens when you add two fractions together?
                  </p>
                </div>
              </div>

              {/* Input area */}
              <div className="flex items-center gap-2 pt-2">
                <div className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-400 flex items-center justify-between">
                  <span>Ask the tutor anything...</span>
                  <div className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-gray-300" />
                  </div>
                </div>
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-sm">
                  <Send className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 mt-8">
            <div className="bg-purple-50 rounded-xl p-4 text-center border border-purple-100">
              <p className="font-bold text-purple-700 text-sm">Teaches, then asks</p>
              <p className="text-xs text-gray-500 mt-1">70% teaching, 30% questions. Real learning in every message.</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 text-center border border-purple-100">
              <p className="font-bold text-purple-700 text-sm">Adapts to their level</p>
              <p className="text-xs text-gray-500 mt-1">Uses grade-level vocabulary. Adjusts for accessibility needs.</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 text-center border border-purple-100">
              <p className="font-bold text-purple-700 text-sm">Every subject</p>
              <p className="text-xs text-gray-500 mt-1">Math, science, history, writing, reading — any school subject.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ========== FEATURES GRID ========== */}
      <section id="features" className="px-4 sm:px-6 py-16 sm:py-20 lg:py-24 bg-[#FDF8F3]">
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
                  className="bg-white rounded-2xl p-8 border border-gray-100 hover:shadow-lg hover:border-blue-200 transition-all group"
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
            {secondaryFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="bg-white rounded-xl p-4 border border-gray-100 hover:shadow-md hover:border-blue-100 transition-all group"
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

      {/* ========== SEARCH DEMO / PREVIEW ========== */}
      <section id="demo" className="px-4 sm:px-6 py-16 sm:py-20 lg:py-24 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1a1a2e] mb-4">See Search Mode in action</h2>
            <p className="text-gray-600 text-lg max-w-xl mx-auto">
              Here's what happens when your kid types or asks "How do volcanoes erupt?" — with clickable sections and read aloud.
            </p>
          </div>

          <div className="bg-[#FDF8F3] rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            {/* Browser chrome */}
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 px-5 sm:px-6 py-4 flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 bg-white/30 rounded-full" />
                <div className="w-3 h-3 bg-white/30 rounded-full" />
                <div className="w-3 h-3 bg-white/30 rounded-full" />
              </div>
              <div className="flex-1 bg-white/20 rounded-lg px-4 py-1.5 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-white/70" />
                <span className="text-white/90 text-sm font-medium">getsafestudy.com/search</span>
              </div>
            </div>

            <div className="p-5 sm:p-8">
              {/* Search bar */}
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <div className="w-full bg-white border border-gray-200 rounded-xl pl-12 pr-12 py-4 text-gray-700 text-lg font-medium">
                  How do volcanoes erupt?
                </div>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center" title="Voice search">
                  <Mic className="w-4 h-4 text-blue-600" />
                </div>
              </div>

              {/* Answer card — matches current mature design */}
              <div className="bg-white border-l-4 border-l-blue-500 rounded-xl p-5 mb-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  <p className="text-sm font-semibold text-gray-800">Quick Answer</p>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Volcanoes erupt when hot melted rock called <strong>magma</strong> rises up from deep inside the Earth.
                  Think of it like shaking a soda bottle — pressure builds up until it has to escape!
                  When the magma reaches the surface, it's called <strong>lava</strong>.
                </p>
              </div>

              {/* Clickable sections */}
              <div className="flex flex-wrap gap-2 mb-4">
                <div className="inline-flex items-center gap-1.5 bg-white text-gray-600 px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 cursor-pointer hover:border-blue-300 hover:text-blue-600 transition">
                  <MousePointerClick className="w-3.5 h-3.5" />
                  What is magma made of?
                </div>
                <div className="inline-flex items-center gap-1.5 bg-white text-gray-600 px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 cursor-pointer hover:border-blue-300 hover:text-blue-600 transition">
                  <MousePointerClick className="w-3.5 h-3.5" />
                  Types of volcanoes
                </div>
                <div className="inline-flex items-center gap-1.5 bg-white text-gray-600 px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 cursor-pointer hover:border-blue-300 hover:text-blue-600 transition">
                  <MousePointerClick className="w-3.5 h-3.5" />
                  Famous eruptions
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
                <div className="inline-flex items-center gap-1.5 bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer hover:bg-purple-200 transition">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Ask Tutor
                </div>
              </div>

              {/* Learning differences callout */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Adapts to how your child learns</p>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-white border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full text-xs">Dyslexia-friendly</span>
                  <span className="bg-white border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full text-xs">ADHD-friendly</span>
                  <span className="bg-white border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full text-xs">ESL support</span>
                  <span className="bg-white border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full text-xs">Low vision</span>
                  <span className="bg-white border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full text-xs">K-12 reading levels</span>
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
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white">
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
      <section id="compare" className="px-4 sm:px-6 py-16 sm:py-20 lg:py-24 bg-[#FDF8F3]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1a1a2e] mb-4">
              How SafeStudy compares
            </h2>
            <p className="text-gray-600 text-lg max-w-xl mx-auto">
              There's nothing else like it. Here's why.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white">
                  <th className="px-4 py-4 text-left font-semibold text-[#1a1a2e] min-w-[180px]">Feature</th>
                  <th className="px-4 py-4 text-center min-w-[100px]">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                        <Search className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-bold text-[#1a1a2e]">SafeStudy</span>
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
                    <ComparisonCell value={row.safestudy} />
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
      <section id="pricing" className="px-4 sm:px-6 py-16 sm:py-20 lg:py-24 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1a1a2e] mb-4">Less than a coffee per month</h2>
            <p className="text-gray-600 text-lg">$4.99 for a search engine, built-in tutor, and research tool. Cancel in 2 clicks, anytime.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Individual Plan */}
            <div className="bg-[#FDF8F3] rounded-3xl p-6 sm:p-8 border-2 border-blue-200 shadow-lg relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow">
                  MOST POPULAR
                </span>
              </div>
              <div className="text-center mb-6 pt-2">
                <h3 className="text-lg font-bold text-[#1a1a2e] mb-1">SafeStudy</h3>
                <p className="text-gray-500 text-sm mb-4">Search + Tutor + Research — all in one</p>
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
                  'Built-in Tutor (Socratic method)',
                  'Research Mode (NASA, Nat Geo, PBS...)',
                  'Safe, age-appropriate answers',
                  'Voice search & read aloud',
                  'Grade-level reading (K-12)',
                  'Accessibility adaptations',
                  'Topic request system',
                  'Parent search dashboard',
                  'Blocked topic controls',
                  'Daily time limits',
                  'Dark mode',
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
            <div className="bg-[#FDF8F3] rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm">
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
                  'SafeStudy \u2014 Safe search + built-in tutor + research from trusted sources',
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
      <section id="faq" className="px-4 sm:px-6 py-16 sm:py-20 lg:py-24 bg-[#FDF8F3]">
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
            The question is: will they do it safely — and will they have help when they need it?
          </p>
          <p className="text-blue-200 text-base mb-8 max-w-lg mx-auto">
            You can't stand behind them forever. But you can give them a search engine, built-in tutor, and research library that was built — from the ground up — to protect them and help them learn. Built by a parent who needed this for his own kids.
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
              <span className="font-bold text-white">SafeStudy</span>
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
