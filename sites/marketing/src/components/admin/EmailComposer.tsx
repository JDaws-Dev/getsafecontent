"use client";

import { useState } from "react";
import type { GroupedUser } from "@/types/admin";

type TemplateType = "trial_expiring" | "trial_expired" | "re_engagement" | "announcement" | "custom";

interface EmailComposerProps {
  user: GroupedUser;
  onClose: () => void;
  onSent: () => void;
}

interface Template {
  id: TemplateType;
  name: string;
  description: string;
}

const templates: Template[] = [
  { id: "trial_expiring", name: "Trial Expiring", description: "Remind about expiring trial" },
  { id: "trial_expired", name: "Trial Expired", description: "Re-engage expired trial users" },
  { id: "re_engagement", name: "Re-engagement", description: "Reach out to inactive users" },
  { id: "announcement", name: "Announcement", description: "Send news or updates" },
  { id: "custom", name: "Custom Email", description: "Write a custom email" },
];

export function EmailComposer({ user, onClose, onSent }: EmailComposerProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>("trial_expiring");
  const [customSubject, setCustomSubject] = useState("");
  const [customBody, setCustomBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Calculate days left for trial_expiring template
  const daysLeft = user.latestTrialExpiry
    ? Math.max(0, Math.ceil((user.latestTrialExpiry - Date.now()) / (1000 * 60 * 60 * 24)))
    : 3;

  const handlePreview = async () => {
    setError(null);
    try {
      const params = new URLSearchParams({
        template: selectedTemplate,
        userName: user.name || "",
        daysLeft: daysLeft.toString(),
      });

      const res = await fetch(`/api/admin/send-email?${params}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load preview");
      }

      setPreviewHtml(data.html);
      setShowPreview(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load preview");
    }
  };

  const handleSend = async () => {
    setError(null);
    setSending(true);

    try {
      const appNames = user.apps.map((a) => a.app);

      const payload: Record<string, unknown> = {
        to: user.email,
        template: selectedTemplate,
        userName: user.name || undefined,
        daysLeft: selectedTemplate === "trial_expiring" ? daysLeft : undefined,
        appNames,
      };

      if (selectedTemplate === "custom" || selectedTemplate === "announcement") {
        payload.subject = customSubject;
        payload.body = customBody;
      }

      const res = await fetch("/api/admin/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || "Failed to send email");
      }

      setSuccess(true);
      setTimeout(() => {
        onSent();
        onClose();
      }, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  const needsCustomContent = selectedTemplate === "custom" || selectedTemplate === "announcement";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Send Email</h3>
            <p className="text-sm text-gray-500">
              To: {user.name || "No name"} ({user.email})
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {success ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">✅</div>
              <h4 className="text-lg font-semibold text-gray-900">Email Sent!</h4>
              <p className="text-sm text-gray-500">Successfully sent to {user.email}</p>
            </div>
          ) : showPreview ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">Preview</h4>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-sm text-indigo-600 hover:text-indigo-700"
                >
                  &larr; Back to compose
                </button>
              </div>
              <div
                className="border border-gray-200 rounded-lg p-4 bg-white"
                dangerouslySetInnerHTML={{ __html: previewHtml || "" }}
              />
            </>
          ) : (
            <>
              {/* Template selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Template
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        selectedTemplate === template.id
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <p className="font-medium text-sm">{template.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{template.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom subject/body for announcement and custom */}
              {needsCustomContent && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      placeholder="Enter email subject..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Body
                    </label>
                    <textarea
                      value={customBody}
                      onChange={(e) => setCustomBody(e.target.value)}
                      placeholder="Write your email message..."
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      HTML is supported. Use &lt;p&gt; tags for paragraphs.
                    </p>
                  </div>
                </>
              )}

              {/* Context info */}
              <div className="bg-gray-50 rounded-lg p-4 text-sm">
                <h5 className="font-medium text-gray-700 mb-2">Email will include:</h5>
                <ul className="space-y-1 text-gray-600">
                  <li>• Recipient name: {user.name || "(none)"}</li>
                  <li>• Apps: {user.apps.map((a) => a.app.replace("safe", "Safe")).join(", ")}</li>
                  {selectedTemplate === "trial_expiring" && (
                    <li>• Days until expiry: {daysLeft}</li>
                  )}
                </ul>
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={sending}
            >
              Cancel
            </button>
            {!showPreview && (
              <button
                onClick={handlePreview}
                className="px-4 py-2 text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                disabled={sending}
              >
                Preview
              </button>
            )}
            <button
              onClick={handleSend}
              disabled={sending || (needsCustomContent && (!customSubject || !customBody))}
              className="px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? "Sending..." : "Send Email"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
