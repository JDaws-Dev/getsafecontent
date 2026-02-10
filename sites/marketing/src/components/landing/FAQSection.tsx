"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "Can my kids get around it?",
    answer:
      "No. Unlike device-level parental controls that tech-savvy kids can disable, Safe Family uses a whitelist approach. Your kids can only access content you've specifically approved. There's nothing to bypass—if you haven't approved it, it simply doesn't exist in their view.",
  },
  {
    question: "How is SafeTube different from YouTube Kids?",
    answer:
      "YouTube Kids relies on algorithms that regularly let inappropriate content slip through. SafeTube is the opposite: your kids see only channels and videos you've personally reviewed and approved. No algorithms, no surprises, no \"recommended\" rabbit holes.",
  },
  {
    question: "What ages is this for?",
    answer:
      "Safe Family works great for kids ages 4-14. Younger kids benefit from fully curated content, while older kids appreciate having access to \"real\" platforms (not kiddie apps) with reasonable guardrails. You can create separate profiles with different approval levels for each child.",
  },
  {
    question: "What if I want to cancel?",
    answer:
      "Cancel anytime with one click—no phone calls, no hoops to jump through. You'll keep access through the end of your billing period. Plus, we offer a 30-day money-back guarantee, no questions asked.",
  },
  {
    question: "Does it work on all devices?",
    answer:
      "SafeTunes connects to Apple Music and works on any device where Apple Music is available. SafeTube works in any web browser and has a Chrome extension for easy channel approval. SafeReads is a web app that works on any device with a browser.",
  },
  {
    question: "Can I share with my spouse or co-parent?",
    answer:
      "Yes! One subscription covers your entire household. Both parents can log in, approve content, and manage kid profiles. You'll both see the same approved content library—no need for separate accounts.",
  },
  {
    question: "What if I need help setting it up?",
    answer:
      "Each app takes about 5 minutes to set up. We have step-by-step guides, and our support team (real humans, not bots) typically responds within a few hours. Most parents are up and running the same day they sign up.",
  },
  {
    question: "Is my family's data safe?",
    answer:
      "Absolutely. We're COPPA compliant, we encrypt all data, and we never sell your information to third parties. We only collect what's necessary to make the apps work—no tracking, no ads, no data harvesting.",
  },
];

function FAQItem({
  item,
  isOpen,
  onToggle,
}: {
  item: FAQItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-slate-200 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between py-5 text-left"
      >
        <span className="text-base font-medium text-navy pr-4">
          {item.question}
        </span>
        <ChevronDown
          className={`h-5 w-5 flex-shrink-0 text-navy/40 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ${
          isOpen ? "max-h-96 pb-5" : "max-h-0"
        }`}
      >
        <p className="text-sm leading-relaxed text-navy/70">{item.answer}</p>
      </div>
    </div>
  );
}

export default function FAQSection() {
  // Start with first FAQ expanded - addresses biggest parental anxiety ("Can my kids get around it?")
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-12 sm:py-16 bg-white">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-navy sm:text-4xl">
            Common questions
          </h2>
          <p className="mt-4 text-lg text-navy/60">
            Everything you need to know before getting started.
          </p>
        </div>

        {/* FAQ accordion */}
        <div className="bg-slate-50 rounded-2xl p-6 sm:p-8">
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              item={faq}
              isOpen={openIndex === index}
              onToggle={() => toggleFAQ(index)}
            />
          ))}
        </div>

        {/* Still have questions? */}
        <div className="mt-10 text-center">
          <p className="text-navy/60">
            Still have questions?{" "}
            <a
              href="mailto:jeremiah@getsafefamily.com"
              className="font-medium text-navy underline underline-offset-2 hover:text-navy/80"
            >
              Reach out to our team
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
