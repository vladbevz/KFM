"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
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
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-base text-foreground/70">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        inputMode={type === "number" ? "numeric" : undefined}
        defaultValue={defaultValue ?? ""}
        required={required}
        className="rounded-md border border-border bg-background px-4 py-3.5 text-base text-foreground tabular-nums outline-none focus:border-foreground"
      />
    </div>
  );
}

function SubmitButton({
  label,
  pendingLabel,
  disabled = false,
}: {
  label: string;
  pendingLabel: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="flex items-center justify-center gap-2 rounded-md bg-km px-4 py-4 text-lg font-semibold text-accent-ink disabled:opacity-60"
    >
      {pending && <Loader2 className="h-5 w-5 animate-spin" />}
      {pending ? pendingLabel : label}
    </button>
  );
}

function intOrZero(value: string): number {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : 0;
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

  // Module B (anti-triche) : le détail doit correspondre exactement au total
  // annoncé par le dispatch au démarrage (écran 1). Contrôlé en direct ici
  // (champs pilotés plutôt que non contrôlés) pour bloquer le bouton avant
  // même la tentative de soumission — pas seulement rejeter après coup.
  // Uniquement en mode "complete" : une correction (mode "edit") ne doit pas
  // se retrouver bloquée sans issue, cf. décision produit.
  const [delivered, setDelivered] = useState(mode === "edit" ? String(entry.poses_delivered ?? "") : "");
  const [damaged, setDamaged] = useState(mode === "edit" ? String(entry.poses_damaged ?? "") : "");
  const [notDelivered, setNotDelivered] = useState(
    mode === "edit" ? String(entry.poses_not_delivered ?? "") : "",
  );
  const [enlevement, setEnlevement] = useState(mode === "edit" ? String(entry.poses_enlevement ?? "") : "");

  const detailTotal = intOrZero(delivered) + intOrZero(damaged) + intOrZero(notDelivered) + intOrZero(enlevement);
  const declaredTotal = entry.dispatch_declared_total;
  const hasMismatch = mode === "complete" && declaredTotal !== null && detailTotal !== declaredTotal;

  useEffect(() => {
    if (state.entry) {
      toast.success(mode === "edit" ? "Modifications enregistrées !" : "Tournée terminée !");
      onCompleted(state.entry);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-7">
      <input type="hidden" name="entry_id" value={entry.id} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="tournee_type" className="text-base text-foreground/70">
          Type
        </label>
        <select
          id="tournee_type"
          name="tournee_type"
          required
          defaultValue={entry.tournee_type ?? "journee"}
          className="rounded-md border border-border bg-background px-4 py-4 text-base text-foreground outline-none focus:border-foreground"
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
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground/80">Poses</h2>
          {mode === "complete" && declaredTotal !== null && (
            <p className="text-sm tabular-nums text-foreground/60">
              Annoncé par le dispatch : <span className="font-medium">{declaredTotal}</span>
            </p>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="poses_delivered" className="text-base text-foreground/70">
              Livrées
            </label>
            <input
              id="poses_delivered"
              name="poses_delivered"
              type="number"
              inputMode="numeric"
              value={delivered}
              onChange={(e) => setDelivered(e.target.value)}
              className="rounded-md border border-border bg-background px-4 py-3.5 text-base text-foreground tabular-nums outline-none focus:border-foreground"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="poses_damaged" className="text-base text-foreground/70">
              Avec avarie
            </label>
            <input
              id="poses_damaged"
              name="poses_damaged"
              type="number"
              inputMode="numeric"
              value={damaged}
              onChange={(e) => setDamaged(e.target.value)}
              className="rounded-md border border-border bg-background px-4 py-3.5 text-base text-foreground tabular-nums outline-none focus:border-foreground"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="poses_not_delivered" className="text-base text-foreground/70">
              Non livrées
            </label>
            <input
              id="poses_not_delivered"
              name="poses_not_delivered"
              type="number"
              inputMode="numeric"
              value={notDelivered}
              onChange={(e) => setNotDelivered(e.target.value)}
              className="rounded-md border border-border bg-background px-4 py-3.5 text-base text-foreground tabular-nums outline-none focus:border-foreground"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="poses_enlevement" className="text-base text-foreground/70">
            Enlèvements
          </label>
          <input
            id="poses_enlevement"
            name="poses_enlevement"
            type="number"
            inputMode="numeric"
            value={enlevement}
            onChange={(e) => setEnlevement(e.target.value)}
            className="rounded-md border border-border bg-background px-4 py-3.5 text-base text-foreground tabular-nums outline-none focus:border-foreground"
          />
        </div>
        <Field
          label="N° courses (si applicable)"
          name="courses"
          defaultValue={mode === "edit" ? entry.courses : undefined}
        />
      </div>

      {hasMismatch && (
        <p className="rounded-md border border-destructive/30 bg-[#FBE7E5] px-4 py-3 text-sm text-destructive">
          Le détail ({detailTotal}) ne correspond pas au total annoncé au départ ({declaredTotal}).
          Vérifiez votre saisie.
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="anomalie_tournee" className="text-base text-foreground/70">
          Anomalie(s) à signaler lors de la tournée
        </label>
        <textarea
          id="anomalie_tournee"
          name="anomalie_tournee"
          rows={3}
          defaultValue={(mode === "edit" ? entry.anomalie_tournee : undefined) ?? ""}
          className="rounded-md border border-border bg-background px-4 py-3 text-base text-foreground outline-none focus:border-foreground"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="anomalie_vehicule" className="text-base text-foreground/70">
          Anomalie(s) à signaler sur le véhicule
        </label>
        <textarea
          id="anomalie_vehicule"
          name="anomalie_vehicule"
          rows={3}
          defaultValue={(mode === "edit" ? entry.anomalie_vehicule : undefined) ?? ""}
          className="rounded-md border border-border bg-background px-4 py-3 text-base text-foreground outline-none focus:border-foreground"
        />
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <SubmitButton
        label={mode === "edit" ? "Enregistrer les corrections" : "Terminer la tournée"}
        pendingLabel="Enregistrement..."
        disabled={hasMismatch}
      />
    </form>
  );
}
