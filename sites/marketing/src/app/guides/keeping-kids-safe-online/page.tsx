import { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import {
  Shield,
  MessageCircle,
  Settings,
  Eye,
  Lock,
  Heart,
  AlertTriangle,
  Users,
  Clock,
  CheckCircle,
} from "lucide-react";

export const metadata: Metadata = {
  title: "10 Ways to Keep Your Kids Safe Online | Safe Family Guide",
  description:
    "A practical guide with 10 actionable tips every parent needs to protect their children in the digital age.",
};

const tips = [
  {
    icon: MessageCircle,
    title: "Start conversations early",
    content:
      "Don't wait for something bad to happen. Talk to your kids about online safety as soon as they start using devices. Use age-appropriate language and make it an ongoing conversation, not a one-time lecture.",
  },
  {
    icon: Settings,
    title: "Configure privacy settings on every device",
    content:
      "Each device, app, and platform has privacy settings. Take time to review and configure them. Turn off location sharing, limit who can contact your child, and disable features they don't need.",
  },
  {
    icon: Eye,
    title: "Keep devices in common areas",
    content:
      "When kids use devices in shared spaces, they're less likely to encounter or seek out inappropriate content. This isn't about spying—it's about creating an environment where good choices come naturally.",
  },
  {
    icon: Lock,
    title: "Use parental controls (but don't stop there)",
    content:
      "Parental controls are a helpful layer of protection, but determined kids can often find workarounds. Combine technical controls with open communication and trust-building.",
  },
  {
    icon: Users,
    title: "Know who they're talking to online",
    content:
      "Have regular conversations about their online friends. Who do they play games with? Who do they chat with? Make sure they understand that online 'friends' aren't always who they claim to be.",
  },
  {
    icon: Heart,
    title: "Teach digital empathy",
    content:
      "Help kids understand that real people are behind every screen. Teach them to treat others online as they would in person, and to speak up if they see someone being bullied or harassed.",
  },
  {
    icon: AlertTriangle,
    title: "Create a safe space for reporting",
    content:
      "Make it clear that your child can come to you if they see something disturbing online—without fear of punishment or losing device privileges. Your reaction when they report issues determines whether they'll tell you next time.",
  },
  {
    icon: Clock,
    title: "Set healthy screen time boundaries",
    content:
      "Establish clear rules about when and how long kids can use devices. Consider device-free times like meals and before bed. Model good behavior by following these rules yourself.",
  },
  {
    icon: Shield,
    title: "Curate their content",
    content:
      "Instead of just blocking bad content, actively curate good content. Create playlists of approved music, subscribe to educational YouTube channels, and stock their digital library with quality books.",
  },
  {
    icon: CheckCircle,
    title: "Review and adapt regularly",
    content:
      "What works for a 6-year-old won't work for a 12-year-old. Schedule regular check-ins to review your family's digital rules and adapt them as your children grow and demonstrate responsibility.",
  },
];

export default function KeepingKidsSafeGuide() {
  return (
    <>
      <Header />
      <main className="bg-cream min-h-screen pt-24 pb-16">
        <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <header className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-6">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-navy mb-4">
              10 Ways to Keep Your Kids Safe Online
            </h1>
            <p className="text-lg text-navy/70 max-w-2xl mx-auto">
              Practical tips every parent needs to protect their children in the
              digital age — without becoming the screen time police.
            </p>
          </header>

          {/* Introduction */}
          <div className="prose prose-lg prose-navy max-w-none mb-12">
            <p>
              The internet is an amazing resource for learning and connection.
              But as parents, we know it also exposes our kids to risks they're
              not ready to handle alone.
            </p>
            <p>
              The good news? You don't need to be a tech expert to keep your
              family safe. These 10 strategies combine practical tools with
              open communication to create a balanced approach to digital
              parenting.
            </p>
          </div>

          {/* Tips */}
          <div className="space-y-8">
            {tips.map((tip, index) => {
              const Icon = tip.icon;
              return (
                <div
                  key={index}
                  className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-navy/5"
                >
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-indigo-600" />
                      </div>
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-navy mb-2">
                        {index + 1}. {tip.title}
                      </h2>
                      <p className="text-navy/70 leading-relaxed">
                        {tip.content}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CTA */}
          <div className="mt-16 rounded-2xl bg-gradient-to-br from-navy to-navy-light p-8 text-white text-center">
            <h2 className="text-2xl font-bold mb-4">
              Want to take it to the next level?
            </h2>
            <p className="text-white/80 mb-6 max-w-xl mx-auto">
              Safe Family gives you app-level control over the music your kids
              hear, the videos they watch, and helps you vet books before they
              read them.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/signup"
                className="btn-peach inline-flex items-center justify-center gap-2"
              >
                Start Free Trial
              </a>
              <a
                href="/"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors font-medium"
              >
                Learn More
              </a>
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
