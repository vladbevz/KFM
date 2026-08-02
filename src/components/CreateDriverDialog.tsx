"use client";

import { useState, useTransition } from "react";
import { Check, Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createDriver } from "@/app/patron/chauffeurs/admin-actions";

// Exclut les caractères ambigus à la lecture/transcription (I/O/l/0/1).
const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

function generatePassword(length = 12): string {
  let password = "";
  for (let i = 0; i < length; i++) {
    password += PASSWORD_ALPHABET[Math.floor(Math.random() * PASSWORD_ALPHABET.length)];
  }
  return password;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="rounded-md border border-border p-1.5 text-foreground/70 hover:text-foreground"
      aria-label="Copier"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

export function CreateDriverDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(() => generatePassword());
  const [created, setCreated] = useState<{ fullName: string; email: string; password: string } | null>(
    null,
  );

  function resetAndClose() {
    setOpen(false);
    setCreated(null);
    setFullName("");
    setEmail("");
    setPassword(generatePassword());
    setError(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const formData = new FormData(event.currentTarget);
      const result = await createDriver({ error: null }, formData);
      if (result.error) setError(result.error);
      else setCreated({ fullName, email, password });
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetAndClose();
        else setOpen(true);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>Compte créé</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <p className="text-sm text-foreground/70">
                Transmets ces identifiants à {created.fullName} — ils ne seront plus affichés
                ensuite.
              </p>
              <div className="flex flex-col gap-2 rounded-md border border-border bg-background p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-foreground/50">Email</p>
                    <p className="text-sm font-medium tabular-nums text-foreground">{created.email}</p>
                  </div>
                  <CopyButton value={created.email} />
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
                  <div>
                    <p className="text-xs text-foreground/50">Mot de passe</p>
                    <p className="text-sm font-medium tabular-nums text-foreground">{created.password}</p>
                  </div>
                  <CopyButton value={created.password} />
                </div>
              </div>
              <Button type="button" onClick={resetAndClose}>
                Fermer
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Ajouter un chauffeur</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="full_name">Nom complet</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jean Dupont"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jean.dupont@example.com"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="password"
                    name="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={() => setPassword(generatePassword())}
                    className="rounded-md border border-border p-2 text-foreground/70 hover:text-foreground"
                    aria-label="Régénérer le mot de passe"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <CopyButton value={password} />
                </div>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" disabled={pending}>
                {pending ? "Création..." : "Créer le compte"}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
