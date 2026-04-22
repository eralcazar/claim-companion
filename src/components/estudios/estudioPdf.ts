import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const PRIO_LABEL: Record<string, string> = {
  baja: "Baja",
  normal: "Normal",
  urgente: "URGENTE",
};

function calcAge(dob?: string | null): string {
  if (!dob) return "";
  const d = new Date(dob);
  if (isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const age = new Date(diff).getUTCFullYear() - 1970;
  return `${age} años`;
}

function cap(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface Args {
  estudio: any;
  patient: { nombre: string; email?: string; telefono?: string; date_of_birth?: string | null };
  doctor: { nombre: string; cedula?: string; especialidad?: string; telefono?: string; direccion?: string };
}

export function generateEstudioPDF({ estudio, patient, doctor }: Args) {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  let y = 18;

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Solicitud de Estudios Médicos", pageW / 2, y, { align: "center" });
  y += 8;

  // Folio + date
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Folio: ${String(estudio.id).slice(0, 8).toUpperCase()}`, 14, y);
  doc.text(
    `Fecha: ${new Date(estudio.created_at || Date.now()).toLocaleDateString("es-MX")}`,
    pageW - 14,
    y,
    { align: "right" }
  );
  y += 8;

  // Doctor block
  doc.setFontSize(10);
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
  const age = calcAge(patient.date_of_birth);
  if (age) { doc.text(`Edad: ${age}`, 14, y); y += 5; }
  if (patient.email) { doc.text(`Email: ${patient.email}`, 14, y); y += 5; }
  if (patient.telefono) { doc.text(`Tel: ${patient.telefono}`, 14, y); y += 5; }
  y += 4;

  // Table of requested studies
  autoTable(doc, {
    startY: y,
    head: [["#", "Tipo de estudio", "Cantidad", "Prioridad"]],
    body: [[
      "1",
      cap(estudio.tipo_estudio || "") + (estudio.descripcion ? ` — ${estudio.descripcion}` : ""),
      String(estudio.cantidad ?? 1),
      PRIO_LABEL[estudio.prioridad] ?? estudio.prioridad ?? "-",
    ]],
    theme: "striped",
    headStyles: { fillColor: [59, 130, 246] },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  const writeBlock = (label: string, text: string) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, 14, y); y += 5;
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(text, pageW - 28);
    doc.text(lines, 14, y);
    y += lines.length * 5 + 4;
  };

  if (estudio.indicacion) writeBlock("Indicaciones del médico:", estudio.indicacion);

  if (estudio.ayuno_obligatorio || estudio.preparacion) {
    doc.setFont("helvetica", "bold");
    doc.text("Preparación / Ayuno:", 14, y); y += 5;
    if (estudio.ayuno_obligatorio) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(200, 60, 60);
      const txt = estudio.horas_ayuno
        ? `⚠ AYUNO OBLIGATORIO de ${estudio.horas_ayuno} horas`
        : "⚠ AYUNO OBLIGATORIO";
      doc.text(txt, 14, y); y += 5;
      doc.setTextColor(0, 0, 0);
    }
    if (estudio.preparacion) {
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(estudio.preparacion, pageW - 28);
      doc.text(lines, 14, y);
      y += lines.length * 5;
    }
    y += 4;
  }

  if (estudio.laboratorio_sugerido) writeBlock("Laboratorio sugerido:", estudio.laboratorio_sugerido);
  if (estudio.observaciones) writeBlock("Observaciones:", estudio.observaciones);

  // Signature
  y = Math.max(y, pageH - 40);
  doc.line(pageW / 2 - 40, y, pageW / 2 + 40, y);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.text(doctor.nombre, pageW / 2, y, { align: "center" });
  if (doctor.cedula) {
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.text(`Cédula Profesional: ${doctor.cedula}`, pageW / 2, y, { align: "center" });
  }

  // Cancelled watermark
  if (estudio.estado === "cancelado") {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.saveGraphicsState?.();
      doc.setTextColor(220, 60, 60);
      doc.setFontSize(80);
      doc.setFont("helvetica", "bold");
      // @ts-ignore - jsPDF supports angle option
      doc.text("CANCELADO", pageW / 2, pageH / 2, { align: "center", angle: 35 });
      doc.restoreGraphicsState?.();
      doc.setTextColor(0, 0, 0);
    }
  }

  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Generado por MediClaim · ${new Date().toLocaleDateString("es-MX")}`,
      14,
      pageH - 8
    );
    doc.text(`Página ${i} de ${pageCount}`, pageW - 14, pageH - 8, { align: "right" });
    doc.setTextColor(0, 0, 0);
  }

  const tipoSlug = (estudio.tipo_estudio || "estudio").toLowerCase().replace(/\s+/g, "_");
  const dateSlug = new Date(estudio.created_at || Date.now()).toISOString().slice(0, 10);
  doc.save(`solicitud_estudio_${tipoSlug}_${dateSlug}.pdf`);
}