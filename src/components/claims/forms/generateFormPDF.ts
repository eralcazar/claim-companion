import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { FormDefinition } from "./types";

interface PDFContext {
  definition: FormDefinition;
  insurer: string;
  data: Record<string, any>;
  folio: string;
}

function fmtDate(d: string) {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString("es-MX"); } catch { return d; }
}

function valueToText(v: any): string {
  if (v == null || v === "") return "";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "boolean") return v ? "Sí" : "No";
  return String(v);
}

export function generateFormPDF({ definition, insurer, data, folio }: PDFContext): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;

  // ===== Header =====
  doc.setFillColor(59, 130, 246); // primary blue
  doc.rect(0, 0, pageWidth, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(insurer, margin, 9);
  doc.setFontSize(11);
  doc.text(definition.name, pageWidth / 2, 9, { align: "center" });
  doc.setFontSize(9);
  doc.text(`Folio: ${folio}`, pageWidth - margin, 8, { align: "right" });
  doc.text(`Fecha: ${new Date().toLocaleDateString("es-MX")}`, pageWidth - margin, 13, { align: "right" });
  doc.setTextColor(15, 23, 42);
  y = 30;

  const ensureSpace = (h: number) => {
    if (y + h > pageHeight - 20) { doc.addPage(); y = margin + 5; }
  };

  for (const section of definition.sections) {
    if (section.showWhen && !section.showWhen(data)) continue;

    ensureSpace(12);
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, pageWidth - margin * 2, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(section.title, margin + 2, y + 5);
    y += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    if (section.kind === "dynamic_table") {
      const rows: any[][] = ((data[section.tableName!] as any[]) || []).map((r, i) => [
        i + 1,
        ...(section.columns || []).map((c) => valueToText(r[c.name])),
      ]);
      autoTable(doc, {
        startY: y,
        head: [["#", ...(section.columns || []).map((c) => c.label)]],
        body: rows.length ? rows : [["—", ...(section.columns || []).map(() => "")]],
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: margin, right: margin },
      });
      y = (doc as any).lastAutoTable.finalY + 4;
      if (section.showTotal) {
        const total = ((data[section.tableName!] as any[]) || []).reduce(
          (s, r) => s + (parseFloat(r.amount) || 0), 0);
        doc.setFont("helvetica", "bold");
        doc.text(`Total: $${total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`, pageWidth - margin, y, { align: "right" });
        y += 6;
        doc.setFont("helvetica", "normal");
      }
      continue;
    }

    if (section.kind === "dynamic_doctors") {
      const docs: any[] = data[section.doctorsName || "doctors"] || [];
      docs.forEach((d, i) => {
        ensureSpace(20);
        doc.setFont("helvetica", "bold");
        doc.text(`Médico ${i + 1}`, margin, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        const lines = [
          `Tipo: ${valueToText(d.participation)}${d.participation_other ? ` (${d.participation_other})` : ""}`,
          `Nombre: ${[d.first_name, d.paternal, d.maternal].filter(Boolean).join(" ")}`,
          `Especialidad: ${valueToText(d.specialty)}`,
          `Cédula: ${valueToText(d.license)} | Esp: ${valueToText(d.specialty_license)} | $${valueToText(d.fees)}`,
        ];
        for (const ln of lines) { ensureSpace(5); doc.text(ln, margin + 4, y); y += 5; }
        y += 2;
      });
      continue;
    }

    // fields
    for (const f of section.fields || []) {
      if (f.showWhen && !f.showWhen(data)) continue;
      if (f.type === "static_text") {
        const split = doc.splitTextToSize(f.text || "", pageWidth - margin * 2 - 4);
        ensureSpace(split.length * 4 + 2);
        doc.setFontSize(8);
        doc.text(split, margin + 2, y);
        y += split.length * 4 + 2;
        doc.setFontSize(9);
        continue;
      }
      if (f.type === "signature") {
        const v = data[f.name];
        ensureSpace(35);
        doc.setFont("helvetica", "bold");
        doc.text(f.label + ":", margin, y);
        y += 4;
        doc.setFont("helvetica", "normal");
        if (v && typeof v === "string" && v.startsWith("data:image")) {
          try { doc.addImage(v, "PNG", margin, y, 60, 25); } catch {}
        } else {
          doc.rect(margin, y, 60, 25);
        }
        y += 28;
        continue;
      }
      let display = "";
      if (f.type === "date") display = fmtDate(data[f.name]);
      else if (f.type === "computed_age") {
        const dob = data[f.dobField || "date_of_birth"];
        if (dob) {
          const age = (() => {
            const d = new Date(dob); if (isNaN(d.getTime())) return "";
            const now = new Date(); let a = now.getFullYear() - d.getFullYear();
            const m = now.getMonth() - d.getMonth();
            if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
            return a >= 0 ? String(a) : "";
          })();
          display = age;
        }
      } else display = valueToText(data[f.name]);

      const line = `${f.label}: ${display}`;
      const split = doc.splitTextToSize(line, pageWidth - margin * 2);
      ensureSpace(split.length * 5 + 1);
      doc.text(split, margin, y);
      y += split.length * 5 + 1;
    }
    y += 3;
  }

  // Footer en cada página
  const pages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Documento generado por Aplicación del Bienestar Ciudadano · Folio: ${folio} · ${new Date().toLocaleDateString("es-MX")}`,
      pageWidth / 2, pageHeight - 8, { align: "center" }
    );
    doc.text(`Página ${i} de ${pages}`, pageWidth - margin, pageHeight - 8, { align: "right" });
  }

  return doc;
}
