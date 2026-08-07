"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/image";
import { reportVehicleIssue } from "@/app/chauffeur/panne/actions";
import type { Database, VehicleStatus } from "@/types/database";

type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];

export function ReportIssueForm({
  vehicles,
  defaultVehicleId,
}: {
  vehicles: Vehicle[];
  defaultVehicleId?: string | null;
}) {
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
        toast.success("Panne signalée !");
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
          defaultValue={defaultVehicleId ?? ""}
          className="rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-foreground"
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
                ? "border-[#B7791F] bg-[#FBF0DD] text-[#8A5C18]"
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
                ? "border-destructive bg-[#FBE7E5] text-destructive"
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
          className="rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-foreground"
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
            className="max-h-[400px] w-full rounded-md border border-border object-contain"
          />
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="flex items-center justify-center gap-2 rounded-md bg-km px-4 py-2 font-medium text-accent-ink disabled:opacity-60"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {compressing ? "Traitement de la photo..." : pending ? "Envoi..." : "Signaler"}
      </button>
    </form>
  );
}
