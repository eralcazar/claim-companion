import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { DIAS, MOMENTO_LABEL, type Momento, type MealPlan, type MealPlanItem } from "@/hooks/useMealPlan";

const MOMENTOS: Momento[] = ["desayuno", "colacion_am", "comida", "colacion_pm", "cena"];

export function exportMealPlanPdf(plan: MealPlan, items: MealPlanItem[], patientName: string) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(20, 184, 166); // teal
  doc.rect(0, 0, pageWidth, 60, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("CareCentral", 30, 32);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Plan nutricional semanal", 30, 50);

  // Patient / plan meta
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  const metaY = 85;
  doc.setFont("helvetica", "bold");
  doc.text("Paciente:", 30, metaY);
  doc.setFont("helvetica", "normal");
  doc.text(patientName, 90, metaY);
  doc.setFont("helvetica", "bold");
  doc.text("Plan:", 300, metaY);
  doc.setFont("helvetica", "normal");
  doc.text(plan.titulo, 335, metaY);
  doc.setFont("helvetica", "bold");
  doc.text("Vigencia:", 550, metaY);
  doc.setFont("helvetica", "normal");
  doc.text(`${plan.fecha_inicio} → ${plan.fecha_fin ?? "—"}`, 610, metaY);
  if (plan.kcal_objetivo != null) {
    doc.setFont("helvetica", "bold");
    doc.text("Kcal objetivo:", 30, metaY + 16);
    doc.setFont("helvetica", "normal");
    doc.text(`${plan.kcal_objetivo} kcal/día`, 105, metaY + 16);
  }

  // Build grid
  const grid = new Map<string, MealPlanItem[]>();
  for (const it of items) {
    const k = `${it.dia_semana}-${it.momento}`;
    const list = grid.get(k) ?? [];
    list.push(it);
    grid.set(k, list);
  }

  const body = MOMENTOS.map((momento) => {
    const row: any[] = [{ content: MOMENTO_LABEL[momento], styles: { fontStyle: "bold", fillColor: [241, 245, 249] } }];
    for (let d = 0; d < 7; d++) {
      const list = grid.get(`${d}-${momento}`) ?? [];
      const cellText = list.length === 0 ? "—" : list.map((it) => {
        const parts = [it.alimento];
        const sub = [it.porcion, it.unidad].filter(Boolean).join(" ");
        if (sub) parts.push(`(${sub})`);
        if (it.kcal != null) parts.push(`— ${it.kcal} kcal`);
        let s = parts.join(" ");
        if (it.alternativas.length) s += `\n↔ Alt: ${it.alternativas.join(" · ")}`;
        return s;
      }).join("\n\n");
      row.push(cellText);
    }
    return row;
  });

  autoTable(doc, {
    startY: 115,
    head: [["Momento", ...DIAS]],
    body,
    styles: { fontSize: 8, cellPadding: 4, valign: "top" },
    headStyles: { fillColor: [20, 184, 166], textColor: 255, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 70 } },
    margin: { left: 20, right: 20 },
  });

  let y = (doc as any).lastAutoTable.finalY + 20;

  if (plan.notas) {
    if (y > 500) { doc.addPage(); y = 40; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Notas del profesional", 30, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(plan.notas, pageWidth - 60);
    doc.text(lines, 30, y + 14);
    y += 14 + lines.length * 12;
  }

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Generado por CareCentral · ${new Date().toLocaleString("es-MX")} · Documento informativo, no sustituye consulta médica.`,
    30, pageHeight - 20,
  );

  doc.save(`plan_nutricional_${patientName.replace(/\s+/g, "_")}_${plan.fecha_inicio}.pdf`);
}