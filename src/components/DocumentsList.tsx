import { DocumentBadge } from "@/components/DocumentBadge";
import { PhotoLightbox } from "@/components/PhotoLightbox";

export interface DocumentItem {
  id: string;
  doc_name: string;
  expiry_date: string | null;
  signedUrl?: string | null;
}

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

function isImageUrl(url: string): boolean {
  const path = url.split("?")[0].toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => path.endsWith(ext));
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
          className="flex flex-col gap-2 rounded-md border border-border bg-background px-3 py-2"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-foreground">{doc.doc_name}</p>
              {doc.signedUrl && !isImageUrl(doc.signedUrl) && (
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

          {doc.signedUrl && isImageUrl(doc.signedUrl) && (
            <PhotoLightbox src={doc.signedUrl} alt={doc.doc_name} className="max-w-xs" />
          )}
        </div>
      ))}
    </div>
  );
}
