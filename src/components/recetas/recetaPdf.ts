import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const FREQ_LABEL: Record<string, string> = {
  cada_4h: "Cada 4 horas",
  cada_6h: "Cada 6 horas",
  cada_8h: "Cada 8 horas",
  cada_12h: "Cada 12 horas",
  cada_24h: "Cada 24 horas",
  cada_48h: "Cada 48 horas",
  semanal: "Semanal",
  otro: "Personalizada",
};

interface Args {
  receta: any;
  patient: { nombre: string; email?: string; telefono?: string };
  doctor: { nombre: string; cedula?: string; especialidad?: string; telefono?: string; direccion?: string };
}

export function generateRecetaPDF({ receta, patient, doctor }: Args) {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  let y = 18;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Receta Médica", pageW / 2, y, { align: "center" });
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Fecha: ${new Date(receta.created_at).toLocaleDateString("es-MX")}`, pageW - 14, y, { align: "right" });
  y += 8;

  // Doctor block
  doc.setFont("helvetica", "bold");
  doc.text("Médico:", 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(doctor.nombre, 35, y);
  y += 5;
  if (doctor.especialidad) { doc.text(`Especialidad: ${doctor.especialidad}`, 14, y); y += 5; }
  if (doctor.cedula) { doc.text(`Cédula: ${doctor.cedula}`, 14, y); y += 5; }
  if (doctor.direccion) { doc.text(doctor.direccion, 14, y); y += 5; }
  if (doctor.telefono) { doc.text(`Tel: ${doctor.telefono}`, 14, y); y += 5; }
  y += 4;

  // Patient block
  doc.setFont("helvetica", "bold");
  doc.text("Paciente:", 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(patient.nombre, 35, y);
  y += 5;
  if (patient.email) { doc.text(`Email: ${patient.email}`, 14, y); y += 5; }
  if (patient.telefono) { doc.text(`Tel: ${patient.telefono}`, 14, y); y += 5; }
  y += 4;

  // Medications table (one row per medicamento)
  const items: any[] = Array.isArray(receta.items) && receta.items.length > 0
    ? receta.items
    : [{
        medicamento_nombre: receta.medicamento_nombre,
        marca_comercial: receta.marca_comercial,
        dosis: receta.dosis, unidad_dosis: receta.unidad_dosis,
        cantidad: receta.cantidad, via_administracion: receta.via_administracion,
        frecuencia: receta.frecuencia, frecuencia_horas: receta.frecuencia_horas,
        dias_a_tomar: receta.dias_a_tomar, indicacion: receta.indicacion,
      }];

  const body = items.map((it, i) => {
    const dosisStr = [it.dosis, it.unidad_dosis].filter(Boolean).join(" ");
    const freq = it.frecuencia === "otro" && it.frecuencia_horas
      ? `Cada ${it.frecuencia_horas} h`
      : FREQ_LABEL[it.frecuencia] ?? it.frecuencia ?? "-";
    return [
      String(i + 1),
      (it.medicamento_nombre ?? "-") + (it.marca_comercial ? ` (${it.marca_comercial})` : ""),
      dosisStr || "-",
      it.cantidad != null && it.cantidad !== "" ? `${it.cantidad}` : "-",
      it.via_administracion ?? "-",
      freq,
      it.dias_a_tomar ? `${it.dias_a_tomar} días` : "-",
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [["#", "Medicamento", "Dosis", "Cantidad", "Vía", "Frecuencia", "Duración"]],
    body,
    theme: "striped",
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 9 },
  });
  // @ts-ignore
  y = (doc as any).lastAutoTable.finalY + 10;

  // Indicaciones generales + por medicamento
  const perItemInd = items
    .map((it, i) => (it.indicacion ? `${i + 1}. ${it.medicamento_nombre}: ${it.indicacion}` : null))
    .filter(Boolean) as string[];

  if (receta.indicacion || perItemInd.length > 0) {
    doc.setFont("helvetica", "bold"); doc.text("Indicaciones:", 14, y); y += 5;
    doc.setFont("helvetica", "normal");
    if (receta.indicacion) {
      const lines = doc.splitTextToSize(receta.indicacion, pageW - 28);
      doc.text(lines, 14, y); y += lines.length * 5 + 2;
    }
    for (const ind of perItemInd) {
      const lines = doc.splitTextToSize(`• ${ind}`, pageW - 28);
      doc.text(lines, 14, y); y += lines.length * 5 + 1;
    }
    y += 2;
  }

  if (receta.observaciones) {
    doc.setFont("helvetica", "bold"); doc.text("Observaciones:", 14, y); y += 5;
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(receta.observaciones, pageW - 28);
    doc.text(lines, 14, y); y += lines.length * 5 + 3;
  }

  // Signature
  y = Math.max(y, doc.internal.pageSize.getHeight() - 40);
  doc.line(pageW / 2 - 40, y, pageW / 2 + 40, y);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.text(doctor.nombre, pageW / 2, y, { align: "center" });
  if (doctor.cedula) {
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.text(`Cédula Profesional: ${doctor.cedula}`, pageW / 2, y, { align: "center" });
  }

  const dateStr = new Date(receta.created_at).toISOString().slice(0, 10);
  const suffix = items.length > 1 ? `${items.length}meds` : (items[0]?.medicamento_nombre || "medicamento").replace(/\s+/g, "_");
  doc.save(`receta_${dateStr}_${suffix}.pdf`);
}
