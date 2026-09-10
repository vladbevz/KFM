import {
  aggregateEcartBySector,
  formatDateFr,
  formatEuros,
  type GeodisEntryRow,
} from "@/lib/geodis";

function formatSignedInt(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

// Document de négociation Geodis : pas un simple export chronologique — le
// patron doit pouvoir dire "voici le contrat qu'on m'a promis pour cette
// tournée, et voici, jour par jour, ce que j'ai réellement reçu". Structure
// en 3 temps : (1) résumé général, (2) tableau de synthèse par tournée avec
// le contrat rappelé et la plage réalisée (ex. "20–26 poses" pour un
// objectif de 25 — la variabilité EST l'argument), (3) une section détaillée
// par tournée à la pose avec le détail jour par jour. Le forfait n'a pas de
// section détaillée : théorique = réel toujours, rien à démontrer jour par
// jour pour ce modèle.
export async function exportGeodisNegotiationPdf({
  rows,
  periodLabel,
  filename,
}: {
  rows: GeodisEntryRow[];
  periodLabel: string;
  filename: string;
}) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({ orientation: "portrait" });
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const usableWidth = pageWidth - margin * 2;

  doc.setFontSize(14);
  doc.setTextColor(26, 29, 35);
  doc.text("KFM Suivi — Statistiques financières", margin, 15);

  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Période : ${periodLabel}`, margin, 22);
  doc.text(
    `Généré le ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date())}`,
    margin,
    27,
  );

  const totalTheorique = rows.reduce((sum, r) => sum + (r.revenuTheorique ?? 0), 0);
  const totalReel = rows.reduce((sum, r) => sum + (r.revenuReel ?? 0), 0);
  const totalEcart = totalReel - totalTheorique;

  doc.setFontSize(11);
  doc.setTextColor(26, 29, 35);
  doc.text(`Revenu théorique total : ${formatEuros(totalTheorique)}`, margin, 36);
  doc.text(`Revenu réel total : ${formatEuros(totalReel)}`, margin, 42);
  doc.setFont("helvetica", "bold");
  doc.text(`Écart total : ${formatEuros(totalEcart)}`, margin, 48);
  doc.setFont("helvetica", "normal");

  // Résumé par tournée : le contrat rappelé en toutes lettres et la plage
  // réellement reçue (min–max) — c'est l'argument central de la
  // négociation, il doit être visible sans ouvrir le détail jour par jour.
  const summaries = aggregateEcartBySector(rows);
  const rowsBySector = new Map<string, GeodisEntryRow[]>();
  for (const row of rows) {
    const list = rowsBySector.get(row.sectorId) ?? [];
    list.push(row);
    rowsBySector.set(row.sectorId, list);
  }

  function contractLabel(sample: GeodisEntryRow): string {
    if (sample.type === "forfait") {
      return sample.revenuTheorique !== null ? `${formatEuros(sample.revenuTheorique)} / tournée (forfait)` : "—";
    }
    if (sample.objectif === null || sample.pricePerPose === null) return "—";
    return `${sample.objectif} poses x ${sample.pricePerPose.toFixed(2)} € = ${(sample.objectif * sample.pricePerPose).toFixed(2)} €/jour`;
  }

  function rangeLabel(sectorRows: GeodisEntryRow[], type: GeodisEntryRow["type"]): string {
    if (type === "forfait") return "—";
    const values = sectorRows.map((r) => r.realise).filter((v): v is number => v !== null);
    if (values.length === 0) return "—";
    const min = Math.min(...values);
    const max = Math.max(...values);
    return min === max ? String(min) : `${min}–${max}`;
  }

  autoTable(doc, {
    startY: 55,
    margin: { left: margin, right: margin },
    head: [["Tournée", "Type", "Contrat", "Plage reçue", "Tournées", "Théorique", "Réel", "Écart"]],
    body: summaries.map((s) => {
      const sectorRows = rowsBySector.get(s.sectorId) ?? [];
      const sample = sectorRows[0];
      return [
        s.sectorCode,
        s.type === "a_la_pose" ? "À la pose" : "Forfait",
        contractLabel(sample),
        rangeLabel(sectorRows, s.type),
        String(s.tourneesCount),
        formatEuros(s.revenuTheoriqueCumule),
        formatEuros(s.revenuReelCumule),
        formatEuros(s.ecartCumule) + (s.hasUnpriced ? " (partiel)" : ""),
      ];
    }),
    styles: { fontSize: 7.5, cellPadding: 2, overflow: "linebreak" },
    headStyles: { fillColor: [26, 29, 35], fontSize: 7.5 },
    columnStyles: {
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right" },
      7: { halign: "right" },
    },
  });

  let cursorY: number;

  // Une section par tournée à la pose, triée comme le résumé (écart le plus
  // défavorable en premier — c'est ce que le patron veut montrer d'abord).
  // Toujours une nouvelle page par tournée (jamais deux tournées sur la même
  // page, cf. demande explicite) — même la première section démarre après
  // la page de résumé, jamais à sa suite sur la même page.
  for (const s of summaries) {
    if (s.type !== "a_la_pose") continue;
    const sectorRows = [...(rowsBySector.get(s.sectorId) ?? [])].sort((a, b) => a.date.localeCompare(b.date));
    const sample = sectorRows[0];
    if (!sample || sample.objectif === null || sample.pricePerPose === null) continue;

    doc.addPage();
    cursorY = 20;

    doc.setFontSize(11);
    doc.setTextColor(26, 29, 35);
    doc.setFont("helvetica", "bold");
    doc.text(
      `${s.sectorCode} — Contrat : ${sample.objectif} poses/jour x ${sample.pricePerPose.toFixed(2)} €/pose = ${(sample.objectif * sample.pricePerPose).toFixed(2)} €/jour attendus`,
      margin,
      cursorY,
      { maxWidth: usableWidth },
    );
    doc.setFont("helvetica", "normal");
    cursorY += 6;

    autoTable(doc, {
      startY: cursorY,
      margin: { left: margin, right: margin },
      head: [["Date", "Chauffeur", "Poses reçues", "Objectif", "Écart (poses)", "Théorique", "Réel", "Écart (€)"]],
      body: sectorRows.map((r) => [
        formatDateFr(r.date),
        r.driverName,
        String(r.realise),
        String(r.objectif),
        formatSignedInt((r.realise ?? 0) - (r.objectif ?? 0)),
        formatEuros(r.revenuTheorique ?? 0),
        formatEuros(r.revenuReel ?? 0),
        formatEuros(r.ecartEuros ?? 0),
      ]),
      foot: [[
        "", "", "", "", "TOTAL",
        formatEuros(s.revenuTheoriqueCumule),
        formatEuros(s.revenuReelCumule),
        formatEuros(s.ecartCumule),
      ]],
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [42, 95, 191], fontSize: 8 },
      footStyles: { fillColor: [230, 232, 236], textColor: [26, 29, 35], fontStyle: "bold" },
      columnStyles: {
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right" },
        5: { halign: "right" },
        6: { halign: "right" },
        7: { halign: "right" },
      },
    });

    const daysUnder = sectorRows.filter((r) => (r.realise ?? 0) < (r.objectif ?? 0)).length;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cursorY = (doc as any).lastAutoTable.finalY + 6;
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`${daysUnder} jour(s) sur ${sectorRows.length} en dessous de l'objectif contractuel.`, margin, cursorY);
    cursorY += 12;
  }

  doc.save(filename);
}
