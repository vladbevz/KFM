"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DocumentDeleteButton({
  docName,
  onDelete,
}: {
  docName: string;
  onDelete: () => Promise<{ error: string | null }>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await onDelete();
      if (result.error) setError(result.error);
      else setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={`Supprimer ${docName}`}
          className="border-destructive text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" strokeWidth={1.8} />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supprimer ce document ?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-foreground/70">
          {docName} — cette action est irréversible.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={pending}>
            Annuler
          </Button>
          <Button variant="destructive" size="sm" onClick={handleConfirm} disabled={pending}>
            {pending ? "..." : "Supprimer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
