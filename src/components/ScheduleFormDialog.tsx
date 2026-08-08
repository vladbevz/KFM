"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  deleteScheduleEntry,
  saveScheduleEntry,
  type ScheduleFormState,
} from "@/app/patron/calendrier/actions";
import { TYPE_LABELS } from "@/lib/schedule";
import type { AssignmentType, Database } from "@/types/database";

type ScheduleRow = Database["public"]["Tables"]["schedule"]["Row"];
type Sector = Database["public"]["Tables"]["sectors"]["Row"];
type Driver = { id: string; full_name: string };

export type ScheduleDialogState =
  // driverId préempli : ouvert depuis le panneau d'aperçu du jour pour un
  // chauffeur qui n'a pas encore d'affectation ce jour-là (le sélecteur
  // Chauffeur ouvert reste réservé au bouton "Ajouter une affectation").
  | { mode: "create"; date: string; driverId?: string }
  | { mode: "edit"; entry: ScheduleRow };

const initialState: ScheduleFormState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Enregistrement..." : "Enregistrer"}
    </Button>
  );
}

export function ScheduleFormDialog({
  open,
  onOpenChange,
  state,
  drivers,
  sectors,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: ScheduleDialogState | null;
  drivers: Driver[];
  sectors: Sector[];
}) {
  const [formState, formAction] = useFormState(saveScheduleEntry, initialState);
  const [type, setType] = useState<AssignmentType>(
    state?.mode === "edit" ? state.entry.type : "tournee",
  );
  const submittedOnce = useRef(false);
  const [deletePending, startDelete] = useTransition();

  useEffect(() => {
    if (state) setType(state.mode === "edit" ? state.entry.type : "tournee");
  }, [state]);

  useEffect(() => {
    if (submittedOnce.current && formState.error === null) {
      onOpenChange(false);
      submittedOnce.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formState]);

  if (!state) return null;

  const date = state.mode === "create" ? state.date : state.entry.date;
  const presetDriverId = state.mode === "create" ? state.driverId : state.entry.driver_id;
  const driverName = presetDriverId
    ? (drivers.find((d) => d.id === presetDriverId)?.full_name ?? "Chauffeur")
    : null;
  // Sélecteur ouvert uniquement pour une création "libre" (bouton "Ajouter
  // une affectation") ; venant du panneau d'aperçu (driverId préempli) ou en
  // édition, le chauffeur est fixé et affiché en lecture seule.
  const driverLocked = Boolean(driverName);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {driverLocked ? `${driverName} — ${date}` : `Nouvelle affectation — ${date}`}
          </DialogTitle>
        </DialogHeader>

        <form
          action={(formData) => {
            submittedOnce.current = true;
            formAction(formData);
          }}
          className="flex flex-col gap-4"
        >
          {/* Une tournée se planifie jour par jour ; un congé/absence créé
              depuis zéro peut couvrir une plage — mais on n'étend jamais
              une entrée déjà existante (édition) sur plusieurs jours : elle
              reste ce qu'elle est, un seul jour. */}
          {state.mode === "create" && (type === "conge" || type === "absence") ? (
            <div className="flex gap-3">
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="date_from">Du</Label>
                <input
                  id="date_from"
                  name="date_from"
                  type="date"
                  required
                  defaultValue={date}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="date_to">Au</Label>
                <input
                  id="date_to"
                  name="date_to"
                  type="date"
                  required
                  defaultValue={date}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
            </div>
          ) : (
            <input type="hidden" name="date" value={date} />
          )}

          {driverLocked ? (
            <input type="hidden" name="driver_id" value={presetDriverId} />
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="driver_id">Chauffeur</Label>
              <select
                id="driver_id"
                name="driver_id"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="">Sélectionner...</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="type">Statut</Label>
            <Select name="type" value={type} onValueChange={(v) => setType(v as AssignmentType)}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TYPE_LABELS) as AssignmentType[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {TYPE_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type === "tournee" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sector_id">Tournée</Label>
              <select
                id="sector_id"
                name="sector_id"
                defaultValue={state.mode === "edit" ? (state.entry.sector_id ?? "") : ""}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="">Aucune tournée</option>
                {sectors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="note">Note (optionnel)</Label>
            <textarea
              id="note"
              name="note"
              rows={2}
              defaultValue={state.mode === "edit" ? (state.entry.note ?? "") : ""}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>

          {formState.error && <p className="text-sm text-destructive">{formState.error}</p>}

          <div className="flex items-center justify-between gap-2">
            {state.mode === "edit" ? (
              <button
                type="button"
                disabled={deletePending}
                onClick={() =>
                  startDelete(async () => {
                    await deleteScheduleEntry(state.entry.id);
                    onOpenChange(false);
                  })
                }
                className="text-sm text-destructive disabled:opacity-60"
              >
                {deletePending ? "Suppression..." : "Supprimer"}
              </button>
            ) : (
              <span />
            )}
            <SubmitButton />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
