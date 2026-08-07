import { AccountMenuButton } from "@/components/AccountMenuButton";

// Bouton compte minimal en haut d'écran — pas de navbar haute côté
// chauffeur (contrairement au patron), donc pas de pilule complète ici,
// juste l'avatar flottant. Le menu ("Se déconnecter") est celui déjà
// utilisé par AccountMenuButton.
export function ChauffeurAccountButton({ fullName }: { fullName: string }) {
  return (
    <div className="fixed right-4 top-4 z-20">
      <AccountMenuButton fullName={fullName} showName={false} menuSide="bottom" floating />
    </div>
  );
}
