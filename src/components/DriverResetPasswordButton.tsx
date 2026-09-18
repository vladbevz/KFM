"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CopyButton } from "@/components/CopyButton";
import { resetDriverPassword } from "@/app/patron/chauffeurs/admin-actions";

export function DriverResetPasswordButton({ driverId }: { driverId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState<string | null>(null);

  function resetAndClose() {
    setOpen(false);
    setNewPassword(null);
    setError(null);
  }

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await resetDriverPassword(driverId);
      if (result.error) {
        setError(result.error);
      } else {
        setNewPassword(result.password);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : resetAndClose())}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Réinitialiser le mot de passe
        </Button>
      </DialogTrigger>
      <DialogContent>
        {newPassword ? (
          <>
            <DialogHeader>
              <DialogTitle>Nouveau mot de passe généré</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <p className="text-sm text-foreground/70">
                Transmettez ce mot de passe au chauffeur maintenant — il ne sera plus affiché
                après fermeture de cette fenêtre.
              </p>
              <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-background p-3">
                <p className="text-sm font-medium tabular-nums text-foreground">{newPassword}</p>
                <CopyButton value={newPassword} />
              </div>
              <Button type="button" onClick={resetAndClose}>
                Fermer
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Réinitialiser le mot de passe ?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-foreground/70">
              Un nouveau mot de passe sera généré, l&apos;ancien ne fonctionnera plus. Continuer ?
            </p>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={resetAndClose} disabled={pending}>
                Annuler
              </Button>
              <Button size="sm" onClick={handleConfirm} disabled={pending}>
                {pending ? "..." : "Confirmer"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
