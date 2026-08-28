"use client";

import { useState, useTransition } from "react";
import { updateNotificationPreference, type NotificationField } from "@/app/patron/notifications/actions";

const FIELDS: { field: NotificationField; label: string; description: string }[] = [
  { field: "panne_signalee", label: "Panne signalée", description: "Un chauffeur signale un problème véhicule." },
  {
    field: "echeance_proche",
    label: "Échéance qui approche",
    description: "Un document (véhicule ou chauffeur) expire dans moins de 7 jours.",
  },
  { field: "echeance_depassee", label: "Échéance dépassée", description: "Un document est déjà expiré." },
  { field: "demande_conge", label: "Nouvelle demande de congé", description: "Un chauffeur demande un congé." },
];

export function NotificationPreferenceToggles({
  preferences,
}: {
  preferences: Record<NotificationField, boolean>;
}) {
  const [values, setValues] = useState(preferences);
  const [pending, startTransition] = useTransition();

  function toggle(field: NotificationField) {
    const next = !values[field];
    setValues((v) => ({ ...v, [field]: next }));
    startTransition(async () => {
      const result = await updateNotificationPreference(field, next);
      if (result.error) {
        setValues((v) => ({ ...v, [field]: !next }));
      }
    });
  }

  return (
    <div className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-surface shadow-card">
      {FIELDS.map(({ field, label, description }) => (
        <div key={field} className="flex items-center justify-between gap-4 p-4">
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium text-foreground">{label}</p>
            <p className="text-xs text-foreground-muted">{description}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={values[field]}
            disabled={pending}
            onClick={() => toggle(field)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
              values[field] ? "bg-km" : "bg-border"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                values[field] ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      ))}
    </div>
  );
}
