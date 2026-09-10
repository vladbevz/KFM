"use client";

import { useState, useTransition } from "react";
import { Wrench, BellRing, AlertTriangle, Calendar, type LucideIcon } from "lucide-react";
import { updateNotificationPreference, type NotificationField } from "@/app/patron/notifications/actions";

const FIELDS: { field: NotificationField; label: string; description: string; icon: LucideIcon }[] = [
  {
    field: "panne_signalee",
    label: "Panne signalée",
    description: "Un chauffeur signale un problème véhicule.",
    icon: Wrench,
  },
  {
    field: "echeance_proche",
    label: "Échéance qui approche",
    description: "Un document (véhicule ou chauffeur) expire dans moins de 7 jours.",
    icon: BellRing,
  },
  {
    field: "echeance_depassee",
    label: "Échéance dépassée",
    description: "Un document est déjà expiré.",
    icon: AlertTriangle,
  },
  {
    field: "demande_conge",
    label: "Nouvelle demande de congé",
    description: "Un chauffeur demande un congé.",
    icon: Calendar,
  },
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
      {FIELDS.map(({ field, label, description, icon: Icon }) => (
        <div key={field} className="flex items-center gap-3 p-4">
          <Icon className="h-4 w-4 shrink-0 text-foreground-muted" strokeWidth={1.8} />
          <div className="flex flex-1 flex-col gap-0.5">
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
              className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                values[field] ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      ))}
    </div>
  );
}
