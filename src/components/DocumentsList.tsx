import { DocumentBadge } from "@/components/DocumentBadge";

export interface DocumentItem {
  id: string;
  doc_name: string;
  expiry_date: string | null;
  signedUrl?: string | null;
}

export function DocumentsList({
  documents,
  renderActions,
}: {
  documents: DocumentItem[];
  renderActions?: (doc: DocumentItem) => React.ReactNode;
}) {
  if (documents.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-foreground/50">
        Aucun document enregistré.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2"
        >
          <div>
            <p className="text-sm font-medium text-foreground">{doc.doc_name}</p>
            {doc.signedUrl && (
              <a
                href={doc.signedUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-foreground underline"
              >
                Voir le fichier
              </a>
            )}
          </div>
          <div className="flex items-center gap-2">
            <DocumentBadge expiryDate={doc.expiry_date} />
            {renderActions?.(doc)}
          </div>
        </div>
      ))}
    </div>
  );
}
