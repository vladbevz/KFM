"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "request" | "confirm" | "update";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("request");
  const [linkError, setLinkError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  const [confirmLoading, setConfirmLoading] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // Le lien envoyé par email ramène l'utilisateur ici avec un token_hash en
  // paramètre. On ne le consomme QUE sur un clic explicite (handleConfirm),
  // jamais automatiquement au chargement de la page : un simple GET (par ex.
  // un scanner de sécurité qui pré-visite les liens des emails) ne doit pas
  // invalider le lien avant que l'utilisateur ne clique réellement dessus.
  useEffect(() => {
    const errorCode = searchParams.get("error_code");
    if (errorCode) {
      setLinkError(
        errorCode === "otp_expired"
          ? "Ce lien a expiré ou a déjà été utilisé (parfois consommé automatiquement par le scanner de sécurité de la messagerie). Demande un nouveau lien ci-dessous."
          : "Ce lien n'est plus valide. Demande un nouveau lien ci-dessous.",
      );
      return;
    }
    const tokenHash = searchParams.get("token_hash");
    if (tokenHash && searchParams.get("type") === "recovery") {
      setMode("confirm");
    }
  }, [searchParams]);

  // Filet de sécurité pour l'ancien format de lien (flux implicite avec
  // session de récupération déjà établie côté client).
  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("update");
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleRequestSubmit(event: FormEvent) {
    event.preventDefault();
    setRequestLoading(true);
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setRequestLoading(false);
    // Message neutre : ne révèle jamais si l'email existe dans le système.
    setRequestSent(true);
  }

  async function handleConfirmClick() {
    const tokenHash = searchParams.get("token_hash");
    if (!tokenHash) return;
    setConfirmLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "recovery",
    });
    setConfirmLoading(false);
    if (error) {
      setLinkError("Ce lien a expiré ou a déjà été utilisé. Demande un nouveau lien ci-dessous.");
      setMode("request");
      return;
    }
    setMode("update");
  }

  async function handleUpdateSubmit(event: FormEvent) {
    event.preventDefault();
    setUpdateError(null);

    if (password.length < 8) {
      setUpdateError("Le mot de passe doit faire au moins 8 caractères.");
      return;
    }
    if (password !== confirmPassword) {
      setUpdateError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setUpdateLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setUpdateLoading(false);

    if (error) {
      setUpdateError(error.message);
      return;
    }

    setUpdateSuccess(true);
    await supabase.auth.signOut();
    setTimeout(() => router.push("/login"), 2000);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-6">
        <h1 className="mb-6 text-center text-xl font-semibold text-foreground">
          {mode === "request" && "Mot de passe oublié"}
          {mode === "confirm" && "Réinitialisation du mot de passe"}
          {mode === "update" && "Nouveau mot de passe"}
        </h1>

        {mode === "request" &&
          (requestSent ? (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-foreground/70">
                Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.
              </p>
              <Link
                href="/login"
                className="text-center text-sm text-foreground/70 underline hover:text-foreground"
              >
                Retour à la connexion
              </Link>
            </div>
          ) : (
            <form onSubmit={handleRequestSubmit} className="flex flex-col gap-4">
              {linkError && <p className="text-sm text-destructive">{linkError}</p>}
              <div className="flex flex-col gap-1">
                <label htmlFor="email" className="text-sm text-foreground/70">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-foreground"
                />
              </div>

              <button
                type="submit"
                disabled={requestLoading}
                className="mt-2 rounded-md bg-km px-4 py-2 font-medium text-accent-ink disabled:opacity-60"
              >
                {requestLoading ? "Envoi..." : "Envoyer le lien"}
              </button>

              <Link
                href="/login"
                className="text-center text-sm text-foreground/70 underline hover:text-foreground"
              >
                Retour à la connexion
              </Link>
            </form>
          ))}

        {mode === "confirm" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-foreground/70">
              Clique ci-dessous pour continuer la réinitialisation de ton mot de passe.
            </p>
            <button
              type="button"
              onClick={handleConfirmClick}
              disabled={confirmLoading}
              className="mt-2 rounded-md bg-km px-4 py-2 font-medium text-accent-ink disabled:opacity-60"
            >
              {confirmLoading ? "Vérification..." : "Continuer"}
            </button>
          </div>
        )}

        {mode === "update" &&
          (updateSuccess ? (
            <p className="text-sm text-foreground/70">
              Mot de passe mis à jour. Redirection vers la connexion...
            </p>
          ) : (
            <form onSubmit={handleUpdateSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="password" className="text-sm text-foreground/70">
                  Nouveau mot de passe
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-foreground"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="confirmPassword" className="text-sm text-foreground/70">
                  Confirmer le mot de passe
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-foreground"
                />
              </div>

              {updateError && <p className="text-sm text-destructive">{updateError}</p>}

              <button
                type="submit"
                disabled={updateLoading}
                className="mt-2 rounded-md bg-km px-4 py-2 font-medium text-accent-ink disabled:opacity-60"
              >
                {updateLoading ? "Mise à jour..." : "Mettre à jour le mot de passe"}
              </button>
            </form>
          ))}
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}
