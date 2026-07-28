"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database, PaymentModel } from "@/types/database";

type SectorInsert = Database["public"]["Tables"]["sectors"]["Insert"];

export interface SectorFormState {
  error: string | null;
}

function textOrNull(value: FormDataEntryValue | null): string | null {
  const str = (value as string | null)?.trim();
  return str ? str : null;
}

function intOrNull(value: FormDataEntryValue | null): number | null {
  const str = (value as string | null)?.trim();
  if (!str) return null;
  const n = Number(str);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

const PAYMENT_MODELS: PaymentModel[] = [
  "qty_am_qty_pm",
  "qty_am_forfait_pm",
  "forfait_day",
  "qty_day",
];

export async function saveSector(
  _prevState: SectorFormState,
  formData: FormData,
): Promise<SectorFormState> {
  const supabase = await createClient();

  const id = textOrNull(formData.get("id"));
  const code = textOrNull(formData.get("code"));
  const paymentType = formData.get("payment_type") as PaymentModel;

  if (!code) {
    return { error: "Le code du secteur est obligatoire." };
  }
  if (!PAYMENT_MODELS.includes(paymentType)) {
    return { error: "Modèle de paiement invalide." };
  }

  const morningThreshold = intOrNull(formData.get("morning_threshold"));
  const afternoonThreshold = intOrNull(formData.get("afternoon_threshold"));
  const dayThreshold = intOrNull(formData.get("day_threshold"));

  if (
    (paymentType === "qty_am_qty_pm" || paymentType === "qty_am_forfait_pm") &&
    morningThreshold === null
  ) {
    return { error: "Le seuil du matin est obligatoire pour ce modèle." };
  }
  if (paymentType === "qty_am_qty_pm" && afternoonThreshold === null) {
    return { error: "Le seuil de l'après-midi est obligatoire pour ce modèle." };
  }
  if (paymentType === "qty_day" && dayThreshold === null) {
    return { error: "Le seuil journée est obligatoire pour ce modèle." };
  }

  const payload: SectorInsert = {
    code,
    payment_type: paymentType,
    morning_threshold:
      paymentType === "qty_am_qty_pm" || paymentType === "qty_am_forfait_pm"
        ? morningThreshold
        : null,
    afternoon_threshold: paymentType === "qty_am_qty_pm" ? afternoonThreshold : null,
    day_threshold: paymentType === "qty_day" ? dayThreshold : null,
  };

  const { error } = id
    ? await supabase.from("sectors").update(payload).eq("id", id)
    : await supabase.from("sectors").insert(payload);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/patron/secteurs");
  revalidatePath("/patron/rentabilite");
  return { error: null };
}
