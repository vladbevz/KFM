export interface ExportColumn {
  key: string;
  label: string;
  numeric?: boolean;
}

export type ExportRow = Record<string, string | number>;

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

  const doc = new jsPDF();

  doc.setFontSize(14);
  doc.text(title, 14, 15);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(subtitle, 14, 22);
  doc.text(
    `Généré le ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date())}`,
    14,
    27,
  );

  autoTable(doc, {
    startY: 32,
    head: [columns.map((c) => c.label)],
    body: rows.map((row) => columns.map((c) => String(row[c.key] ?? ""))),
    columnStyles: Object.fromEntries(
      columns.map((c, i) => [i, { halign: c.numeric ? ("right" as const) : ("left" as const) }]),
    ),
    headStyles: { fillColor: [26, 29, 35] },
    styles: { fontSize: 9 },
  });

  doc.save(filename);
}
