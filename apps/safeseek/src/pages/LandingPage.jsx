import { Link } from 'react-router-dom';
import {
  Search, Shield, Clock, Eye, Brain, Sparkles, CheckCircle2,
  ArrowRight, Users, Lock, Zap, BookOpen
} from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Filtering',
    description: 'Every search result is screened by AI in real-time. Inappropriate content never reaches your child.',
  },
  {
    icon: Shield,
    title: 'Blocked Topic Controls',
    description: 'Choose which topics to block: violence, drugs, explicit content, and more. Customize per kid.',
  },
  {
    icon: Eye,
    title: 'Search History for Parents',
    description: 'See exactly what your kids are searching for. Flagged searches are highlighted so you can follow up.',
  },
  {
    icon: Clock,
    title: 'Search Limits & Time Windows',
    description: 'Set daily search limits and allowed hours. No more late-night browsing.',
  },
  {
    icon: Users,
    title: 'Per-Kid Profiles',
    description: 'Each child gets their own profile with age-appropriate strictness levels and custom rules.',
  },
  {
    icon: BookOpen,
    title: 'Learning-First Results',
    description: 'Results are tuned for educational value. Curiosity is encouraged, not restricted.',
  },
];

const steps = [
  {
    number: '1',
    title: 'Parent sets boundaries',
    description: 'Create profiles for each kid, choose strictness levels, and block specific topics.',
  },
  {
    number: '2',
    title: 'Kid searches freely',
    description: 'Kids use a clean, friendly search bar to explore anything they are curious about.',
  },
  {
    number: '3',
    title: 'AI filters results in real-time',
    description: 'Every query and result passes through AI filters before your child sees it.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-brand-cream">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-md">
            <Search className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl text-brand-navy">SafeSeek</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="text-gray-600 hover:text-gray-900 font-medium px-4 py-2 transition"
          >
            Log In
          </Link>
          <Link
            to="/signup"
            className="btn-brand text-sm px-5 py-2.5"
          >
            Start Free Trial
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 pt-16 pb-24 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
          <Sparkles className="w-4 h-4" />
          AI-powered kid-safe seek
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-brand-navy leading-tight mb-6">
          The search engine built for{' '}
          <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
            curious kids
          </span>
        </h1>
        <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
          Let your kids explore the internet safely. SafeSeek uses AI to filter results
          in real-time, so they discover answers without the dangers.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/signup"
            className="btn-brand inline-flex items-center justify-center gap-2 text-lg px-8 py-4"
          >
            Start 7-Day Free Trial
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            to="/search"
            className="btn-brand-outline inline-flex items-center justify-center gap-2 text-lg px-8 py-4"
          >
            <Search className="w-5 h-5" />
            Try a Demo Search
          </Link>
        </div>
        <p className="text-sm text-gray-500 mt-4">No credit card required for trial</p>
      </section>

      {/* Search Preview */}
      <section className="px-6 pb-24 max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-4 flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Search className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-medium">SafeSeek</span>
          </div>
          <div className="p-6 sm:p-8">
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <div className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-4 text-gray-500 text-lg">
                How do volcanoes erupt?
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-blue-800 mb-1">AI Summary</p>
                  <p className="text-sm text-blue-700 leading-relaxed">
                    Volcanoes erupt when hot melted rock called magma rises up from deep inside the Earth.
                    Pressure builds until the magma bursts through the surface as lava, along with ash and gases.
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {['How Volcanoes Work - National Geographic Kids', 'Volcano Facts for Children - Science Fun', 'Why Do Volcanoes Erupt? - Britannica Kids'].map((title, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <p className="text-blue-600 font-medium text-sm">{title}</p>
                    <p className="text-gray-500 text-xs mt-0.5">kid-safe source</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-24 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-brand-navy mb-4">How It Works</h2>
            <p className="text-gray-600 text-lg max-w-xl mx-auto">
              Set it up in minutes. Your kids search with confidence.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div key={step.number} className="text-center">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg text-white font-bold text-xl">
                  {step.number}
                </div>
                <h3 className="text-lg font-bold text-brand-navy mb-2">{step.title}</h3>
                <p className="text-gray-600 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-24 bg-brand-cream">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-brand-navy mb-4">
              Everything parents need
            </h2>
            <p className="text-gray-600 text-lg max-w-xl mx-auto">
              Powerful controls, zero hassle. You set the rules, AI does the work.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition"
                >
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-brand-navy mb-2">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed text-sm">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-6 py-24 bg-white">
        <div className="max-w-lg mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-brand-navy mb-4">Simple Pricing</h2>
          <p className="text-gray-600 mb-10">One plan. Full protection. Cancel anytime.</p>
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-3xl p-8 border border-blue-100 shadow-lg">
            <div className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold mb-4">
              <Zap className="w-3.5 h-3.5" />
              7-DAY FREE TRIAL
            </div>
            <div className="mb-6">
              <span className="text-5xl font-extrabold text-brand-navy">$4.99</span>
              <span className="text-gray-500 text-lg">/month</span>
            </div>
            <ul className="text-left space-y-3 mb-8">
              {[
                'Unlimited kid profiles',
                'AI-filtered search results',
                'Parent search history dashboard',
                'Blocked topic controls',
                'Daily search limits & time windows',
                'Flagged search alerts',
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-gray-700">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/signup"
              className="btn-brand w-full inline-flex items-center justify-center gap-2 text-lg"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
            <p className="text-xs text-gray-500 mt-3">No credit card required</p>
          </div>
        </div>
      </section>

      {/* Safety Banner */}
      <section className="px-6 py-16 bg-gradient-to-r from-blue-600 to-cyan-500">
        <div className="max-w-3xl mx-auto text-center">
          <Lock className="w-10 h-10 text-white/80 mx-auto mb-4" />
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Your child's safety is our mission
          </h2>
          <p className="text-blue-100 text-lg mb-8 max-w-xl mx-auto">
            Built by parents, for parents. Part of the Safe Family suite of apps
            that keep kids safe online.
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 bg-white text-blue-600 font-semibold px-8 py-3 rounded-full hover:bg-blue-50 transition shadow-lg"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 bg-brand-cream border-t border-gray-200">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <Search className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-brand-navy">SafeSeek</span>
          </div>
          <p className="text-gray-500 text-sm">
            A Safe Family product &middot; jeremiah@getsafefamily.com
          </p>
          <div className="flex gap-6 text-sm text-gray-500">
            <a href="https://getsafefamily.com/privacy" className="hover:text-gray-700">Privacy</a>
            <a href="https://getsafefamily.com/terms" className="hover:text-gray-700">Terms</a>
            <a href="https://getsafefamily.com/support" className="hover:text-gray-700">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
