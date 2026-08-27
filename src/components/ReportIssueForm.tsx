"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Mic, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/image";
import { reportVehicleIssue } from "@/app/chauffeur/panne/actions";
import type { Database, VehicleStatus } from "@/types/database";

type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];

const MAX_RECORDING_SECONDS = 60;

type RecorderState = "idle" | "recording" | "recorded" | "denied" | "unsupported";

// Note vocale (Module A) : alternative à la description texte, jamais un
// remplacement obligatoire des deux — au moins l'un des deux doit être
// rempli, validé aussi côté serveur (cf. reportVehicleIssue). MediaRecorder
// n'a pas de format garanti identique sur tous les navigateurs : on laisse
// le navigateur choisir son mimeType par défaut plutôt que d'en forcer un
// non supporté partout, et on nomme le fichier .webm côté serveur (format le
// plus courant en pratique sur Chrome/Firefox/Android).
function useVoiceRecorder() {
  const [state, setState] = useState<RecorderState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function clearTimer() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  useEffect(() => {
    return () => {
      clearTimer();
      stopStream();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function start() {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setState("unsupported");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setState("recorded");
        clearTimer();
        stopStream();
      };

      recorder.start();
      setState("recording");
      setSeconds(0);
      intervalRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_RECORDING_SECONDS) {
            recorderRef.current?.stop();
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      setState("denied");
    }
  }

  function stop() {
    recorderRef.current?.stop();
  }

  function reset() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setSeconds(0);
    setState("idle");
  }

  return { state, seconds, audioBlob, audioUrl, start, stop, reset };
}

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
  const voiceRecorder = useVoiceRecorder();

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

    const description = (formData.get("description") as string | null)?.trim();
    if (!description && !voiceRecorder.audioBlob) {
      setError("Décris le problème ou enregistre un message vocal.");
      return;
    }

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

    if (voiceRecorder.audioBlob) {
      formData.set("voice", voiceRecorder.audioBlob, "voice.webm");
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
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-7">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="vehicle_id" className="text-base text-foreground/70">
          Véhicule
        </label>
        <select
          id="vehicle_id"
          name="vehicle_id"
          required
          defaultValue={defaultVehicleId ?? ""}
          className="rounded-md border border-border bg-background px-4 py-4 text-base text-foreground outline-none focus:border-foreground"
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

      <div className="flex flex-col gap-1.5">
        <span className="text-base text-foreground/70">Le véhicule peut-il continuer ?</span>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setStatus("issue_running")}
            className={`flex-1 rounded-md border px-4 py-4 text-base font-medium ${
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
            className={`flex-1 rounded-md border px-4 py-4 text-base font-medium ${
              status === "unavailable"
                ? "border-destructive bg-[#FBE7E5] text-destructive"
                : "border-border text-foreground/60"
            }`}
          >
            Immobilisé
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-base text-foreground/70">
          Description du problème (ou message vocal ci-dessous)
        </label>
        <textarea
          id="description"
          name="description"
          rows={5}
          className="rounded-md border border-border bg-background px-4 py-3.5 text-base text-foreground outline-none focus:border-foreground"
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-base text-foreground/70">Message vocal (optionnel)</span>

        {voiceRecorder.state === "unsupported" && (
          <p className="text-sm text-foreground-muted">
            L&apos;enregistrement vocal n&apos;est pas disponible sur cet appareil. Utilise la description texte.
          </p>
        )}

        {voiceRecorder.state === "denied" && (
          <p className="text-sm text-destructive">
            Accès au micro refusé. Autorise le micro dans les réglages du navigateur, ou continue avec la description texte.
          </p>
        )}

        {(voiceRecorder.state === "idle" || voiceRecorder.state === "denied") && (
          <button
            type="button"
            onClick={voiceRecorder.start}
            className="flex items-center justify-center gap-2 rounded-md border border-border px-4 py-3.5 text-base font-medium text-foreground"
          >
            <Mic className="h-5 w-5" strokeWidth={1.8} />
            Enregistrer un message vocal
          </button>
        )}

        {voiceRecorder.state === "recording" && (
          <button
            type="button"
            onClick={voiceRecorder.stop}
            className="flex items-center justify-center gap-2 rounded-md border border-destructive bg-[#FBE7E5] px-4 py-3.5 text-base font-medium text-destructive"
          >
            <Square className="h-5 w-5" strokeWidth={1.8} />
            Arrêter ({MAX_RECORDING_SECONDS - voiceRecorder.seconds} s)
          </button>
        )}

        {voiceRecorder.state === "recorded" && voiceRecorder.audioUrl && (
          <div className="flex flex-col gap-2">
            <audio controls src={voiceRecorder.audioUrl} className="w-full" />
            <button
              type="button"
              onClick={voiceRecorder.reset}
              className="flex items-center justify-center gap-2 rounded-md border border-border px-4 py-3 text-sm font-medium text-foreground/70"
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.8} />
              Réenregistrer
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="photo" className="text-base text-foreground/70">
          Photo (optionnel)
        </label>
        <input
          id="photo"
          name="photo"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoChange}
          className="text-base text-foreground/70 file:mr-3 file:rounded-md file:border-0 file:bg-surface file:px-4 file:py-3 file:text-base file:text-foreground"
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
        className="flex items-center justify-center gap-2 rounded-md bg-km px-4 py-4 text-lg font-semibold text-accent-ink disabled:opacity-60"
      >
        {busy && <Loader2 className="h-5 w-5 animate-spin" />}
        {compressing ? "Traitement de la photo..." : pending ? "Envoi..." : "Signaler"}
      </button>
    </form>
  );
}
