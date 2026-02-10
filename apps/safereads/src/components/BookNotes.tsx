"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { StickyNote, Pencil, Trash2, Check, X } from "lucide-react";

export function BookNotes({ bookId }: { bookId: Id<"books"> }) {
  const userId = useQuery(api.users.currentUserId);

  const note = useQuery(
    api.notes.getByUserAndBook,
    userId ? { userId, bookId } : "skip"
  );

  const upsert = useMutation(api.notes.upsert);
  const remove = useMutation(api.notes.remove);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  function startEditing() {
    setDraft(note?.content ?? "");
    setEditing(true);
  }

  async function handleSave() {
    if (!userId || !draft.trim()) return;
    setSaving(true);
    try {
      await upsert({ userId, bookId, content: draft.trim() });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!note?._id) return;
    setSaving(true);
    try {
      await remove({ noteId: note._id as Id<"notes"> });
      setEditing(false);
      setDraft("");
    } finally {
      setSaving(false);
    }
  }

  // Don't render until user data is loaded
  if (!userId) return null;

  // Loading state for note query
  if (note === undefined) return null;

  if (editing) {
    return (
      <div className="rounded-lg border border-parchment-200 bg-white p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-ink-700">
          <StickyNote className="h-4 w-4 text-parchment-500" />
          Your Note
        </div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add your thoughts about this book…"
          rows={3}
          className="mt-2 w-full resize-none rounded-md border border-parchment-200 bg-parchment-50 px-3 py-2 text-sm text-ink-900 placeholder:text-ink-300 focus:border-parchment-400 focus:outline-none"
        />
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !draft.trim()}
            className="flex items-center gap-1 rounded-md bg-parchment-700 px-3 py-1.5 text-xs font-medium text-parchment-50 transition-colors hover:bg-parchment-800 disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" />
            Save
          </button>
          <button
            onClick={() => setEditing(false)}
            disabled={saving}
            className="flex items-center gap-1 rounded-md border border-parchment-200 px-3 py-1.5 text-xs font-medium text-ink-500 transition-colors hover:bg-parchment-50 disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" />
            Cancel
          </button>
          {note && (
            <button
              onClick={handleDelete}
              disabled={saving}
              className="ml-auto flex items-center gap-1 text-xs font-medium text-ink-400 transition-colors hover:text-verdict-warning disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          )}
        </div>
      </div>
    );
  }

  if (note) {
    return (
      <div className="rounded-lg border border-parchment-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-ink-700">
            <StickyNote className="h-4 w-4 text-parchment-500" />
            Your Note
          </div>
          <button
            onClick={startEditing}
            className="flex items-center gap-1 text-xs font-medium text-parchment-700 transition-colors hover:text-parchment-800"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        </div>
        <p className="mt-2 whitespace-pre-wrap text-sm text-ink-600">
          {note.content}
        </p>
      </div>
    );
  }

  return (
    <button
      onClick={startEditing}
      className="flex w-full items-center gap-2 rounded-lg border border-dashed border-parchment-300 px-4 py-3 text-sm font-medium text-ink-400 transition-colors hover:border-parchment-400 hover:text-ink-600"
    >
      <StickyNote className="h-4 w-4" />
      Add a note about this book
    </button>
  );
}
