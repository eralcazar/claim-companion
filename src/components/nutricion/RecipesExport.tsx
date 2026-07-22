import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useRecipes, type NutritionRecipe } from "@/hooks/useRecipes";
import { format } from "date-fns";
import { toast } from "sonner";

function csvEscape(v: unknown) {
  return `"${String(v ?? "").replace(/"/g, '""').replace(/\n/g, " ")}"`;
}

function exportRecipesCsv(recipes: NutritionRecipe[], patientName: string) {
  const rows = [
    ["titulo", "origen", "autor", "url", "porciones", "kcal_total", "kcal_por_porcion", "carbs_g", "proteina_g", "grasa_g", "fibra_g", "ingredientes", "creada"],
    ...recipes.map((r) => [
      r.title, r.source_type, r.source_author ?? "", r.source_url ?? "",
      r.servings, r.total_kcal, Math.round(r.total_kcal / Math.max(1, r.servings)),
      r.total_carbs_g, r.total_protein_g, r.total_fat_g, r.total_fiber_g,
      r.ingredients.map((i) => `${i.name} (${i.grams}g)`).join(" | "),
      new Date(r.created_at).toISOString().slice(0, 10),
    ]),
  ];
  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `recetas_${patientName}_${format(new Date(), "yyyyMMdd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportRecipesPdf(recipes: NutritionRecipe[], patientName: string) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(20, 184, 166);
  doc.rect(0, 0, w, 60, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("CareCentral — Recetas y macros", 30, 32);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Paciente: ${patientName} · Generado: ${format(new Date(), "yyyy-MM-dd HH:mm")}`, 30, 50);

  // Tabla por receta
  autoTable(doc, {
    startY: 80,
    head: [["Receta", "Origen", "Porc.", "kcal/porc", "C", "P", "G", "Fibra"]],
    body: recipes.map((r) => [
      r.title,
      r.source_type,
      r.servings,
      Math.round(r.total_kcal / Math.max(1, r.servings)),
      `${r.total_carbs_g}g`,
      `${r.total_protein_g}g`,
      `${r.total_fat_g}g`,
      `${r.total_fiber_g}g`,
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [15, 23, 42] },
  });

  // Totales agregados
  const total = recipes.reduce(
    (a, r) => ({
      kcal: a.kcal + r.total_kcal,
      c: a.c + r.total_carbs_g,
      p: a.p + r.total_protein_g,
      g: a.g + r.total_fat_g,
      f: a.f + r.total_fiber_g,
    }),
    { kcal: 0, c: 0, p: 0, g: 0, f: 0 },
  );
  const afterY = (doc as any).lastAutoTable?.finalY ?? 90;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Totales acumulados (todas las recetas)", 30, afterY + 24);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`kcal: ${total.kcal}   ·   Carbs: ${total.c}g   ·   Proteína: ${total.p}g   ·   Grasa: ${total.g}g   ·   Fibra: ${total.f}g`, 30, afterY + 40);
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("Recetas con origen 'medlineplus' son contenido de MedlinePlus (NIH), dominio público.", 30, afterY + 58);

  // Detalle por receta en páginas siguientes
  recipes.forEach((r) => {
    doc.addPage();
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold"); doc.setFontSize(14);
    doc.text(r.title, 30, 40);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text(`Origen: ${r.source_type}${r.source_author ? " · Autor: " + r.source_author : ""}`, 30, 56);
    if (r.source_url) doc.text(r.source_url, 30, 70);
    autoTable(doc, {
      startY: 90,
      head: [["Ingrediente", "Gramos"]],
      body: r.ingredients.map((i) => [i.name, `${i.grams}g`]),
      styles: { fontSize: 9 }, headStyles: { fillColor: [20, 184, 166] },
    });
    const y2 = (doc as any).lastAutoTable.finalY;
    doc.setFont("helvetica", "bold"); doc.text("Macros totales", 30, y2 + 20);
    doc.setFont("helvetica", "normal");
    doc.text(`kcal ${r.total_kcal} · C ${r.total_carbs_g}g · P ${r.total_protein_g}g · G ${r.total_fat_g}g · Fibra ${r.total_fiber_g}g`, 30, y2 + 36);
    if (r.steps) {
      doc.setFont("helvetica", "bold"); doc.text("Preparación", 30, y2 + 60);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(r.steps, w - 60);
      doc.text(lines, 30, y2 + 76);
    }
    if (r.attribution) {
      doc.setFontSize(7); doc.setTextColor(120, 120, 120);
      const attrY = doc.internal.pageSize.getHeight() - 30;
      const lines = doc.splitTextToSize(r.attribution, w - 60);
      doc.text(lines, 30, attrY);
    }
  });

  doc.save(`recetas_${patientName}_${format(new Date(), "yyyyMMdd")}.pdf`);
}

export function RecipesExport({ patientId, patientName }: { patientId: string; patientName: string }) {
  const { data: recipes = [] } = useRecipes(patientId);

  function doCsv() {
    if (!recipes.length) { toast.info("No hay recetas para exportar"); return; }
    exportRecipesCsv(recipes, patientName);
  }
  function doPdf() {
    if (!recipes.length) { toast.info("No hay recetas para exportar"); return; }
    exportRecipesPdf(recipes, patientName);
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Download className="h-4 w-4" /> Exportar para tu nutriólogo
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col md:flex-row gap-2 items-start md:items-center">
        <div className="text-sm text-muted-foreground flex-1">
          Descargá tus <b>{recipes.length}</b> recetas con macros por receta y totales acumulados
          para compartir con tu nutriólogo.
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={doCsv} className="gap-1"><Download className="h-4 w-4" /> CSV</Button>
          <Button onClick={doPdf} className="gap-1"><FileText className="h-4 w-4" /> PDF</Button>
        </div>
      </CardContent>
    </Card>
  );
}