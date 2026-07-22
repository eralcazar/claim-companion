import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { SessionLog, SetLog, ExerciseCatalog } from "@/hooks/useExercises";
import { estimate1RM } from "@/hooks/useExercises";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  session: SessionLog;
  sets: SetLog[];
  catalog: ExerciseCatalog[];
  previousSets?: SetLog[]; // sets del atleta ANTES de esta sesión, para deltas
};

export function SessionPdfExport({ session, sets, catalog, previousSets = [] }: Props) {
  async function generate() {
    try {
      const [{ default: jsPDF }, autoTableModule] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const autoTable = (autoTableModule as any).default;

      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Resumen de sesión — CareCentral", 14, 18);
      doc.setFontSize(10);
      doc.text(
        `Fecha: ${format(parseISO(session.fecha), "PPP", { locale: es })}  ·  ${session.environment}${session.location_label ? " · " + session.location_label : ""}`,
        14, 26
      );
      doc.text(
        `Duración: ${session.duration_min ?? "-"} min  ·  RPE: ${session.rpe ?? "-"}  ·  Descanso prom.: ${session.session_rest_sec ?? "-"} s`,
        14, 32
      );
      if (session.warmup_notes) doc.text(`Calentamiento: ${session.warmup_notes}`, 14, 38);
      if (session.discomforts) doc.text(`Molestias: ${session.discomforts}`, 14, session.warmup_notes ? 44 : 38);

      // Agrupar sets por ejercicio
      const byEx = new Map<string, SetLog[]>();
      for (const s of sets) {
        const arr = byEx.get(s.exercise_id) ?? [];
        arr.push(s);
        byEx.set(s.exercise_id, arr);
      }

      let y = session.discomforts ? 50 : 44;
      const summaryRows: any[] = [];
      for (const [exId, exSets] of byEx.entries()) {
        const ex = catalog.find((c) => c.id === exId);
        const totalVol = exSets.reduce((a, s) => a + (s.weight_kg ?? 0) * (s.reps ?? 0), 0);
        const best1RM = Math.max(...exSets.map((s) => estimate1RM(s.weight_kg ?? 0, s.reps ?? 0)));
        const prevBest = Math.max(
          0,
          ...previousSets.filter((s) => s.exercise_id === exId).map((s) => estimate1RM(s.weight_kg ?? 0, s.reps ?? 0))
        );
        const delta = prevBest ? (best1RM - prevBest).toFixed(1) : "—";
        summaryRows.push([ex?.name ?? exId, exSets.length, Math.round(totalVol), best1RM || "—", delta]);
      }

      autoTable(doc, {
        startY: y,
        head: [["Ejercicio", "Sets", "Volumen (kg·rep)", "1RM est.", "Δ vs previo"]],
        body: summaryRows,
        theme: "grid",
        headStyles: { fillColor: [20, 184, 166] },
      });

      y = (doc as any).lastAutoTable.finalY + 8;

      // Detalle por ejercicio
      for (const [exId, exSets] of byEx.entries()) {
        const ex = catalog.find((c) => c.id === exId);
        if (y > 260) { doc.addPage(); y = 20; }
        doc.setFontSize(12);
        doc.text(ex?.name ?? exId, 14, y);
        y += 4;
        autoTable(doc, {
          startY: y,
          head: [["#", "Reps", "Peso (kg)", "Dist. (m)", "Duración (s)", "RPE"]],
          body: exSets
            .sort((a, b) => a.set_number - b.set_number)
            .map((s) => [s.set_number, s.reps ?? "-", s.weight_kg ?? "-", s.distance_m ?? "-", s.duration_sec ?? "-", s.rpe ?? "-"]),
          theme: "striped",
          styles: { fontSize: 9 },
        });
        y = (doc as any).lastAutoTable.finalY + 6;
      }

      // Recomendación IA
      try {
        const items = Array.from(byEx.entries()).map(([exId, ss]) => ({
          exercise_name: catalog.find((c) => c.id === exId)?.name ?? exId,
          category: catalog.find((c) => c.id === exId)?.category,
          sets: ss.map((s) => ({ reps: s.reps, weight_kg: s.weight_kg, distance_m: s.distance_m, duration_sec: s.duration_sec })),
        }));
        const { data, error } = await supabase.functions.invoke("ai-exercise-coach", {
          body: {
            mode: "session_summary",
            fecha: session.fecha,
            environment: session.environment,
            duration_min: session.duration_min,
            rpe: session.rpe,
            warmup_notes: session.warmup_notes,
            discomforts: session.discomforts,
            session_rest_sec: session.session_rest_sec,
            items,
          },
        });
        if (!error && data) {
          if (y > 250) { doc.addPage(); y = 20; }
          doc.setFontSize(12);
          doc.text("Coach IA", 14, y); y += 6;
          doc.setFontSize(10);
          const summary = doc.splitTextToSize(String(data.summary ?? "—"), 180);
          doc.text(summary, 14, y); y += summary.length * 5 + 2;
          if (Array.isArray(data.highlights) && data.highlights.length) {
            doc.text("Puntos altos:", 14, y); y += 5;
            for (const h of data.highlights) { doc.text(`• ${h}`, 16, y); y += 5; }
          }
          if (Array.isArray(data.flags) && data.flags.length) {
            doc.text("Señales a cuidar:", 14, y); y += 5;
            for (const f of data.flags) { doc.text(`• ${f}`, 16, y); y += 5; }
          }
          if (data.next_session) {
            const nxt = doc.splitTextToSize(`Próxima sesión: ${data.next_session}`, 180);
            doc.text(nxt, 14, y);
          }
        }
      } catch (e) {
        console.warn("Coach IA no disponible en PDF", e);
      }

      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(
        "Generado por CareCentral — Este resumen es informativo y no reemplaza la valoración profesional.",
        14, 290
      );
      doc.save(`entrenamiento_${session.fecha}.pdf`);
      toast.success("PDF generado");
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo generar el PDF");
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={generate} className="gap-1">
      <FileDown className="h-4 w-4" /> Exportar PDF
    </Button>
  );
}