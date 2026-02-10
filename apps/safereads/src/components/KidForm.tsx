"use client";

import { useState } from "react";

export type KidFormValues = {
  name: string;
  age?: number;
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedAge = age ? parseInt(age, 10) : undefined;

    onSubmit({
      name: name.trim(),
      age: parsedAge && !isNaN(parsedAge) ? parsedAge : undefined,
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
          className="mt-1 w-full rounded-lg border border-parchment-300 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-parchment-500 focus:outline-none focus:ring-1 focus:ring-parchment-500"
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
          className="mt-1 w-full rounded-lg border border-parchment-300 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-parchment-500 focus:outline-none focus:ring-1 focus:ring-parchment-500"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !name.trim()}
        className="w-full rounded-lg bg-parchment-700 px-4 py-2 text-sm font-medium text-parchment-50 transition-colors hover:bg-parchment-800 disabled:opacity-50"
      >
        {loading ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
