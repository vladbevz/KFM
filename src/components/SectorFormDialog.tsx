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
import type { Database, PaymentModel } from "@/types/database";

type Sector = Database["public"]["Tables"]["sectors"]["Row"];

const PAYMENT_LABELS: Record<PaymentModel, string> = {
  qty_am_qty_pm: "Quantité matin + quantité après-midi",
  qty_am_forfait_pm: "Quantité matin + forfait après-midi",
  forfait_day: "Forfait journée",
  qty_day: "Quantité journée",
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
  trigger,
}: {
  sector?: Sector;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [paymentType, setPaymentType] = useState<PaymentModel>(
    sector?.payment_type ?? "qty_am_qty_pm",
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
        if (next) setPaymentType(sector?.payment_type ?? "qty_am_qty_pm");
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{sector ? `Modifier ${sector.code}` : "Nouveau secteur"}</DialogTitle>
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
            <Label htmlFor="code">Code secteur</Label>
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
              onValueChange={(v) => setPaymentType(v as PaymentModel)}
            >
              <SelectTrigger id="payment_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PAYMENT_LABELS) as PaymentModel[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {PAYMENT_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(paymentType === "qty_am_qty_pm" || paymentType === "qty_am_forfait_pm") && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="morning_threshold">Seuil de poses — matin</Label>
              <Input
                id="morning_threshold"
                name="morning_threshold"
                type="number"
                min={0}
                required
                defaultValue={sector?.morning_threshold ?? ""}
              />
            </div>
          )}

          {paymentType === "qty_am_qty_pm" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="afternoon_threshold">Seuil de poses — après-midi</Label>
              <Input
                id="afternoon_threshold"
                name="afternoon_threshold"
                type="number"
                min={0}
                required
                defaultValue={sector?.afternoon_threshold ?? ""}
              />
            </div>
          )}

          {paymentType === "qty_day" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="day_threshold">Seuil de poses — journée</Label>
              <Input
                id="day_threshold"
                name="day_threshold"
                type="number"
                min={0}
                required
                defaultValue={sector?.day_threshold ?? ""}
              />
            </div>
          )}

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <SubmitButton isUpdate={Boolean(sector)} />
        </form>
      </DialogContent>
    </Dialog>
  );
}
