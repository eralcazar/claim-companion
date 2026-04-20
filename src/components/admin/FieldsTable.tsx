import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Save, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MappingSelects } from "./MappingSelects";
import {
  type Campo,
  type Seccion,
  useCampos,
  useDeleteCampo,
  useUpsertCampos,
  useBulkDeleteCampos,
  useMapeos,
} from "@/hooks/useFormatos";
import { cn } from "@/lib/utils";

const TIPOS = [
  "texto", "numero", "fecha", "checkbox", "radio", "select",
  "firma", "textarea", "telefono", "curp", "rfc", "diagnostico_cie",
];

const ALL_SECTIONS = "__all__";
const NO_SECTION = "__none__";
const ALL_PAGES = "__all_pages__";
const NO_SECTION_VALUE = "__none_section__";

function blankCampo(formularioId: string, orden: number): Campo {
  return {
    id: crypto.randomUUID(),
    formulario_id: formularioId,
    seccion_id: null,
    clave: "",
    etiqueta: "",
    descripcion: null,
    origen: "manual",
    tipo: "texto",
    campo_pagina: 1,
    campo_x: null,
    campo_y: null,
    campo_ancho: null,
    campo_alto: null,
    label_pagina: null,
    label_x: null,
    label_y: null,
    label_ancho: null,
    label_alto: null,
    mapeo_perfil: null,
    mapeo_poliza: null,
    mapeo_siniestro: null,
    mapeo_medico: null,
    requerido: false,
    longitud_max: null,
    patron_validacion: null,
    valor_defecto: null,
    opciones: null,
    orden,
  };
}

interface Props {
  formularioId: string;
  secciones: Seccion[];
}

export function FieldsTable({ formularioId, secciones }: Props) {
  const { data: campos = [], isLoading } = useCampos(formularioId);
  const { data: mapeos } = useMapeos();
  const upsert = useUpsertCampos(formularioId);
  const remove = useDeleteCampo(formularioId);
  const bulkRemove = useBulkDeleteCampos(formularioId);

  const [draft, setDraft] = useState<Campo[]>([]);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [filterSeccion, setFilterSeccion] = useState<string>(ALL_SECTIONS);
  const [filterPagina, setFilterPagina] = useState<string>(ALL_PAGES);
  const [toDelete, setToDelete] = useState<Campo | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);

  useEffect(() => {
    setDraft(campos);
    setDirty(new Set());
    setSelected(new Set());
  }, [campos]);

  const paginasDetectadas = useMemo(() => {
    const set = new Set<number>();
    draft.forEach((c) => {
      if (typeof c.campo_pagina === "number") set.add(c.campo_pagina);
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [draft]);

  const filtered = useMemo(() => {
    return draft.filter((c) => {
      if (filterSeccion !== ALL_SECTIONS) {
        if (filterSeccion === NO_SECTION && c.seccion_id) return false;
        if (filterSeccion !== NO_SECTION && c.seccion_id !== filterSeccion) return false;
      }
      if (filterPagina !== ALL_PAGES) {
        if (Number(filterPagina) !== (c.campo_pagina ?? 1)) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          c.clave.toLowerCase().includes(q) ||
          (c.etiqueta ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [draft, filterSeccion, filterPagina, search]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((c) => selected.has(c.id));

  const toggleAll = (v: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (v) filtered.forEach((c) => next.add(c.id));
      else filtered.forEach((c) => next.delete(c.id));
      return next;
    });
  };

  const toggleOne = (id: string, v: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (v) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const getMapeoPreview = (c: Campo) => {
    if (!mapeos) return null;
    if (c.mapeo_perfil) {
      const m = mapeos.perfiles.find((x) => x.id === c.mapeo_perfil);
      return m ? { label: "Perfil", display: m.nombre_display, col: m.columna_origen } : null;
    }
    if (c.mapeo_poliza) {
      const m = mapeos.polizas.find((x) => x.id === c.mapeo_poliza);
      return m ? { label: "Póliza", display: m.nombre_display, col: m.columna_origen } : null;
    }
    if (c.mapeo_siniestro) {
      const m = mapeos.siniestros.find((x) => x.id === c.mapeo_siniestro);
      return m ? { label: "Siniestro", display: m.nombre_display, col: m.columna_origen } : null;
    }
    if (c.mapeo_medico) {
      const m = mapeos.medicos.find((x) => x.id === c.mapeo_medico);
      return m ? { label: "Médico", display: m.nombre_display, col: m.columna_origen } : null;
    }
    return null;
  };

  const update = (id: string, patch: Partial<Campo>) => {
    setDraft((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    setDirty((prev) => new Set(prev).add(id));
  };

  const addNew = () => {
    const next = blankCampo(formularioId, draft.length);
    setDraft((prev) => [...prev, next]);
    setDirty((prev) => new Set(prev).add(next.id));
  };

  const save = () => {
    const toSave = draft.filter((c) => dirty.has(c.id) && c.clave.trim());
    if (toSave.length === 0) return;
    upsert.mutate(toSave);
  };

  const numField = (v: number | null | undefined) => (v ?? "");
  const parseNum = (s: string) => (s.trim() === "" ? null : Number(s));

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar clave o etiqueta…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={filterSeccion} onValueChange={setFilterSeccion}>
            <SelectTrigger className="sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_SECTIONS}>Todas las secciones</SelectItem>
              <SelectItem value={NO_SECTION}>Sin sección</SelectItem>
              {secciones.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterPagina} onValueChange={setFilterPagina}>
            <SelectTrigger className="sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_PAGES}>Todas las páginas</SelectItem>
              {paginasDetectadas.map((p) => (
                <SelectItem key={p} value={String(p)}>Página {p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkConfirm(true)}
              disabled={bulkRemove.isPending}
            >
              <Trash2 className="h-4 w-4" />
              Eliminar ({selected.size})
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={addNew}>
            <Plus className="h-4 w-4" />
            Nuevo campo
          </Button>
          <Button size="sm" onClick={save} disabled={dirty.size === 0 || upsert.isPending}>
            <Save className="h-4 w-4" />
            Guardar ({dirty.size})
          </Button>
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allFilteredSelected}
                  onCheckedChange={(v) => toggleAll(!!v)}
                  aria-label="Seleccionar todos"
                />
              </TableHead>
              <TableHead className="w-12">#</TableHead>
              <TableHead className="min-w-[140px]">Clave</TableHead>
              <TableHead className="min-w-[160px]">Etiqueta</TableHead>
              <TableHead className="min-w-[110px]">Tipo</TableHead>
              <TableHead className="w-16">Pág</TableHead>
              <TableHead className="min-w-[160px]">Sección</TableHead>
              <TableHead className="min-w-[180px]">Mapeo</TableHead>
              <TableHead className="min-w-[180px]">Valor mapeado</TableHead>
              <TableHead className="w-20">X%</TableHead>
              <TableHead className="w-20">Y%</TableHead>
              <TableHead className="w-20">W%</TableHead>
              <TableHead className="w-20">H%</TableHead>
              <TableHead className="w-16">Req</TableHead>
              <TableHead className="w-24">Estado</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={15} className="text-center text-muted-foreground py-8">
                  Cargando…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={15} className="text-center text-muted-foreground py-8">
                  Sin campos. Agrega el primero con "Nuevo campo".
                </TableCell>
              </TableRow>
            )}
            {filtered.map((c, idx) => {
              const isDirty = dirty.has(c.id);
              const isMapped = !!(c.mapeo_perfil || c.mapeo_poliza || c.mapeo_siniestro || c.mapeo_medico);
              const isSelected = selected.has(c.id);
              const preview = getMapeoPreview(c);
              const seccionesPagina = secciones.filter(
                (s) => s.pagina === (c.campo_pagina ?? 1),
              );
              const seccionesOpts = seccionesPagina.length > 0 ? seccionesPagina : secciones;
              return (
                <TableRow
                  key={c.id}
                  className={cn(isDirty && "bg-warning/5", isSelected && "bg-primary/5")}
                >
                  <TableCell>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(v) => toggleOne(c.id, !!v)}
                      aria-label={`Seleccionar ${c.clave}`}
                    />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      {isDirty && <span className="h-1.5 w-1.5 rounded-full bg-warning" />}
                      {idx + 1}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={c.clave}
                      onChange={(e) => update(c.id, { clave: e.target.value })}
                      className="h-8 font-mono text-xs"
                      placeholder="CLAVE"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={c.etiqueta ?? ""}
                      onChange={(e) => update(c.id, { etiqueta: e.target.value })}
                      className="h-8 text-xs"
                      placeholder="Etiqueta"
                    />
                  </TableCell>
                  <TableCell>
                    <Select value={c.tipo} onValueChange={(v) => update(c.id, { tipo: v })}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={numField(c.campo_pagina)}
                      onChange={(e) => update(c.id, { campo_pagina: parseNum(e.target.value) })}
                      className="h-8 text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={c.seccion_id ?? NO_SECTION_VALUE}
                      onValueChange={(v) =>
                        update(c.id, { seccion_id: v === NO_SECTION_VALUE ? null : v })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Sin sección" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_SECTION_VALUE}>Sin sección</SelectItem>
                        {seccionesOpts.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.nombre} {s.pagina ? `· p${s.pagina}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <MappingSelects
                      value={{
                        perfil: c.mapeo_perfil,
                        poliza: c.mapeo_poliza,
                        siniestro: c.mapeo_siniestro,
                        medico: c.mapeo_medico,
                      }}
                      onChange={(v) =>
                        update(c.id, {
                          mapeo_perfil: v.perfil,
                          mapeo_poliza: v.poliza,
                          mapeo_siniestro: v.siniestro,
                          mapeo_medico: v.medico,
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    {preview ? (
                      <div className="flex flex-col gap-0.5 text-xs">
                        <div className="flex items-center gap-1">
                          <Badge variant="secondary" className="text-[10px]">
                            {preview.label}
                          </Badge>
                          <span className="truncate">{preview.display}</span>
                        </div>
                        <span className="font-mono text-[10px] text-muted-foreground truncate">
                          {preview.col}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={numField(c.campo_x)}
                      onChange={(e) => update(c.id, { campo_x: parseNum(e.target.value) })}
                      className="h-8 text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={numField(c.campo_y)}
                      onChange={(e) => update(c.id, { campo_y: parseNum(e.target.value) })}
                      className="h-8 text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={numField(c.campo_ancho)}
                      onChange={(e) => update(c.id, { campo_ancho: parseNum(e.target.value) })}
                      className="h-8 text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={numField(c.campo_alto)}
                      onChange={(e) => update(c.id, { campo_alto: parseNum(e.target.value) })}
                      className="h-8 text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <Checkbox
                      checked={c.requerido}
                      onCheckedChange={(v) => update(c.id, { requerido: !!v })}
                    />
                  </TableCell>
                  <TableCell>
                    {isMapped ? (
                      <Badge variant="default" className="text-[10px]">⚡ Mapeado</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">○ Manual</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => setToDelete(c)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar campo?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el campo "{toDelete?.clave}". Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (toDelete) {
                  // If never persisted (still local), just drop from draft
                  const exists = campos.find((c) => c.id === toDelete.id);
                  if (exists) {
                    remove.mutate(toDelete.id);
                  } else {
                    setDraft((prev) => prev.filter((c) => c.id !== toDelete.id));
                  }
                  setToDelete(null);
                }
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkConfirm} onOpenChange={setBulkConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {selected.size} campos?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Los campos seleccionados se eliminarán
              de la base de datos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const ids = Array.from(selected);
                const persistedIds = ids.filter((id) => campos.some((c) => c.id === id));
                const localIds = new Set(ids.filter((id) => !persistedIds.includes(id)));
                if (localIds.size > 0) {
                  setDraft((prev) => prev.filter((c) => !localIds.has(c.id)));
                }
                if (persistedIds.length > 0) {
                  bulkRemove.mutate(persistedIds);
                }
                setSelected(new Set());
                setBulkConfirm(false);
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}