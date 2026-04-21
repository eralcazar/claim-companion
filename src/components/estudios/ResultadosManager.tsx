import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Upload, Download, Plus } from "lucide-react";
import { useResultados, useUploadResultado, useDeleteResultado, useDownloadResultado, useIndicadores, useSaveIndicador, useDeleteIndicador } from "@/hooks/useResultadosEstudio";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

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

  const submit = async () => {
    if (!file || !user) return;
    await upload.mutateAsync({
      estudioId: estudio.id, patientId: estudio.patient_id, file, uploadedBy: user.id,
      fechaResultado: fecha || undefined, laboratorio: lab || undefined, notas: notas || undefined,
    });
    setFile(null); setFecha(""); setLab(""); setNotas("");
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
  const [showInd, setShowInd] = useState(false);
  const [draft, setDraft] = useState({ nombre_indicador: "", valor: "", unidad: "", valor_referencia_min: "", valor_referencia_max: "" });

  const addIndicador = async () => {
    if (!draft.nombre_indicador) return;
    const valor = draft.valor === "" ? null : Number(draft.valor);
    const min = draft.valor_referencia_min === "" ? null : Number(draft.valor_referencia_min);
    const max = draft.valor_referencia_max === "" ? null : Number(draft.valor_referencia_max);
    const es_normal = valor != null && min != null && max != null ? valor >= min && valor <= max : null;
    await saveInd.mutateAsync({
      resultado_id: resultado.id,
      patient_id: resultado.patient_id,
      nombre_indicador: draft.nombre_indicador,
      valor, unidad: draft.unidad || null,
      valor_referencia_min: min, valor_referencia_max: max,
      es_normal, flagged: es_normal === false,
    });
    setDraft({ nombre_indicador: "", valor: "", unidad: "", valor_referencia_min: "", valor_referencia_max: "" });
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
          {canManage && <Button size="sm" variant="ghost" className="text-destructive" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /></Button>}
        </div>
      </div>
      {resultado.notas && <p className="text-sm text-muted-foreground">{resultado.notas}</p>}

      <Button size="sm" variant="link" className="px-0 h-auto" onClick={() => setShowInd((s) => !s)}>
        {showInd ? "Ocultar" : "Ver"} indicadores ({indicadores.length})
      </Button>

      {showInd && (
        <div className="space-y-2">
          {indicadores.map((i: any) => (
            <div key={i.id} className="flex items-center justify-between text-sm border-b pb-1">
              <div>
                <span className="font-medium">{i.nombre_indicador}</span>: {i.valor} {i.unidad ?? ""}
                {i.valor_referencia_min != null && (
                  <span className="text-xs text-muted-foreground ml-2">
                    ({i.valor_referencia_min}-{i.valor_referencia_max})
                  </span>
                )}
                {i.es_normal === false && <span className="ml-2 text-destructive text-xs">⚠️ Fuera de rango</span>}
                {i.es_normal === true && <span className="ml-2 text-green-600 text-xs">✓ Normal</span>}
              </div>
              {canManage && (
                <Button size="sm" variant="ghost" onClick={() => delInd.mutate(i.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
          {canManage && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-1 items-end pt-2">
              <div><Label className="text-xs">Indicador</Label><Input value={draft.nombre_indicador} onChange={(e) => setDraft({ ...draft, nombre_indicador: e.target.value })} /></div>
              <div><Label className="text-xs">Valor</Label><Input type="number" step="0.01" value={draft.valor} onChange={(e) => setDraft({ ...draft, valor: e.target.value })} /></div>
              <div><Label className="text-xs">Unidad</Label><Input value={draft.unidad} onChange={(e) => setDraft({ ...draft, unidad: e.target.value })} /></div>
              <div><Label className="text-xs">Min</Label><Input type="number" step="0.01" value={draft.valor_referencia_min} onChange={(e) => setDraft({ ...draft, valor_referencia_min: e.target.value })} /></div>
              <div className="flex gap-1">
                <Input type="number" step="0.01" placeholder="Max" value={draft.valor_referencia_max} onChange={(e) => setDraft({ ...draft, valor_referencia_max: e.target.value })} />
                <Button size="sm" onClick={addIndicador}><Plus className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
