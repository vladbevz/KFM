"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { saveVehicleRepair, type RepairFormState } from "@/app/patron/vehicules/actions";
import { compressImage } from "@/lib/image";

const initialState: RepairFormState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Enregistrement..." : "Enregistrer"}
    </Button>
  );
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function VehicleRepairDialog({
  vehicleId,
  openIssues,
  trigger,
}: {
  vehicleId: string;
  openIssues: { id: string; description: string | null; reported_at: string }[];
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(saveVehicleRepair, initialState);
  const submittedOnce = useRef(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const file = formData.get("file");
    if (file instanceof File && file.size > 0 && file.type.startsWith("image/")) {
      const compressed = await compressImage(file);
      formData.set("file", compressed, file.name.replace(/\.\w+$/, ".jpg"));
    }
    submittedOnce.current = true;
    formAction(formData);
  }

  useEffect(() => {
    if (submittedOnce.current && state.error === null) {
      setOpen(false);
      submittedOnce.current = false;
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter une réparation</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input type="hidden" name="vehicle_id" value={vehicleId} />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              name="description"
              rows={3}
              required
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cost">Coût (€)</Label>
              <Input id="cost" name="cost" type="number" step="0.01" min="0" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="repaired_at">Date</Label>
              <Input id="repaired_at" name="repaired_at" type="date" defaultValue={todayISO()} required />
            </div>
          </div>

          {openIssues.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="vehicle_issue_id">Lier à un signalement (optionnel)</Label>
              <select
                id="vehicle_issue_id"
                name="vehicle_issue_id"
                defaultValue=""
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground"
              >
                <option value="">Aucun</option>
                {openIssues.map((issue) => (
                  <option key={issue.id} value={issue.id}>
                    {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(
                      new Date(issue.reported_at),
                    )}
                    {issue.description ? ` — ${issue.description.slice(0, 40)}` : ""}
                  </option>
                ))}
              </select>
              <p className="text-xs text-foreground-muted">
                Sera automatiquement marqué comme résolu.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="file">Facture (optionnel)</Label>
            <input
              id="file"
              name="file"
              type="file"
              accept="image/*,application/pdf"
              className="text-sm text-foreground/70 file:mr-3 file:rounded-md file:border-0 file:bg-background file:px-3 file:py-2 file:text-foreground"
            />
          </div>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <SubmitButton />
        </form>
      </DialogContent>
    </Dialog>
  );
}
