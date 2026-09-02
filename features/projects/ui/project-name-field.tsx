"use client";

import { Check, Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, startTransition, useId, useState } from "react";
import { RoundButton } from "@/components/design-system/pill";

/**
 * The Project's name with an inline rename: pencil, an underline field,
 * Enter or the check to save, Escape or the cross to leave it.
 */
export function ProjectNameField({
  name,
  onRenamed,
  projectId
}: {
  name: string;
  onRenamed: (name: string) => void;
  projectId: string;
}) {
  const router = useRouter();
  const inputId = useId();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEditing() {
    setDraft(name);
    setError(null);
    setEditing(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = draft.trim();
    if (!next || next === name) {
      setEditing(false);
      return;
    }
    setIsPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        body: JSON.stringify({ name: next }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH"
      });
      const payload = (await response.json().catch(() => null)) as {
        project?: { name: string };
        error?: string;
      } | null;
      if (!response.ok || !payload?.project) {
        setError(payload?.error ?? "Der Name konnte nicht gespeichert werden.");
        return;
      }
      onRenamed(payload.project.name);
      setEditing(false);
      startTransition(() => router.refresh());
    } catch {
      setError("Die Verbindung wurde unterbrochen.");
    } finally {
      setIsPending(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex min-w-0 items-center gap-2">
        <p className="m-0 min-w-0 truncate text-caption text-ink" title={name}>
          {name}
        </p>
        <RoundButton
          aria-label="Projekt umbenennen"
          className="-my-2 border-transparent text-graphite hover:text-ink"
          onClick={startEditing}
          size="sm"
          tone="quiet"
        >
          <Pencil aria-hidden="true" size={12} strokeWidth={1.5} />
        </RoundButton>
      </div>
    );
  }

  return (
    <form className="flex min-w-0 flex-col gap-1" onSubmit={save}>
      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor={inputId}>
          Name des Projekts
        </label>
        <input
          autoFocus
          className="h-9 min-w-0 flex-1 border-0 border-b border-hairline bg-transparent px-0 text-caption text-ink outline-none transition-colors duration-state ease-signature focus:border-ink focus-visible:outline-none"
          disabled={isPending}
          id={inputId}
          maxLength={120}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setEditing(false);
          }}
          value={draft}
        />
        <RoundButton
          aria-label="Namen speichern"
          disabled={isPending || !draft.trim()}
          size="sm"
          tone="outline"
          type="submit"
        >
          <Check aria-hidden="true" size={12} strokeWidth={1.5} />
        </RoundButton>
        <RoundButton
          aria-label="Umbenennen abbrechen"
          disabled={isPending}
          onClick={() => setEditing(false)}
          size="sm"
          tone="quiet"
        >
          <X aria-hidden="true" size={12} strokeWidth={1.5} />
        </RoundButton>
      </div>
      {error && <p className="m-0 text-caption text-ink">{error}</p>}
    </form>
  );
}
