"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  approveCongeRequest,
  rejectCongeRequest,
  type CongeRequestActionState,
} from "@/app/patron/calendrier/actions";

const initialState: CongeRequestActionState = { error: null };

function ActionButton({
  label,
  pendingLabel,
  variant,
}: {
  label: string;
  pendingLabel: string;
  variant: "default" | "outline";
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant={variant} disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

export function CongeRequestReviewButtons({ id }: { id: string }) {
  const [approveState, approveAction] = useFormState(approveCongeRequest, initialState);
  const [rejectState, rejectAction] = useFormState(rejectCongeRequest, initialState);

  useEffect(() => {
    if (approveState.error) toast.error(approveState.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveState]);
  useEffect(() => {
    if (rejectState.error) toast.error(rejectState.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rejectState]);

  return (
    <div className="flex gap-2">
      <form action={approveAction}>
        <input type="hidden" name="id" value={id} />
        <ActionButton label="Approuver" pendingLabel="Approbation..." variant="default" />
      </form>
      <form action={rejectAction}>
        <input type="hidden" name="id" value={id} />
        <ActionButton label="Refuser" pendingLabel="Refus..." variant="outline" />
      </form>
    </div>
  );
}
