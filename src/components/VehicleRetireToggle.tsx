"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { retireVehicle } from "@/app/patron/vehicules/actions";

export function VehicleRetireToggle({
  vehicleId,
  retired,
}: {
  vehicleId: string;
  retired: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await retireVehicle(vehicleId, !retired);
      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={retired ? "outline" : "destructive"} size="sm">
          {retired ? "Réactiver ce véhicule" : "Retirer ce véhicule de la flotte"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {retired ? "Réactiver ce véhicule ?" : "Retirer ce véhicule de la flotte ?"}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-foreground/70">
          {retired
            ? "Ce véhicule redeviendra sélectionnable pour les tournées, pleins et signalements de panne."
            : "Ce véhicule n'apparaîtra plus dans les sélecteurs (tournée, plein, panne), mais son historique et son coût total restent consultables. Confirmer ?"}
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={pending}>
            Annuler
          </Button>
          <Button
            variant={retired ? "default" : "destructive"}
            size="sm"
            onClick={handleConfirm}
            disabled={pending}
          >
            {pending ? "..." : "Confirmer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
