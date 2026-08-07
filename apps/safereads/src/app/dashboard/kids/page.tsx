"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { KidForm, KidFormValues } from "@/components/KidForm";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus, Pencil, Trash2, X, User, BookOpen, Shield, Library } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

const COLOR_MAP: Record<string, string> = {
  red: "bg-red-400",
  blue: "bg-blue-400",
  green: "bg-green-400",
  purple: "bg-purple-400",
  orange: "bg-orange-400",
  pink: "bg-pink-400",
  teal: "bg-teal-400",
  yellow: "bg-yellow-400",
};

type Kid = {
  _id: Id<"kids">;
  name: string;
  age?: number;
  color?: string;
  pin?: string;
  readingLevel?: string;
};

export default function KidsPage() {
  const { user: authUser, token } = useAuth();
  const currentUser = useQuery(
    api.users.currentUser,
    authUser?.email ? { email: authUser.email } : "skip"
  );
  const kids = useQuery(
    api.kids.listByUser,
    currentUser?._id ? { userId: currentUser._id, userToken: token ?? undefined } : "skip"
  );

  const createKid = useMutation(api.kids.create);
  const updateKid = useMutation(api.kids.update);
  const removeKid = useMutation(api.kids.remove);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Kid | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Id<"kids"> | null>(null);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(kid: Kid) {
    setEditing(kid);
    setDialogOpen(true);
  }

  async function handleSubmit(values: KidFormValues) {
    if (!currentUser) return;
    setSaving(true);
    try {
      if (editing) {
        await updateKid({
          kidId: editing._id,
          name: values.name,
          age: values.age,
          color: values.color,
          pin: values.pin,
          readingLevel: values.readingLevel,
          userToken: token ?? undefined,
        });
      } else {
        await createKid({
          userId: currentUser._id,
          name: values.name,
          age: values.age,
          color: values.color,
          pin: values.pin,
          readingLevel: values.readingLevel,
          userToken: token ?? undefined,
        });
      }
      setDialogOpen(false);
      setEditing(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(kidId: Id<"kids">) {
    setDeleting(kidId);
    try {
      await removeKid({ kidId, userToken: token ?? undefined });
    } finally {
      setDeleting(null);
    }
  }

  if (!currentUser) {
    return (
      <div className="py-12 text-center text-ink-500">Loading…</div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-navy">
            My Kids
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Manage your children and their reading wishlists.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-accent-700 px-4 py-2 text-sm font-medium text-accent-50 transition-colors hover:bg-accent-800"
        >
          <Plus className="h-4 w-4" />
          Add Child
        </button>
      </div>

      {kids === undefined ? (
        <div className="py-12 text-center text-ink-500">Loading…</div>
      ) : kids.length === 0 ? (
        <div className="rounded-2xl border border-brand-cream-2 bg-white p-8 text-center">
          <User className="mx-auto mb-3 h-10 w-10 text-ink-300" />
          <p className="text-ink-600">
            No kids added yet. Add a child to start building their reading
            wishlist.
          </p>
          <button
            onClick={openCreate}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent-700 px-4 py-2 text-sm font-medium text-accent-50 transition-colors hover:bg-accent-800"
          >
            <Plus className="h-4 w-4" />
            Add Your First Child
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {kids.map((kid: Kid) => (
            <KidCard
              key={kid._id}
              kid={kid}
              onEdit={() => openEdit(kid as Kid)}
              onDelete={() => handleDelete(kid._id)}
              deleting={deleting === kid._id}
            />
          ))}
        </div>
      )}

      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-ink-900/40 data-[state=open]:animate-in data-[state=open]:fade-in" />
          <Dialog.Content className="fixed left-1/2 top-1/2 max-h-[85vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-brand-cream p-6 shadow-xl focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95">
            <div className="mb-4 flex items-center justify-between">
              <Dialog.Title className="font-display text-xl font-bold text-brand-navy">
                {editing ? "Edit Child" : "Add Child"}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  className="rounded p-1 text-ink-400 hover:text-ink-600"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>
            <KidForm
              initialValues={
                editing
                  ? {
                      name: editing.name,
                      age: editing.age,
                      color: editing.color,
                      pin: editing.pin,
                      readingLevel: editing.readingLevel,
                    }
                  : undefined
              }
              onSubmit={handleSubmit}
              submitLabel={editing ? "Update" : "Add Child"}
              loading={saving}
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function KidCard({
  kid,
  onEdit,
  onDelete,
  deleting,
}: {
  kid: Kid;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const wishlistCount = useQuery(api.wishlists.countByKid, { kidId: kid._id });
  const approvedCount = useQuery(api.approvedBooks.countForKid, { kidId: kid._id });
  const colorClass = COLOR_MAP[kid.color || "purple"] || COLOR_MAP.purple;

  return (
    <div className="rounded-2xl border border-brand-cream-2 bg-white px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-full ${colorClass} text-sm font-bold text-white`}>
            {kid.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <span className="font-display font-medium text-brand-navy">{kid.name}</span>
            <div className="flex items-center gap-2 text-xs text-ink-400">
              {kid.age !== undefined && <span>Age {kid.age}</span>}
              {kid.pin && (
                <span className="flex items-center gap-0.5">
                  <Shield className="h-3 w-3" /> PIN
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={`/dashboard/kids/${kid._id}/books`}
            className="flex items-center gap-1 rounded px-2 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-50"
          >
            <Library className="h-3.5 w-3.5" />
            Books{approvedCount !== undefined ? ` (${approvedCount})` : ""}
          </Link>
          <Link
            href={`/dashboard/kids/${kid._id}/wishlist`}
            className="flex items-center gap-1 rounded px-2 py-1.5 text-xs font-medium text-accent-700 transition-colors hover:bg-brand-cream-2"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Wishlist{wishlistCount !== undefined ? ` (${wishlistCount})` : ""}
          </Link>
          <button
            onClick={onEdit}
            className="rounded p-1.5 text-ink-400 transition-colors hover:bg-brand-cream-2 hover:text-ink-600"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            disabled={deleting}
            className="rounded p-1.5 text-ink-400 transition-colors hover:bg-red-50 hover:text-verdict-warning disabled:opacity-50"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
