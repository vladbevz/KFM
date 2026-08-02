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
import { setDriverActive } from "@/app/patron/chauffeurs/admin-actions";

export function DriverActiveToggle({
  driverId,
  active,
}: {
  driverId: string;
  active: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await setDriverActive(driverId, !active);
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
        <Button variant={active ? "destructive" : "outline"} size="sm">
          {active ? "Désactiver ce chauffeur" : "Réactiver ce chauffeur"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{active ? "Désactiver ce chauffeur ?" : "Réactiver ce chauffeur ?"}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-foreground/70">
          {active
            ? "Ce chauffeur ne pourra plus se connecter, mais son historique reste consultable. Confirmer ?"
            : "Ce chauffeur pourra à nouveau se connecter avec ses identifiants existants. Confirmer ?"}
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={pending}>
            Annuler
          </Button>
          <Button
            variant={active ? "destructive" : "default"}
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
