import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Upload, Download, Plus, Sparkles, Loader2, Pencil, FileUp } from "lucide-react";
import {
  useResultados,
  useUploadResultado,
  useDeleteResultado,
  useDownloadResultado,
  useIndicadores,
  useSaveIndicador,
  useDeleteIndicador,
  useExtractIndicators,
  useDeleteIndicadoresByResultado,
} from "@/hooks/useResultadosEstudio";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { toast } from "sonner";
import { IndicadorSparkline } from "@/components/tendencias/IndicadorSparkline";
import { IndicadorEditRow } from "./IndicadorEditRow";
import { IndicadoresBulkImportDialog } from "./IndicadoresBulkImportDialog";
import { ResultadoEditDialog } from "./ResultadoEditDialog";

interface Props {
  estudio: any;
  canManage: boolean;
}

export function ResultadosManager({ estudio, canManage }: Props) {
  const { user } = useAuth();
  const { data: resultados = [] } = useResultados(estudio.id);
  const upload = useUploadResultado();
  const del = useDeleteResultado();
  const dl = useDownloadResultado();

  const [file, setFile] = useState<File | null>(null);
  const [fecha, setFecha] = useState("");
  const [lab, setLab] = useState("");
  const [notas, setNotas] = useState("");

  const extractAfterUpload = useExtractIndicators();

  const submit = async () => {
    if (!file || !user) return;
    const created = await upload.mutateAsync({
      estudioId: estudio.id, patientId: estudio.patient_id, file, uploadedBy: user.id,
      fechaResultado: fecha || undefined, laboratorio: lab || undefined, notas: notas || undefined,
    });
    setFile(null); setFecha(""); setLab(""); setNotas("");
    if (created?.id && canManage) {
      toast("Resultado subido", {
        description: "¿Extraer indicadores con IA ahora?",
        action: {
          label: "Extraer",
          onClick: () => extractAfterUpload.mutate(created.id),
        },
      });
    }
  };

  return (
    <div className="space-y-3">
      {canManage && (
        <div className="space-y-2 p-3 border rounded-md bg-muted/30">
          <div className="text-sm font-medium">Subir nuevo resultado</div>
          <Input type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Fecha</Label><Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
            <div><Label className="text-xs">Laboratorio</Label><Input value={lab} onChange={(e) => setLab(e.target.value)} /></div>
          </div>
          <Textarea placeholder="Notas" value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} />
          <Button size="sm" onClick={submit} disabled={!file || upload.isPending}>
            <Upload className="h-3.5 w-3.5 mr-1" />Subir
          </Button>
        </div>
      )}

      {resultados.length === 0 && <p className="text-sm text-muted-foreground">Sin resultados aún.</p>}

      {resultados.map((r: any) => (
        <ResultadoItem key={r.id} resultado={r} canManage={canManage} onDownload={() => dl.mutate(r.pdf_path)} onDelete={() => { if (confirm("¿Eliminar?")) del.mutate({ id: r.id, path: r.pdf_path }); }} />
      ))}
    </div>
  );
}

function ResultadoItem({ resultado, canManage, onDownload, onDelete }: any) {
  const { data: indicadores = [] } = useIndicadores(resultado.id);
  const saveInd = useSaveIndicador();
  const delInd = useDeleteIndicador();
  const extract = useExtractIndicators();
  const delAllInd = useDeleteIndicadoresByResultado();
  const [showInd, setShowInd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [addingIndicador, setAddingIndicador] = useState(false);
  const [draft, setDraft] = useState({ nombre_indicador: "", valor: "", unidad: "", valor_referencia_min: "", valor_referencia_max: "" });

  const handleExtract = async () => {
    if (indicadores.length > 0) {
      if (!confirm(`Ya hay ${indicadores.length} indicadores. ¿Reemplazarlos con los extraídos por IA?`)) return;
      await delAllInd.mutateAsync(resultado.id);
    }
    extract.mutate(resultado.id);
  };

  const addIndicador = async () => {
    if (!draft.nombre_indicador.trim()) {
      toast.error("El nombre del indicador es requerido");
      return;
    }
    const valor = draft.valor === "" ? null : Number(draft.valor);
    const min = draft.valor_referencia_min === "" ? null : Number(draft.valor_referencia_min);
    const max = draft.valor_referencia_max === "" ? null : Number(draft.valor_referencia_max);
    const es_normal = valor != null && min != null && max != null ? valor >= min && valor <= max : null;
    await saveInd.mutateAsync({
      resultado_id: resultado.id,
      patient_id: resultado.patient_id,
      nombre_indicador: draft.nombre_indicador.trim(),
      valor, unidad: draft.unidad || null,
      valor_referencia_min: min, valor_referencia_max: max,
      es_normal, flagged: es_normal === false,
    });
    setDraft({ nombre_indicador: "", valor: "", unidad: "", valor_referencia_min: "", valor_referencia_max: "" });
    setAddingIndicador(false);
    toast.success("Indicador agregado");
  };

  const cancelAdd = () => {
    setDraft({ nombre_indicador: "", valor: "", unidad: "", valor_referencia_min: "", valor_referencia_max: "" });
    setAddingIndicador(false);
  };

  const handleAddKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addIndicador();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelAdd();
    }
  };

  return (
    <div className="border rounded-md p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm">
          <div className="font-medium">{resultado.pdf_name}</div>
          <div className="text-xs text-muted-foreground">
            {resultado.fecha_resultado ? format(new Date(resultado.fecha_resultado), "dd/MM/yyyy") : ""}
            {resultado.laboratorio_nombre ? ` · ${resultado.laboratorio_nombre}` : ""}
          </div>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={onDownload}><Download className="h-3.5 w-3.5" /></Button>
          {canManage && (
            <Button size="sm" variant="ghost" onClick={() => setEditOpen(true)} title="Editar datos del resultado">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {canManage && <Button size="sm" variant="ghost" className="text-destructive" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /></Button>}
        </div>
      </div>
      {resultado.notas && <p className="text-sm text-muted-foreground">{resultado.notas}</p>}

      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant="link" className="px-0 h-auto" onClick={() => setShowInd((s) => !s)}>
          {showInd ? "Ocultar" : "Ver"} indicadores ({indicadores.length})
        </Button>
        {canManage && (
          <Button
            size="sm"
            variant="secondary"
            onClick={handleExtract}
            disabled={extract.isPending || delAllInd.isPending}
          >
            {extract.isPending ? (
              <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Analizando PDF…</>
            ) : (
              <><Sparkles className="h-3.5 w-3.5 mr-1" />{indicadores.length > 0 ? "Re-extraer con IA" : "Extraer con IA"}</>
            )}
          </Button>
        )}
        {canManage && (
          <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)}>
            <FileUp className="h-3.5 w-3.5 mr-1" />Importar CSV
          </Button>
        )}
      </div>

      {showInd && (
        <div className="space-y-2">
          {indicadores.map((i: any) => (
            editingId === i.id ? (
              <IndicadorEditRow
                key={i.id}
                indicador={i}
                isSaving={saveInd.isPending}
                onCancel={() => setEditingId(null)}
                onSave={async (patch) => {
                  await saveInd.mutateAsync({ id: i.id, ...patch });
                  setEditingId(null);
                }}
              />
            ) : (
            <div key={i.id} className="flex items-center justify-between gap-2 text-sm border-b pb-1 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <span>
                  <span className="font-medium">{i.nombre_indicador}</span>: {i.valor} {i.unidad ?? ""}
                  {i.valor_referencia_min != null && (
                    <span className="text-xs text-muted-foreground ml-1">
                      ({i.valor_referencia_min}-{i.valor_referencia_max})
                    </span>
                  )}
                </span>
                {i.valor != null && (
                  <IndicadorSparkline
                    patientId={resultado.patient_id}
                    nombreIndicador={i.nombre_indicador}
                  />
                )}
                {i.es_normal === false && <span className="text-destructive text-xs">⚠️ Fuera de rango</span>}
                {i.es_normal === true && <span className="text-green-600 text-xs">✓ Normal</span>}
              </div>
              {canManage && (
                <div className="flex gap-0.5">
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(i.id)} title="Editar indicador">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => delInd.mutate(i.id)} title="Eliminar indicador">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
            )
          ))}
          {canManage && (
            <div className="pt-2">
              {!addingIndicador ? (
                <Button size="sm" variant="outline" onClick={() => setAddingIndicador(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" />Agregar indicador manual
                </Button>
              ) : (
                <div className="space-y-2 p-2 border rounded-md bg-muted/30">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
                    <div><Label className="text-xs">Indicador</Label><Input autoFocus value={draft.nombre_indicador} onChange={(e) => setDraft({ ...draft, nombre_indicador: e.target.value })} onKeyDown={handleAddKey} /></div>
                    <div><Label className="text-xs">Valor</Label><Input type="number" step="0.01" value={draft.valor} onChange={(e) => setDraft({ ...draft, valor: e.target.value })} onKeyDown={handleAddKey} /></div>
                    <div><Label className="text-xs">Unidad</Label><Input value={draft.unidad} onChange={(e) => setDraft({ ...draft, unidad: e.target.value })} onKeyDown={handleAddKey} /></div>
                    <div><Label className="text-xs">Min</Label><Input type="number" step="0.01" value={draft.valor_referencia_min} onChange={(e) => setDraft({ ...draft, valor_referencia_min: e.target.value })} onKeyDown={handleAddKey} /></div>
                    <div><Label className="text-xs">Max</Label><Input type="number" step="0.01" value={draft.valor_referencia_max} onChange={(e) => setDraft({ ...draft, valor_referencia_max: e.target.value })} onKeyDown={handleAddKey} /></div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="outline" onClick={cancelAdd} disabled={saveInd.isPending}>Cancelar</Button>
                    <Button size="sm" onClick={addIndicador} disabled={saveInd.isPending}>
                      {saveInd.isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                      Guardar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {canManage && (
        <IndicadoresBulkImportDialog
          open={bulkOpen}
          onOpenChange={setBulkOpen}
          resultadoId={resultado.id}
          patientId={resultado.patient_id}
        />
      )}
    </div>
  );
}
