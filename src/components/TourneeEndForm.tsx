"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { completeTournee, updateTournee, type DailyEntryFormState } from "@/app/chauffeur/actions";
import type { Database, TourneeType } from "@/types/database";

type DailyEntry = Database["public"]["Tables"]["daily_entries"]["Row"];

const initialState: DailyEntryFormState = { error: null };

const TOURNEE_TYPES: { value: TourneeType; label: string }[] = [
  { value: "journee", label: "Journée" },
  { value: "demi_journee", label: "Demi-journée" },
];

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number | null;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm text-foreground/70">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        inputMode={type === "number" ? "numeric" : undefined}
        defaultValue={defaultValue ?? ""}
        required={required}
        className="rounded-md border border-border bg-background px-3 py-2 text-foreground tabular-nums outline-none focus:border-foreground"
      />
    </div>
  );
}

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-km px-4 py-3 font-medium text-accent-ink disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

export function TourneeEndForm({
  entry,
  mode = "complete",
  onCompleted,
}: {
  entry: DailyEntry;
  mode?: "complete" | "edit";
  onCompleted: (entry: DailyEntry) => void;
}) {
  const [state, formAction] = useFormState(
    mode === "edit" ? updateTournee : completeTournee,
    initialState,
  );

  useEffect(() => {
    if (state.entry) onCompleted(state.entry);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="entry_id" value={entry.id} />

      <div className="flex flex-col gap-1">
        <label htmlFor="tournee_type" className="text-sm text-foreground/70">
          Type
        </label>
        <select
          id="tournee_type"
          name="tournee_type"
          required
          defaultValue={entry.tournee_type ?? "journee"}
          className="rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-foreground"
        >
          {TOURNEE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground/80">Kilométrage</h2>
        <div className={mode === "edit" ? "grid grid-cols-2 gap-3" : undefined}>
          {mode === "edit" && (
            <Field
              label="Km départ"
              name="km_depart"
              type="number"
              defaultValue={entry.km_depart}
              required
            />
          )}
          <Field
            label="Km retour"
            name="km_arrivee"
            type="number"
            defaultValue={mode === "edit" ? entry.km_arrivee : undefined}
            required
          />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground/80">Poses</h2>
        <div className="grid grid-cols-3 gap-3">
          <Field
            label="Livrées"
            name="poses_delivered"
            type="number"
            defaultValue={mode === "edit" ? entry.poses_delivered : undefined}
          />
          <Field
            label="Avec avarie"
            name="poses_damaged"
            type="number"
            defaultValue={mode === "edit" ? entry.poses_damaged : undefined}
          />
          <Field
            label="Non livrées"
            name="poses_not_delivered"
            type="number"
            defaultValue={mode === "edit" ? entry.poses_not_delivered : undefined}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Enlèvements"
          name="poses_enlevement"
          type="number"
          defaultValue={mode === "edit" ? entry.poses_enlevement : undefined}
        />
        <Field
          label="N° courses (si applicable)"
          name="courses"
          defaultValue={mode === "edit" ? entry.courses : undefined}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="anomalie_tournee" className="text-sm text-foreground/70">
          Anomalie(s) à signaler lors de la tournée
        </label>
        <textarea
          id="anomalie_tournee"
          name="anomalie_tournee"
          rows={3}
          defaultValue={(mode === "edit" ? entry.anomalie_tournee : undefined) ?? ""}
          className="rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-foreground"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="anomalie_vehicule" className="text-sm text-foreground/70">
          Anomalie(s) à signaler sur le véhicule
        </label>
        <textarea
          id="anomalie_vehicule"
          name="anomalie_vehicule"
          rows={3}
          defaultValue={(mode === "edit" ? entry.anomalie_vehicule : undefined) ?? ""}
          className="rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-foreground"
        />
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <SubmitButton
        label={mode === "edit" ? "Enregistrer les corrections" : "Terminer la tournée"}
        pendingLabel="Enregistrement..."
      />
    </form>
  );
}
