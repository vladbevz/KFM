// Compresse une photo côté client avant upload (cible ~500KB-1MB) : évite
// d'envoyer des photos de plusieurs Mo prises directement au téléphone.
export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const maxDim = 1600;
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas non disponible sur cet appareil.");
  ctx.drawImage(bitmap, 0, 0, width, height);

  const targetBytes = 900 * 1024;
  let quality = 0.8;
  let blob: Blob | null = null;

  for (let i = 0; i < 5; i++) {
    blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (!blob || blob.size <= targetBytes || quality <= 0.3) break;
    quality -= 0.15;
  }

  if (!blob) throw new Error("La compression de la photo a échoué.");
  return blob;
}
