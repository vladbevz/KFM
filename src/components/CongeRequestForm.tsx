"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { toast } from "sonner";
import { requestConge, type RequestCongeState } from "@/app/chauffeur/planning/actions";

const initialState: RequestCongeState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-km px-4 py-3.5 text-base font-semibold text-accent-ink disabled:opacity-60"
    >
      {pending ? "Envoi..." : "Envoyer la demande"}
    </button>
  );
}

export function CongeRequestForm() {
  const [state, formAction] = useFormState(requestConge, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const submittedOnce = useRef(false);

  useEffect(() => {
    if (submittedOnce.current && state.error === null) {
      toast.success("Demande de congé envoyée !");
      formRef.current?.reset();
      submittedOnce.current = false;
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={(formData) => {
        submittedOnce.current = true;
        formAction(formData);
      }}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface shadow-card p-4"
    >
      <h2 className="text-sm font-semibold text-foreground/80">Demander un congé</h2>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="start_date" className="text-sm text-foreground/70">
            Du
          </label>
          <input
            id="start_date"
            name="start_date"
            type="date"
            required
            className="rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-foreground"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="end_date" className="text-sm text-foreground/70">
            Au
          </label>
          <input
            id="end_date"
            name="end_date"
            type="date"
            required
            className="rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-foreground"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="note" className="text-sm text-foreground/70">
          Note (optionnel)
        </label>
        <textarea
          id="note"
          name="note"
          rows={2}
          className="rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-foreground"
        />
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <SubmitButton />
    </form>
  );
}
