"use client";

// Sélecteur générique "Tous / entité précise", factorisé depuis le
// sélecteur chauffeur de Statistiques — réutilisé aussi pour les
// sélecteurs chauffeur et véhicule de Carburant.
export function EntitySelect({
  label,
  allLabel,
  options,
  value,
  onChange,
}: {
  label: string;
  allLabel: string;
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-foreground/70">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-border bg-background px-2 py-1.5 text-foreground"
      >
        <option value="all">{allLabel}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
