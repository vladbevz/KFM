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

  const payload: SectorInsert = {
    code,
    payment_type: paymentType,
    rentability_target: paymentType === "a_la_pose" ? rentabilityTarget : null,
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
