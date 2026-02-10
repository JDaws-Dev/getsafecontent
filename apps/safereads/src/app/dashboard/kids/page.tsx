"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { KidForm, KidFormValues } from "@/components/KidForm";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus, Pencil, Trash2, X, User, BookOpen } from "lucide-react";
import Link from "next/link";

type Kid = {
  _id: Id<"kids">;
  name: string;
  age?: number;
};

export default function KidsPage() {
  const currentUser = useQuery(api.users.currentUser);
  const kids = useQuery(
    api.kids.listByUser,
    currentUser?._id ? { userId: currentUser._id } : "skip"
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
        });
      } else {
        await createKid({
          userId: currentUser._id,
          name: values.name,
          age: values.age,
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
      await removeKid({ kidId });
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
          <h1 className="font-serif text-2xl font-bold text-ink-900">
            My Kids
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Manage your children and their reading wishlists.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-parchment-700 px-4 py-2 text-sm font-medium text-parchment-50 transition-colors hover:bg-parchment-800"
        >
          <Plus className="h-4 w-4" />
          Add Child
        </button>
      </div>

      {kids === undefined ? (
        <div className="py-12 text-center text-ink-500">Loading…</div>
      ) : kids.length === 0 ? (
        <div className="rounded-lg border border-parchment-200 bg-white p-8 text-center">
          <User className="mx-auto mb-3 h-10 w-10 text-ink-300" />
          <p className="text-ink-600">
            No kids added yet. Add a child to start building their reading
            wishlist.
          </p>
          <button
            onClick={openCreate}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-parchment-700 px-4 py-2 text-sm font-medium text-parchment-50 transition-colors hover:bg-parchment-800"
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
          <Dialog.Content className="fixed left-1/2 top-1/2 max-h-[85vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-parchment-50 p-6 shadow-xl focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95">
            <div className="mb-4 flex items-center justify-between">
              <Dialog.Title className="font-serif text-xl font-bold text-ink-900">
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

  return (
    <div className="rounded-lg border border-parchment-200 bg-white px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-parchment-100">
            <User className="h-4 w-4 text-parchment-600" />
          </div>
          <div>
            <span className="font-medium text-ink-900">{kid.name}</span>
            {kid.age !== undefined && (
              <div className="text-xs text-ink-400">Age {kid.age}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={`/dashboard/kids/${kid._id}/wishlist`}
            className="flex items-center gap-1 rounded px-2 py-1.5 text-xs font-medium text-parchment-700 transition-colors hover:bg-parchment-100"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Wishlist{wishlistCount !== undefined ? ` (${wishlistCount})` : ""}
          </Link>
          <button
            onClick={onEdit}
            className="rounded p-1.5 text-ink-400 transition-colors hover:bg-parchment-100 hover:text-ink-600"
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
