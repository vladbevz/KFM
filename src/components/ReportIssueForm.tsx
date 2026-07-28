"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { compressImage } from "@/lib/image";
import { reportVehicleIssue } from "@/app/chauffeur/panne/actions";
import type { Database, VehicleStatus } from "@/types/database";

type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];

export function ReportIssueForm({ vehicles }: { vehicles: Vehicle[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<VehicleStatus>("issue_running");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("new_status", status);

    const photoInput = form.elements.namedItem("photo") as HTMLInputElement;
    const file = photoInput?.files?.[0];

    if (file) {
      setCompressing(true);
      try {
        const compressed = await compressImage(file);
        formData.set("photo", compressed, "photo.jpg");
      } catch {
        setCompressing(false);
        setError("Impossible de traiter la photo. Réessaie ou continue sans photo.");
        return;
      }
      setCompressing(false);
    }

    startTransition(async () => {
      const result = await reportVehicleIssue({ error: null }, formData);
      if (result.error) {
        setError(result.error);
      } else {
        router.push("/chauffeur");
      }
    });
  }

  const busy = pending || compressing;

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <label htmlFor="vehicle_id" className="text-sm text-foreground/70">
          Véhicule
        </label>
        <select
          id="vehicle_id"
          name="vehicle_id"
          required
          className="rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-km"
        >
          <option value="">Sélectionner...</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.plate}
              {v.label ? ` — ${v.label}` : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-sm text-foreground/70">Le véhicule peut-il continuer ?</span>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setStatus("issue_running")}
            className={`flex-1 rounded-md border px-4 py-3 text-sm font-medium ${
              status === "issue_running"
                ? "border-km bg-km/10 text-km"
                : "border-border text-foreground/60"
            }`}
          >
            Roule quand même
          </button>
          <button
            type="button"
            onClick={() => setStatus("unavailable")}
            className={`flex-1 rounded-md border px-4 py-3 text-sm font-medium ${
              status === "unavailable"
                ? "border-red-500 bg-red-950/30 text-red-400"
                : "border-border text-foreground/60"
            }`}
          >
            Immobilisé
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm text-foreground/70">
          Description du problème
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          required
          className="rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-km"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="photo" className="text-sm text-foreground/70">
          Photo (optionnel)
        </label>
        <input
          id="photo"
          name="photo"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoChange}
          className="text-sm text-foreground/70 file:mr-3 file:rounded-md file:border-0 file:bg-surface file:px-3 file:py-2 file:text-foreground"
        />
        {photoPreview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoPreview}
            alt="Aperçu"
            className="h-40 w-full rounded-md border border-border object-cover"
          />
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-km px-4 py-2 font-medium text-black disabled:opacity-60"
      >
        {compressing ? "Traitement de la photo..." : pending ? "Envoi..." : "Signaler"}
      </button>
    </form>
  );
}
