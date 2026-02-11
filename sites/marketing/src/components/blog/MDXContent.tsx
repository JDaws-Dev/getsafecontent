"use client";

import * as runtime from "react/jsx-runtime";
import SignupCTA from "./SignupCTA";

// Compile MDX code to React component
const useMDXComponent = (code: string) => {
  const fn = new Function(code);
  return fn({ ...runtime }).default;
};

// Custom components available in MDX
const components = {
  SignupCTA,
  // Standard HTML elements with custom styling
  h2: (props: any) => (
    <h2
      className="text-2xl font-semibold text-navy mt-10 mb-4 scroll-mt-24"
      {...props}
    />
  ),
  h3: (props: any) => (
    <h3
      className="text-xl font-semibold text-navy mt-8 mb-3 scroll-mt-24"
      {...props}
    />
  ),
  p: (props: any) => <p className="text-navy/80 mb-4 leading-relaxed" {...props} />,
  ul: (props: any) => (
    <ul className="list-disc pl-6 text-navy/80 mb-4 space-y-2" {...props} />
  ),
  ol: (props: any) => (
    <ol className="list-decimal pl-6 text-navy/80 mb-4 space-y-2" {...props} />
  ),
  li: (props: any) => <li className="text-navy/80" {...props} />,
  a: (props: any) => (
    <a
      className="text-indigo-600 hover:text-indigo-700 underline"
      {...props}
    />
  ),
  blockquote: (props: any) => (
    <blockquote
      className="border-l-4 border-peach-start pl-4 italic text-navy/70 my-6"
      {...props}
    />
  ),
  code: (props: any) => (
    <code
      className="bg-cream-dark text-navy px-1.5 py-0.5 rounded text-sm font-mono"
      {...props}
    />
  ),
  pre: (props: any) => (
    <pre
      className="bg-navy text-white p-4 rounded-xl overflow-x-auto my-6 text-sm"
      {...props}
    />
  ),
  hr: () => <hr className="border-navy/10 my-8" />,
  table: (props: any) => (
    <div className="overflow-x-auto my-6">
      <table className="min-w-full border-collapse" {...props} />
    </div>
  ),
  th: (props: any) => (
    <th
      className="border border-navy/20 bg-cream-dark px-4 py-2 text-left font-semibold text-navy"
      {...props}
    />
  ),
  td: (props: any) => (
    <td className="border border-navy/20 px-4 py-2 text-navy/80" {...props} />
  ),
  strong: (props: any) => (
    <strong className="font-semibold text-navy" {...props} />
  ),
  em: (props: any) => <em className="italic" {...props} />,
};

interface MDXContentProps {
  code: string;
}

export function MDXContent({ code }: MDXContentProps) {
  const Component = useMDXComponent(code);
  return <Component components={components} />;
}
