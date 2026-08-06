"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { deleteVehicleForever } from "@/app/patron/vehicules/actions";

export function VehicleDeleteForeverDialog({ vehicleId, plate }: { vehicleId: string; plate: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const matches = typed === plate;

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await deleteVehicleForever(vehicleId, typed);
      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
        router.push("/patron/vehicules");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setTyped("");
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-destructive text-destructive">
          Supprimer définitivement
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supprimer ce véhicule définitivement ?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-foreground/70">
          Action irréversible — n&apos;utilise ceci que pour un véhicule créé par erreur, sans historique
          (pleins, réparations). Pour un véhicule qui a vraiment servi, retire-le de la flotte plutôt
          que de le supprimer.
        </p>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirm_plate">
            Tape l&apos;immatriculation <span className="font-semibold">{plate}</span> pour confirmer
          </Label>
          <Input
            id="confirm_plate"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={pending}>
            Annuler
          </Button>
          <Button variant="destructive" size="sm" onClick={handleConfirm} disabled={pending || !matches}>
            {pending ? "..." : "Supprimer définitivement"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
