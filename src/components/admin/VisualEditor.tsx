import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ChevronLeft, ChevronRight, Plus, Settings2, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  getFormatoPublicUrl,
  useCampos,
  useDeleteCampo,
  useUpdateCampoSilent,
  type Campo,
  type Formulario,
} from "@/hooks/useFormatos";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PDFCanvasEditor } from "./PDFCanvasEditor";
import { FieldSidebar } from "./FieldSidebar";
import { ProposalsPanel } from "./ProposalsPanel";
import { pdfjs } from "react-pdf";
import "@/lib/pdfWorker";

export interface ProposedField {
  clave: string;
  etiqueta: string;
  tipo: string;
  x: number;
  y: number;
  w: number;
  h: number;
  page: number;
  accepted?: boolean;
}

interface Props {
  formulario: Formulario;
}

export function VisualEditor({ formulario }: Props) {
  const { data: serverCampos = [] } = useCampos(formulario.id);
  const update = useUpdateCampoSilent(formulario.id);
  const remove = useDeleteCampo(formulario.id);
  const qc = useQueryClient();

  const url = useMemo(() => getFormatoPublicUrl(formulario.storage_path), [formulario.storage_path]);

  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(formulario.total_paginas || 1);
  const [zoom, setZoom] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [proposals, setProposals] = useState<ProposedField[]>([]);
  const [selectedProposalKey, setSelectedProposalKey] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [savingProposals, setSavingProposals] = useState(false);

  // Local in-flight overrides for live drag without waiting for server.
  const [overrides, setOverrides] = useState<Record<string, Partial<Campo>>>({});
  const debounceRef = useRef<Record<string, number>>({});

  const campos = useMemo<Campo[]>(
    () =>
      serverCampos.map((c) => (overrides[c.id] ? { ...c, ...overrides[c.id] } : c)),
    [serverCampos, overrides],
  );

  const selected = campos.find((c) => c.id === selectedId) ?? null;
  const camposEnPagina = campos.filter((c) => (c.campo_pagina ?? 1) === page);

  // Keyboard nav.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      if (e.key === "ArrowLeft") setPage((p) => Math.max(1, p - 1));
      if (e.key === "ArrowRight") setPage((p) => Math.min(numPages, p + 1));
      if (e.key === "Escape") {
        setCreating(false);
        setSelectedId(null);
      }
      if (e.key === "Delete" && selectedId) {
        remove.mutate(selectedId);
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [numPages, selectedId, remove]);

  const handleChange = (id: string, patch: Partial<Campo>) => {
    setOverrides((o) => ({ ...o, [id]: { ...o[id], ...patch } }));
  };

  const handleCommit = (id: string, patch: Partial<Campo>) => {
    const merged = { ...overrides[id], ...patch };
    if (debounceRef.current[id]) window.clearTimeout(debounceRef.current[id]);
    debounceRef.current[id] = window.setTimeout(() => {
      update.mutate(
        { id, ...merged },
        {
          onSuccess: () => {
            setOverrides((o) => {
              const { [id]: _, ...rest } = o;
              return rest;
            });
          },
        },
      );
    }, 400);
  };

  const handleCreate = async (rect: { x: number; y: number; w: number; h: number }) => {
    const orden = campos.length + 1;
    const clave = `CAMPO_${orden}`;
    const { data, error } = await supabase
      .from("campos")
      .insert({
        formulario_id: formulario.id,
        clave,
        etiqueta: clave,
        tipo: "texto",
        origen: "manual",
        campo_pagina: page,
        campo_x: rect.x,
        campo_y: rect.y,
        campo_ancho: rect.w,
        campo_alto: rect.h,
        orden,
        requerido: false,
      } as any)
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["campos", formulario.id] });
    setSelectedId((data as any).id);
    setCreating(false);
  };

  const handleDuplicate = async () => {
    if (!selected) return;
    const orden = campos.length + 1;
    const { id, ...rest } = selected as any;
    const { data, error } = await supabase
      .from("campos")
      .insert({
        ...rest,
        clave: `${selected.clave}_COPIA`,
        orden,
        campo_x: (selected.campo_x ?? 0) + 2,
        campo_y: (selected.campo_y ?? 0) + 2,
      })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["campos", formulario.id] });
    setSelectedId((data as any).id);
  };

  const handleDelete = () => {
    if (!selected) return;
    remove.mutate(selected.id);
    setSelectedId(null);
  };

  const handleDetect = async () => {
    setDetecting(true);
    try {
      // Render current page to PNG via pdfjs
      const loadingTask = pdfjs.getDocument(url);
      const pdf = await loadingTask.promise;
      const pdfPage = await pdf.getPage(page);
      // Keep image small enough for edge function body limits (~4MB).
      // Target ~1600px wide max, then JPEG compress.
      const baseViewport = pdfPage.getViewport({ scale: 1 });
      const targetWidth = 1600;
      const scale = Math.min(2, targetWidth / baseViewport.width);
      const viewport = pdfPage.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No se pudo crear canvas");
      await pdfPage.render({ canvasContext: ctx, viewport, canvas } as any).promise;
      const image_base64 = canvas.toDataURL("image/jpeg", 0.85);

      const { data, error } = await supabase.functions.invoke("detect-form-fields", {
        body: {
          image_base64,
          page_number: page,
          formulario_nombre: formulario.nombre_display ?? formulario.nombre,
        },
      });
      if (error) throw error;
      const raw = (data as any)?.propuestas ?? [];
      // Filter duplicates against existing campos in this page
      const existingKeys = new Set(camposEnPagina.map((c) => c.clave));
      const cleaned: ProposedField[] = raw
        .filter((p: any) => !existingKeys.has(p.clave))
        .map((p: any) => ({ ...p, page, accepted: true }));

      // Avoid clave collisions with previous proposals
      setProposals((prev) => {
        const others = prev.filter((p) => p.page !== page);
        return [...others, ...cleaned];
      });
      setSelectedProposalKey(null);
      if (cleaned.length === 0) {
        toast.info("No se detectaron campos nuevos en esta página.");
      } else {
        toast.success(`${cleaned.length} propuestas detectadas.`);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Error al detectar campos");
    } finally {
      setDetecting(false);
    }
  };

  const updateProposal = (key: string, patch: Partial<ProposedField>) => {
    setProposals((prev) => prev.map((p) => (p.clave === key ? { ...p, ...patch } : p)));
    if (patch.clave && patch.clave !== key && selectedProposalKey === key) {
      setSelectedProposalKey(patch.clave);
    }
  };

  const acceptAllProposals = async () => {
    const accepted = proposals.filter((p) => p.accepted !== false);
    if (accepted.length === 0) return;
    setSavingProposals(true);
    try {
      const baseOrden = campos.length;
      const rows = accepted.map((p, i) => ({
        formulario_id: formulario.id,
        clave: p.clave,
        etiqueta: p.etiqueta || p.clave,
        tipo: p.tipo || "texto",
        origen: "auto_ia",
        campo_pagina: p.page,
        campo_x: round(p.x),
        campo_y: round(p.y),
        campo_ancho: round(p.w),
        campo_alto: round(p.h),
        orden: baseOrden + i + 1,
        requerido: false,
      }));
      const { error } = await supabase.from("campos").insert(rows as any);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["campos", formulario.id] });
      toast.success(`${rows.length} campos guardados.`);
      setProposals((prev) => prev.filter((p) => p.page !== page || p.accepted === false));
      setSelectedProposalKey(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Error al guardar campos");
    } finally {
      setSavingProposals(false);
    }
  };

  const discardAllProposals = () => {
    setProposals((prev) => prev.filter((p) => p.page !== page));
    setSelectedProposalKey(null);
  };

  const proposalsEnPagina = proposals.filter((p) => p.page === page);
  const showProposalsPanel = proposalsEnPagina.length > 0;

  const sidebar = (
    <FieldSidebar
      campo={selected}
      totalEnPagina={camposEnPagina.length}
      totalEnFormulario={campos.length}
      onChange={(patch) => selected && handleChange(selected.id, patch)}
      onCommit={(patch) => selected && handleCommit(selected.id, patch)}
      onDelete={handleDelete}
      onDuplicate={handleDuplicate}
    />
  );

  const rightPanel = showProposalsPanel ? (
    <ProposalsPanel
      proposals={proposalsEnPagina}
      selectedKey={selectedProposalKey}
      saving={savingProposals}
      onSelect={setSelectedProposalKey}
      onUpdate={updateProposal}
      onAcceptAll={acceptAllProposals}
      onDiscardAll={discardAllProposals}
    />
  ) : (
    sidebar
  );

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <Card className="p-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium tabular-nums px-2">
            {page} / {numPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage((p) => Math.min(numPages, p + 1))}
            disabled={page >= numPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2 min-w-[180px] flex-1 max-w-xs">
          <span className="text-xs text-muted-foreground">Zoom</span>
          <Slider
            value={[zoom * 100]}
            min={50}
            max={200}
            step={10}
            onValueChange={(v) => setZoom(v[0] / 100)}
          />
          <span className="text-xs tabular-nums w-10 text-right">{Math.round(zoom * 100)}%</span>
        </div>
        <Button
          variant={creating ? "default" : "outline"}
          size="sm"
          onClick={() => setCreating((c) => !c)}
        >
          <Plus className="h-4 w-4" />
          {creating ? "Cancelar" : "Nuevo campo"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDetect}
          disabled={detecting}
          className="border-warning text-warning hover:bg-warning/10 hover:text-warning"
        >
          {detecting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {detecting ? "Detectando..." : "Detectar campos"}
        </Button>
        <Badge variant="outline" className="ml-auto text-xs">
          {camposEnPagina.length} en esta página
        </Badge>
        {/* Mobile sidebar trigger */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="lg:hidden">
              <Settings2 className="h-4 w-4" />
              Panel
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
            <div className="pt-4">{rightPanel}</div>
          </SheetContent>
        </Sheet>
      </Card>

      <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
        {/* Canvas */}
        <Card className="p-3 overflow-auto bg-muted/30 max-h-[calc(100vh-16rem)]">
          <div className="flex justify-center">
            <PDFCanvasEditor
              url={url}
              page={page}
              zoom={zoom}
              campos={campos}
              selectedId={selectedId}
              creating={creating}
              onSelect={setSelectedId}
              onChangeCampo={handleChange}
              onCommitCampo={handleCommit}
              onCreate={handleCreate}
              onLoadSuccess={setNumPages}
              proposals={proposals}
              selectedProposalKey={selectedProposalKey}
              onSelectProposal={setSelectedProposalKey}
            />
          </div>
        </Card>

        {/* Desktop sidebar */}
        <div className="hidden lg:block">{rightPanel}</div>
      </div>
    </div>
  );
}

function round(v: number) {
  return Math.round(v * 100) / 100;
}