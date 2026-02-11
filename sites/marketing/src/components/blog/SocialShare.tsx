"use client";

import { Twitter, Facebook, Linkedin, Link2, Check } from "lucide-react";
import { useState } from "react";

interface SocialShareProps {
  url: string;
  title: string;
}

export default function SocialShare({ url, title }: SocialShareProps) {
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const shareLinks = [
    {
      name: "Twitter",
      icon: Twitter,
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      color: "hover:bg-sky-100 hover:text-sky-600",
    },
    {
      name: "Facebook",
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      color: "hover:bg-blue-100 hover:text-blue-600",
    },
    {
      name: "LinkedIn",
      icon: Linkedin,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      color: "hover:bg-indigo-100 hover:text-indigo-600",
    },
  ];

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-navy/50 mr-1">Share:</span>
      {shareLinks.map((link) => (
        <a
          key={link.name}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`p-2 rounded-full text-navy/40 transition-colors ${link.color}`}
          title={`Share on ${link.name}`}
        >
          <link.icon className="w-4 h-4" />
        </a>
      ))}
      <button
        onClick={copyToClipboard}
        className="p-2 rounded-full text-navy/40 transition-colors hover:bg-gray-100 hover:text-gray-600"
        title="Copy link"
      >
        {copied ? (
          <Check className="w-4 h-4 text-emerald-500" />
        ) : (
          <Link2 className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}
