"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { saveSector, type SectorFormState } from "@/app/patron/secteurs/actions";
import type { Database, PaymentType } from "@/types/database";

type Sector = Database["public"]["Tables"]["sectors"]["Row"];

const PAYMENT_LABELS: Record<PaymentType, string> = {
  a_la_pose: "À la pose",
  forfait: "Forfait",
};

const initialState: SectorFormState = { error: null };

function SubmitButton({ isUpdate }: { isUpdate: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Enregistrement..." : isUpdate ? "Mettre à jour" : "Créer"}
    </Button>
  );
}

export function SectorFormDialog({
  sector,
  currentPrice,
  trigger,
}: {
  sector?: Sector;
  // Prix par pose actuel (Module A), vient de sector_prices — table séparée
  // réservée au patron, jamais lisible par un chauffeur (cf. RLS is_boss()).
  currentPrice?: number | null;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [paymentType, setPaymentType] = useState<PaymentType>(
    sector?.payment_type ?? "a_la_pose",
  );
  const [state, formAction] = useFormState(saveSector, initialState);
  const submittedOnce = useRef(false);

  useEffect(() => {
    if (submittedOnce.current && state.error === null) {
      setOpen(false);
      submittedOnce.current = false;
    }
  }, [state]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setPaymentType(sector?.payment_type ?? "a_la_pose");
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{sector ? `Modifier ${sector.code}` : "Nouvelle tournée"}</DialogTitle>
        </DialogHeader>

        <form
          action={(formData) => {
            submittedOnce.current = true;
            formAction(formData);
          }}
          className="flex flex-col gap-4"
        >
          {sector && <input type="hidden" name="id" value={sector.id} />}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="code">Code tournée</Label>
            <Input
              id="code"
              name="code"
              placeholder="A12"
              required
              defaultValue={sector?.code}
              className="uppercase"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment_type">Modèle de paiement</Label>
            <Select
              name="payment_type"
              value={paymentType}
              onValueChange={(v) => setPaymentType(v as PaymentType)}
            >
              <SelectTrigger id="payment_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PAYMENT_LABELS) as PaymentType[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {PAYMENT_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {paymentType === "a_la_pose" && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rentability_target">Objectif de rentabilité</Label>
                <Input
                  id="rentability_target"
                  name="rentability_target"
                  type="number"
                  min={0}
                  required
                  defaultValue={sector?.rentability_target ?? ""}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="price_per_pose">Prix par pose (€)</Label>
                <Input
                  id="price_per_pose"
                  name="price_per_pose"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Non renseigné"
                  defaultValue={currentPrice ?? ""}
                />
                <p className="text-xs text-foreground-muted">
                  Prix payé par Geodis par pose. Un changement ne s&apos;applique qu&apos;aux tournées
                  clôturées après la modification — l&apos;historique déjà calculé n&apos;est jamais
                  recalculé.
                </p>
              </div>
            </>
          )}

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <SubmitButton isUpdate={Boolean(sector)} />
        </form>
      </DialogContent>
    </Dialog>
  );
}
