"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DocumentFormFields } from "@/components/DocumentFormFields";
import { saveDriverDocument, type DocumentFormState } from "@/app/patron/chauffeurs/actions";
import type { Database } from "@/types/database";

type DriverDocument = Pick<
  Database["public"]["Tables"]["driver_documents"]["Row"],
  "id" | "doc_name" | "expiry_date"
>;

const PRESETS = ["Visite médicale", "Permis", "FIMO", "FCO"];
const initialState: DocumentFormState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Envoi..." : "Enregistrer"}
    </Button>
  );
}

export function DriverDocumentDialog({
  driverId,
  document,
  trigger,
}: {
  driverId: string;
  document?: DriverDocument;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(saveDriverDocument, initialState);
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
          <DialogTitle>{document ? "Modifier le document" : "Ajouter un document"}</DialogTitle>
        </DialogHeader>

        <form
          action={(formData) => {
            submittedOnce.current = true;
            formAction(formData);
          }}
          className="flex flex-col gap-4"
        >
          <input type="hidden" name="driver_id" value={driverId} />
          {document && <input type="hidden" name="id" value={document.id} />}

          <DocumentFormFields
            presets={PRESETS}
            defaultDocName={document?.doc_name}
            fileRequired={false}
            fileOptionalLabel={
              document ? "laisser vide pour garder l'actuel" : "optionnel"
            }
            defaultExpiryDate={document?.expiry_date}
          />

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <SubmitButton />
        </form>
      </DialogContent>
    </Dialog>
  );
}
