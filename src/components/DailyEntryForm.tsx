"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { saveDailyEntry, type DailyEntryFormState } from "@/app/chauffeur/actions";
import type { Database } from "@/types/database";

type DailyEntry = Database["public"]["Tables"]["daily_entries"]["Row"];

const initialState: DailyEntryFormState = { error: null };

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
        className="rounded-md border border-border bg-background px-3 py-2 text-foreground tabular-nums outline-none focus:border-km"
      />
    </div>
  );
}

function SubmitButton({ isUpdate }: { isUpdate: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 rounded-md bg-km px-4 py-2 font-medium text-black disabled:opacity-60"
    >
      {pending
        ? "Enregistrement..."
        : isUpdate
          ? "Mettre à jour"
          : "Enregistrer"}
    </button>
  );
}

export function DailyEntryForm({
  existingEntry,
  onSaved,
  onCancel,
}: {
  existingEntry: DailyEntry | null;
  onSaved?: (entry: DailyEntry) => void;
  onCancel?: () => void;
}) {
  const [state, formAction] = useFormState(saveDailyEntry, initialState);

  useEffect(() => {
    if (state.entry) onSaved?.(state.entry);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-6">

      <div className="flex flex-col gap-1">
        <label
          htmlFor="vehicle_registration"
          className="text-sm text-foreground/70"
        >
          Immatriculation du véhicule
        </label>
        <input
          id="vehicle_registration"
          name="vehicle_registration"
          type="text"
          required
          defaultValue={existingEntry?.vehicle_registration ?? ""}
          className="rounded-md border border-border bg-background px-3 py-2 uppercase text-foreground outline-none focus:border-km"
        />
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground/80">
          Kilométrage compteur
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="KM départ"
            name="km_depart"
            type="number"
            required
            defaultValue={existingEntry?.km_depart}
          />
          <Field
            label="KM arrivée"
            name="km_arrivee"
            type="number"
            required
            defaultValue={existingEntry?.km_arrivee}
          />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground/80">
          Tournée — Matin
        </h2>
        <div className="flex flex-col gap-3">
          <Field
            label="N° tournée"
            name="matin_tournee_numero"
            defaultValue={existingEntry?.matin_tournee_numero}
          />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Nbre poses livraison"
              name="matin_poses_livraison"
              type="number"
              defaultValue={existingEntry?.matin_poses_livraison}
            />
            <Field
              label="Nbre poses enlèvement"
              name="matin_poses_enlevement"
              type="number"
              defaultValue={existingEntry?.matin_poses_enlevement}
            />
          </div>
          <Field
            label="N° courses / affret"
            name="matin_courses"
            defaultValue={existingEntry?.matin_courses}
          />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground/80">
          Tournée — Après-midi
        </h2>
        <div className="flex flex-col gap-3">
          <Field
            label="N° tournée"
            name="apres_midi_tournee_numero"
            defaultValue={existingEntry?.apres_midi_tournee_numero}
          />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Nbre poses livraison"
              name="apres_midi_poses_livraison"
              type="number"
              defaultValue={existingEntry?.apres_midi_poses_livraison}
            />
            <Field
              label="Nbre poses enlèvement"
              name="apres_midi_poses_enlevement"
              type="number"
              defaultValue={existingEntry?.apres_midi_poses_enlevement}
            />
          </div>
          <Field
            label="N° courses / affret"
            name="apres_midi_courses"
            defaultValue={existingEntry?.apres_midi_courses}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="anomalie_tournee" className="text-sm text-foreground/70">
          Anomalie(s) à signaler lors de la tournée
        </label>
        <textarea
          id="anomalie_tournee"
          name="anomalie_tournee"
          rows={3}
          defaultValue={existingEntry?.anomalie_tournee ?? ""}
          className="rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-km"
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
          defaultValue={existingEntry?.anomalie_vehicule ?? ""}
          className="rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-km"
        />
      </div>

      {state.error && (
        <p className="text-sm text-red-400">{state.error}</p>
      )}

      <div className="flex gap-3">
        <SubmitButton isUpdate={Boolean(existingEntry)} />
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="mt-2 rounded-md border border-border px-4 py-2 font-medium text-foreground/70"
          >
            Annuler
          </button>
        )}
      </div>
    </form>
  );
}
