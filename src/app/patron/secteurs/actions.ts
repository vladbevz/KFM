"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database, PaymentType } from "@/types/database";

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

const PAYMENT_TYPES: PaymentType[] = ["a_la_pose", "forfait"];

export async function saveSector(
  _prevState: SectorFormState,
  formData: FormData,
): Promise<SectorFormState> {
  const supabase = await createClient();

  const id = textOrNull(formData.get("id"));
  const code = textOrNull(formData.get("code"));
  const paymentType = formData.get("payment_type") as PaymentType;

  if (!code) {
    return { error: "Le code de la tournée est obligatoire." };
  }
  if (!PAYMENT_TYPES.includes(paymentType)) {
    return { error: "Modèle de paiement invalide." };
  }

  const rentabilityTarget = intOrNull(formData.get("rentability_target"));

  if (paymentType === "a_la_pose" && rentabilityTarget === null) {
    return { error: "L'objectif de rentabilité est obligatoire pour ce modèle." };
  }

  // Prix payé par Geodis par pose (Module A) : dans sector_prices, jamais
  // sur sectors — table dédiée, réservée au patron par RLS (is_boss()),
  // pour qu'un chauffeur ne puisse jamais la lire même via un futur
  // select("*") sur sectors. Nullable : le patron peut laisser vide (pas
  // encore négocié avec Geodis pour cette tournée).
  const pricePerPoseStr = (formData.get("price_per_pose") as string | null)?.trim();
  const pricePerPose = pricePerPoseStr ? Number(pricePerPoseStr) : null;
  if (pricePerPoseStr && (!Number.isFinite(pricePerPose) || pricePerPose! < 0)) {
    return { error: "Le prix par pose doit être un nombre positif." };
  }

  // Montant forfait (Module A) : même raisonnement d'isolation que
  // price_per_pose ci-dessus, dans sector_forfait_amounts.
  const forfaitAmountStr = (formData.get("forfait_amount") as string | null)?.trim();
  const forfaitAmount = forfaitAmountStr ? Number(forfaitAmountStr) : null;
  if (forfaitAmountStr && (!Number.isFinite(forfaitAmount) || forfaitAmount! < 0)) {
    return { error: "Le montant forfait doit être un nombre positif." };
  }

  const payload: SectorInsert = {
    code,
    payment_type: paymentType,
    rentability_target: paymentType === "a_la_pose" ? rentabilityTarget : null,
  };

  const { data: savedSector, error } = id
    ? await supabase.from("sectors").update(payload).eq("id", id).select("id").single<{ id: string }>()
    : await supabase.from("sectors").insert(payload).select("id").single<{ id: string }>();

  if (error) {
    return { error: error.message };
  }

  if (paymentType === "a_la_pose" && savedSector) {
    const { error: priceError } = await supabase
      .from("sector_prices")
      .upsert(
        { sector_id: savedSector.id, price_per_pose: pricePerPose, updated_at: new Date().toISOString() },
        { onConflict: "sector_id" },
      );
    if (priceError) {
      return { error: priceError.message };
    }
  }

  if (paymentType === "forfait" && savedSector) {
    const { error: forfaitError } = await supabase
      .from("sector_forfait_amounts")
      .upsert(
        { sector_id: savedSector.id, forfait_amount: forfaitAmount, updated_at: new Date().toISOString() },
        { onConflict: "sector_id" },
      );
    if (forfaitError) {
      return { error: forfaitError.message };
    }
  }

  revalidatePath("/patron/secteurs");
  revalidatePath("/patron/rentabilite");
  revalidatePath("/patron/rentabilite/geodis");
  return { error: null };
}
