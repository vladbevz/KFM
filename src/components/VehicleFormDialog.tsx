"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { saveVehicle, type VehicleFormState } from "@/app/patron/vehicules/actions";
import type { Database } from "@/types/database";

type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];

const initialState: VehicleFormState = { error: null };

function SubmitButton({ isUpdate }: { isUpdate: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Enregistrement..." : isUpdate ? "Mettre à jour" : "Créer"}
    </Button>
  );
}

export function VehicleFormDialog({
  vehicle,
  trigger,
}: {
  vehicle?: Vehicle;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(saveVehicle, initialState);
  const submittedOnce = useRef(false);

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
          <DialogTitle>{vehicle ? `Modifier ${vehicle.plate}` : "Nouveau véhicule"}</DialogTitle>
        </DialogHeader>

        <form
          action={(formData) => {
            submittedOnce.current = true;
            formAction(formData);
          }}
          className="flex flex-col gap-4"
        >
          {vehicle && <input type="hidden" name="id" value={vehicle.id} />}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="plate">Immatriculation</Label>
            <Input
              id="plate"
              name="plate"
              placeholder="AB-123-CD"
              required
              defaultValue={vehicle?.plate}
              className="uppercase"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="label">Repère interne (optionnel)</Label>
            <Input id="label" name="label" placeholder="Camion 1" defaultValue={vehicle?.label ?? ""} />
          </div>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <SubmitButton isUpdate={Boolean(vehicle)} />
        </form>
      </DialogContent>
    </Dialog>
  );
}
