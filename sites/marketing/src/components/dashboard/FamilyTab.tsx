"use client";

/**
 * Family tab on the one dashboard — universal settings, set once here and
 * applied by every app: the children (name, age, colour, PIN), "pause
 * everything", whether they can send requests, allowed hours, plus the
 * family's timezone and who gets concern alerts.
 */

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

const COLORS = ["#F0603A", "#7C4DE0", "#3AA06B", "#2F6BF0", "#F2A413", "#E0457B", "#0EA5A4"];

export function FamilyTab() {
  const kids = useQuery(api.kids.listMine, {});
  const settings = useQuery(api.familySettings.getMine, {});
  const createKid = useMutation(api.kids.create);
  const updateKid = useMutation(api.kids.update);
  const setPin = useMutation(api.kids.setPin);
  const archiveKid = useMutation(api.kids.archive);
  const updateSettings = useMutation(api.familySettings.updateMine);

  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAge, setNewAge] = useState("");
  const [newPin, setNewPin] = useState("");
  const [pinEditing, setPinEditing] = useState<Id<"kids"> | null>(null);
  const [pinDraft, setPinDraft] = useState("");
  const [emailsDraft, setEmailsDraft] = useState<string | null>(null);

  // Remember the family's timezone from this browser, once.
  useEffect(() => {
    if (settings && !settings.timezone) {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) updateSettings({ timezone: tz }).catch(() => {});
    }
  }, [settings, updateSettings]);

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try { await fn(); } catch (e) { setError(String((e as Error).message || e).replace(/^.*Uncaught Error: /, "")); }
  };

  const emailsValue = useMemo(() => emailsDraft ?? (settings?.alertEmails ?? []).join(", "), [emailsDraft, settings?.alertEmails]);

  if (kids === undefined || settings === undefined) {
    return <div className="text-navy/50 text-sm">Loading your family…</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-navy">Your family</h1>
        <p className="text-navy/60 mt-1">Set things once here. Every app picks them up within a minute.</p>
      </div>

      {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3">{error}</div>}

      {/* Kids */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-navy">Kids</h2>
          {!adding && (
            <button onClick={() => setAdding(true)} className="rounded-full bg-navy text-white text-sm font-semibold px-4 py-2">Add a child</button>
          )}
        </div>

        {adding && (
          <form
            onSubmit={(e) => { e.preventDefault(); run(async () => { await createKid({ name: newName, age: newAge ? Number(newAge) : undefined, pin: newPin || undefined, color: COLORS[kids.length % COLORS.length] }); setNewName(""); setNewAge(""); setNewPin(""); setAdding(false); }); }}
            className="rounded-2xl bg-white border border-navy/10 p-5 grid grid-cols-1 sm:grid-cols-[1fr_100px_120px_auto_auto] gap-3 items-end"
          >
            <label className="text-sm font-semibold text-navy">Name<input value={newName} onChange={(e) => setNewName(e.target.value)} className="mt-1 w-full h-11 rounded-xl border border-navy/15 px-3" placeholder="First name" autoFocus /></label>
            <label className="text-sm font-semibold text-navy">Age<input value={newAge} onChange={(e) => setNewAge(e.target.value.replace(/\D/g, "").slice(0, 2))} inputMode="numeric" className="mt-1 w-full h-11 rounded-xl border border-navy/15 px-3" placeholder="10" /></label>
            <label className="text-sm font-semibold text-navy">PIN (optional)<input value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" className="mt-1 w-full h-11 rounded-xl border border-navy/15 px-3 font-mono tracking-widest" placeholder="4 digits" /></label>
            <button type="submit" disabled={!newName.trim()} className="h-11 rounded-full bg-navy text-white text-sm font-semibold px-5 disabled:opacity-40">Save</button>
            <button type="button" onClick={() => setAdding(false)} className="h-11 rounded-full border border-navy/15 text-sm font-semibold px-4 text-navy/70">Cancel</button>
          </form>
        )}

        {kids.length === 0 && !adding && (
          <div className="rounded-2xl border border-dashed border-navy/20 p-8 text-center text-navy/60">
            No children yet. Add one and every app will know about them.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {kids.map((k) => (
            <div key={k._id} className="rounded-2xl bg-white border border-navy/10 p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ background: k.color || "#7C4DE0" }}>{k.name.charAt(0).toUpperCase()}</span>
                  <div>
                    <div className="font-bold text-navy">{k.name}</div>
                    <div className="text-xs text-navy/60">{k.age ? `Age ${k.age} · ` : ""}{k.hasPin ? "PIN on" : "No PIN"}</div>
                  </div>
                </div>
                <label className={`inline-flex items-center gap-2 text-sm font-semibold ${k.paused ? "text-red-700" : "text-navy/70"}`}>
                  <input type="checkbox" checked={!!k.paused} onChange={(e) => run(() => updateKid({ kidId: k._id, paused: e.target.checked }))} className="w-4 h-4" />
                  {k.paused ? "Paused everywhere" : "Pause everything"}
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <label className="inline-flex items-center gap-2 text-navy/80">
                  <input type="checkbox" checked={k.requestsEnabled !== false} onChange={(e) => run(() => updateKid({ kidId: k._id, requestsEnabled: e.target.checked }))} className="w-4 h-4" />
                  Can send requests
                </label>
                <div className="flex items-center gap-2 text-navy/80">
                  <span className="whitespace-nowrap">Hours</span>
                  <input type="time" value={k.allowedStartTime ?? ""} onChange={(e) => run(() => updateKid({ kidId: k._id, allowedStartTime: e.target.value || null }))} className="h-9 rounded-lg border border-navy/15 px-2" />
                  <span>–</span>
                  <input type="time" value={k.allowedEndTime ?? ""} onChange={(e) => run(() => updateKid({ kidId: k._id, allowedEndTime: e.target.value || null }))} className="h-9 rounded-lg border border-navy/15 px-2" />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-navy/10">
                {pinEditing === k._id ? (
                  <form onSubmit={(e) => { e.preventDefault(); run(async () => { await setPin({ kidId: k._id, pin: pinDraft }); setPinEditing(null); setPinDraft(""); }); }} className="flex items-center gap-2">
                    <input value={pinDraft} onChange={(e) => setPinDraft(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" autoFocus placeholder="4 digits" className="h-9 w-28 rounded-lg border border-navy/15 px-2 font-mono tracking-widest" />
                    <button type="submit" className="h-9 rounded-full bg-navy text-white text-xs font-semibold px-3">{pinDraft ? "Set PIN" : "Remove PIN"}</button>
                    <button type="button" onClick={() => { setPinEditing(null); setPinDraft(""); }} className="text-xs text-navy/60">Cancel</button>
                  </form>
                ) : (
                  <button onClick={() => setPinEditing(k._id)} className="text-sm font-semibold text-navy/70 hover:text-navy">{k.hasPin ? "Change PIN" : "Set a PIN"}</button>
                )}
                <button onClick={() => { if (confirm(`Remove ${k.name} from your family? Their history stays, but they'll disappear from every app.`)) run(() => archiveKid({ kidId: k._id })); }} className="text-sm text-red-700/70 hover:text-red-700">Remove</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Family-wide */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-navy">Family settings</h2>
        <div className="rounded-2xl bg-white border border-navy/10 p-5 grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
          <div>
            <div className="font-semibold text-navy">Family code</div>
            <div className="font-mono text-2xl font-bold tracking-widest text-navy mt-1">{settings?.familyCode ?? "—"}</div>
            <div className="text-navy/60 mt-1">The same code in every app. Kids enter it once at getsafefamily.com/play.</div>
          </div>
          <div>
            <div className="font-semibold text-navy">Timezone</div>
            <div className="text-navy mt-1">{settings?.timezone ?? "Detecting…"}</div>
            <div className="text-navy/60 mt-1">Allowed hours and daily limits use this clock in every app.</div>
          </div>
          <div className="md:col-span-2">
            <label className="font-semibold text-navy">Concern alerts go to
              <input
                value={emailsValue}
                onChange={(e) => setEmailsDraft(e.target.value)}
                onBlur={() => { if (emailsDraft !== null) run(async () => { await updateSettings({ alertEmails: emailsDraft.split(",").map((s) => s.trim()).filter(Boolean) }); setEmailsDraft(null); }); }}
                className="mt-1 w-full h-11 rounded-xl border border-navy/15 px-3"
                placeholder="you@example.com, partner@example.com"
              />
            </label>
            <div className="text-navy/60 mt-1">Comma-separated. Used by SafeStudy and SafeSpark when a search or chat raises a concern.</div>
          </div>
        </div>
      </section>
    </div>
  );
}
