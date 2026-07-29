"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const OTHER = "Autre...";

export function DocumentFormFields({
  presets,
  defaultDocName,
  fileRequired,
  fileOptionalLabel,
  defaultExpiryDate,
}: {
  presets: string[];
  defaultDocName?: string;
  fileRequired: boolean;
  fileOptionalLabel?: string;
  defaultExpiryDate?: string | null;
}) {
  const initialIsOther = Boolean(defaultDocName) && !presets.includes(defaultDocName!);
  const [preset, setPreset] = useState(initialIsOther ? OTHER : (defaultDocName ?? presets[0]));
  const [customName, setCustomName] = useState(initialIsOther ? (defaultDocName ?? "") : "");
  const isOther = preset === OTHER;
  const finalDocName = isOther ? customName : preset;

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="doc_name_preset">Type de document</Label>
        <Select value={preset} onValueChange={setPreset}>
          <SelectTrigger id="doc_name_preset">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {presets.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
            <SelectItem value={OTHER}>{OTHER}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isOther && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="doc_name_custom">Nom du document</Label>
          <Input
            id="doc_name_custom"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="ex. Habilitation électrique"
            required
          />
        </div>
      )}

      <input type="hidden" name="doc_name" value={finalDocName} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="file">
          Fichier{fileOptionalLabel ? ` (${fileOptionalLabel})` : ""}
        </Label>
        <input
          id="file"
          name="file"
          type="file"
          accept="image/*,application/pdf"
          required={fileRequired}
          className="text-sm text-foreground/70 file:mr-3 file:rounded-md file:border-0 file:bg-background file:px-3 file:py-2 file:text-foreground"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="expiry_date">Date d&apos;échéance (optionnel)</Label>
        <Input id="expiry_date" name="expiry_date" type="date" defaultValue={defaultExpiryDate ?? ""} />
      </div>
    </>
  );
}
