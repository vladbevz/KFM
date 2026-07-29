"use client";

export function TourneeInProgressScreen({ onTerminer }: { onTerminer: () => void }) {
  return (
    <div className="flex flex-col items-center gap-6 px-6 py-16 text-center">
      <p className="text-lg text-foreground/70">Tournée en cours</p>
      <button
        onClick={onTerminer}
        className="w-full max-w-xs rounded-xl bg-km px-6 py-8 text-xl font-semibold text-black"
      >
        Terminer la tournée
      </button>
    </div>
  );
}
