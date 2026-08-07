"use client";

import { useState } from "react";

const COLORS = [
  { id: "red", label: "Red", class: "bg-red-400" },
  { id: "blue", label: "Blue", class: "bg-blue-400" },
  { id: "green", label: "Green", class: "bg-green-400" },
  { id: "purple", label: "Purple", class: "bg-purple-400" },
  { id: "orange", label: "Orange", class: "bg-orange-400" },
  { id: "pink", label: "Pink", class: "bg-pink-400" },
  { id: "teal", label: "Teal", class: "bg-teal-400" },
  { id: "yellow", label: "Yellow", class: "bg-yellow-400" },
];

const READING_LEVELS = [
  { id: "early-reader", label: "Early Reader (ages 4-6)" },
  { id: "chapter-books", label: "Chapter Books (ages 6-9)" },
  { id: "middle-grade", label: "Middle Grade (ages 9-12)" },
  { id: "ya", label: "Young Adult (ages 12+)" },
];

export type KidFormValues = {
  name: string;
  age?: number;
  color?: string;
  pin?: string;
  readingLevel?: string;
};

export function KidForm({
  initialValues,
  onSubmit,
  submitLabel = "Save",
  loading = false,
}: {
  initialValues?: KidFormValues;
  onSubmit: (values: KidFormValues) => void;
  submitLabel?: string;
  loading?: boolean;
}) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [age, setAge] = useState<string>(
    initialValues?.age?.toString() ?? ""
  );
  const [color, setColor] = useState(initialValues?.color ?? "purple");
  const [pin, setPin] = useState(initialValues?.pin ?? "");
  const [readingLevel, setReadingLevel] = useState(initialValues?.readingLevel ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedAge = age ? parseInt(age, 10) : undefined;

    onSubmit({
      name: name.trim(),
      age: parsedAge && !isNaN(parsedAge) ? parsedAge : undefined,
      color,
      pin: pin.length === 4 ? pin : undefined,
      readingLevel: readingLevel || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="kid-name"
          className="block text-sm font-medium text-ink-700"
        >
          Name
        </label>
        <input
          id="kid-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Emma"
          required
          className="mt-1 w-full rounded-lg border border-brand-cream-2 bg-white px-3 py-2 text-sm text-brand-navy placeholder:text-ink-400 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
        />
      </div>

      <div>
        <label
          htmlFor="kid-age"
          className="block text-sm font-medium text-ink-700"
        >
          Age{" "}
          <span className="font-normal text-ink-400">(optional)</span>
        </label>
        <input
          id="kid-age"
          type="number"
          min={0}
          max={18}
          value={age}
          onChange={(e) => setAge(e.target.value)}
          placeholder="e.g. 10"
          className="mt-1 w-full rounded-lg border border-brand-cream-2 bg-white px-3 py-2 text-sm text-brand-navy placeholder:text-ink-400 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
        />
      </div>

      {/* Avatar Color */}
      <div>
        <label className="block text-sm font-medium text-ink-700">
          Avatar Color
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setColor(c.id)}
              className={`h-8 w-8 rounded-full ${c.class} transition-all ${
                color === c.id
                  ? "ring-2 ring-accent-700 ring-offset-2 scale-110"
                  : "hover:scale-105 opacity-60"
              }`}
              title={c.label}
              aria-label={`Select ${c.label}`}
            />
          ))}
        </div>
      </div>

      {/* Reading Level */}
      <div>
        <label
          htmlFor="kid-reading-level"
          className="block text-sm font-medium text-ink-700"
        >
          Reading Level{" "}
          <span className="font-normal text-ink-400">(optional)</span>
        </label>
        <select
          id="kid-reading-level"
          value={readingLevel}
          onChange={(e) => setReadingLevel(e.target.value)}
          className="mt-1 w-full rounded-lg border border-brand-cream-2 bg-white px-3 py-2 text-sm text-brand-navy focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
        >
          <option value="">Select reading level</option>
          {READING_LEVELS.map((level) => (
            <option key={level.id} value={level.id}>
              {level.label}
            </option>
          ))}
        </select>
      </div>

      {/* PIN */}
      <div>
        <label
          htmlFor="kid-pin"
          className="block text-sm font-medium text-ink-700"
        >
          PIN{" "}
          <span className="font-normal text-ink-400">
            (optional 4-digit code for profile protection)
          </span>
        </label>
        <input
          id="kid-pin"
          type="text"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
          placeholder="e.g. 1234"
          className="mt-1 w-32 rounded-lg border border-brand-cream-2 bg-white px-3 py-2 text-sm text-brand-navy placeholder:text-ink-400 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
        />
        {pin.length > 0 && pin.length < 4 && (
          <p className="mt-1 text-xs text-ink-400">Must be exactly 4 digits</p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading || !name.trim()}
        className="w-full rounded-lg bg-accent-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-800 disabled:opacity-50"
      >
        {loading ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
