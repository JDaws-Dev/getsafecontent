import { Shield, Lock, Eye, Heart, BadgeCheck, RotateCcw } from "lucide-react";

const trustItems = [
  {
    icon: Lock,
    title: "Your Data Stays Private",
    description: "We never sell your data. Your family's content choices are yours alone.",
  },
  {
    icon: Eye,
    title: "No Ads, No Tracking",
    description: "Our apps are ad-free. We make money from subscriptions, not surveillance.",
  },
  {
    icon: Shield,
    title: "Secure by Design",
    description: "Industry-standard encryption protects your account and your kids' profiles.",
  },
  {
    icon: Heart,
    title: "Built by a Parent",
    description: "Created by someone who uses these tools with his own family every day.",
  },
];

export default function TrustSection() {
  return (
    <section className="bg-navy py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Money-back guarantee badge */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center gap-3 bg-emerald-500/20 border border-emerald-400/30 rounded-full px-6 py-3">
            <RotateCcw className="w-5 h-5 text-emerald-400" />
            <span className="text-emerald-300 font-semibold">30-Day Money-Back Guarantee</span>
            <BadgeCheck className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Your Privacy Comes First
          </h2>
          <p className="text-white/70 max-w-xl mx-auto">
            We built these apps for our own families. Your trust matters to us.
          </p>
        </div>

        {/* Trust Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {trustItems.map((item) => (
            <div
              key={item.title}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mx-auto mb-4">
                <item.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-sm text-white/70">{item.description}</p>
            </div>
          ))}
        </div>

        {/* Additional trust signals */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-white/50 text-sm">
          <span className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            SSL Encrypted
          </span>
          <span className="hidden sm:block">•</span>
          <span className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            COPPA Compliant
          </span>
          <span className="hidden sm:block">•</span>
          <span>Cancel anytime</span>
        </div>
      </div>
    </section>
  );
}
