import { redirect } from "next/navigation";

// Fusionnée dans /patron/rentabilite (vue "Financier", devenue la vue par
// défaut) — conservé comme redirection pour ne pas casser un lien existant
// (favori, export PDF/Excel généré avant la fusion, etc.).
export default function GeodisEcartRedirect() {
  redirect("/patron/rentabilite");
}
