export interface ExportColumn {
  key: string;
  label: string;
  numeric?: boolean;
}

export type ExportRow = Record<string, string | number>;

// Les libellés de période affichés incluent maintenant des dates
// concrètes ("7 jours (01/08/2026 – 07/08/2026)") — inutilisables tels
// quels dans un nom de fichier (/, espaces, tiret long...).
export function slugifyFilename(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

// xlsx/jspdf sont de grosses librairies (des centaines de Ko) : import
// dynamique pour qu'elles ne fassent partie du bundle que si le patron
// clique vraiment sur "Exporter", pas du chargement initial de chaque écran
// à tableau.
export async function exportToExcel({
  columns,
  rows,
  filename,
}: {
  columns: ExportColumn[];
  rows: ExportRow[];
  filename: string;
}) {
  const XLSX = await import("xlsx");
  const displayRows = rows.map((row) =>
    Object.fromEntries(columns.map((c) => [c.label, row[c.key] ?? ""])),
  );
  const worksheet = XLSX.utils.json_to_sheet(displayRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Données");
  XLSX.writeFile(workbook, filename);
}

export async function exportToPdf({
  title,
  subtitle,
  columns,
  rows,
  filename,
}: {
  title: string;
  subtitle: string;
  columns: ExportColumn[];
  rows: ExportRow[];
  filename: string;
}) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  // Un tableau à beaucoup de colonnes (ex. le comparatif chauffeurs, 13
  // colonnes) ne tient pas en portrait sans casser les mots des en-têtes
  // en plein milieu — bascule en paysage et réduit la police à mesure que
  // le nombre de colonnes augmente.
  const isWide = columns.length > 6;
  const fontSize = columns.length > 10 ? 7 : columns.length > 6 ? 7.5 : 9;
  const doc = new jsPDF({ orientation: isWide ? "landscape" : "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const usableWidth = pageWidth - margin * 2;

  doc.setFontSize(14);
  doc.text(title, margin, 15);

  doc.setFontSize(10);
  doc.setTextColor(120);
  const subtitleLines: string[] = doc.splitTextToSize(subtitle, usableWidth);
  let y = 22;
  for (const line of subtitleLines) {
    doc.text(line, margin, y);
    y += 5;
  }
  doc.text(
    `Généré le ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date())}`,
    margin,
    y,
  );

  autoTable(doc, {
    startY: y + 5,
    margin: { left: margin, right: margin },
    head: [columns.map((c) => c.label)],
    body: rows.map((row) => columns.map((c) => String(row[c.key] ?? ""))),
    styles: { fontSize, cellPadding: isWide ? 2 : 3, overflow: "linebreak" },
    headStyles: { fillColor: [26, 29, 35], fontSize },
    // columnStyles seul ne suffit pas à aligner l'en-tête ET la donnée de
    // la même façon (l'en-tête restait à gauche, large à cause d'un
    // libellé long, pendant que la donnée courte s'alignait à droite —
    // visuellement décollée de son propre en-tête). didParseCell force le
    // même alignement sur les deux sections, colonne par colonne.
    didParseCell: (data) => {
      const col = columns[data.column.index];
      if (col?.numeric) data.cell.styles.halign = "right";
    },
  });

  doc.save(filename);
}
