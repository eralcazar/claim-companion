import { Fragment, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Save, Search, Upload, ChevronDown, ChevronRight } from "lucide-react";
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
import {
  type Campo,
  type Seccion,
  useCampos,
  useDeleteCampo,
  useUpsertCampos,
  useBulkDeleteCampos,
  useMapeos,
  useImportCampos,
  type CampoImportRow,
} from "@/hooks/useFormatos";
import { cn } from "@/lib/utils";
import { CSVImportDialog, type CSVValidationResult } from "./CSVImportDialog";
import { CampoOpcionesEditor, type CampoOpcion } from "./CampoOpcionesEditor";

const TIPOS = [
  "texto", "numero", "fecha", "checkbox", "radio", "select",
  "firma", "textarea", "telefono", "curp", "rfc", "diagnostico_cie",
];

const ALL_SECTIONS = "__all__";
const NO_SECTION = "__none__";
const ALL_PAGES = "__all_pages__";
const NO_SECTION_VALUE = "__none_section__";
const NO_CATALOG = "__no_catalog__";
const NO_MAPPING = "__no_mapping__";

type CatalogoTipo = "perfil" | "poliza" | "siniestro" | "medico" | "firma";
const FIRMA_MAPPING_ID = "firma_usuario";

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
  const importMut = useImportCampos(formularioId);

  const [draft, setDraft] = useState<Campo[]>([]);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [filterSeccion, setFilterSeccion] = useState<string>(ALL_SECTIONS);
  const [filterPagina, setFilterPagina] = useState<string>(ALL_PAGES);
  const [toDelete, setToDelete] = useState<Campo | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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

  const getCatalogo = (c: Campo): CatalogoTipo | null => {
    if (c.mapeo_perfil === FIRMA_MAPPING_ID) return "firma";
    if (c.mapeo_perfil !== null && c.mapeo_perfil !== undefined) return "perfil";
    if (c.mapeo_poliza !== null && c.mapeo_poliza !== undefined) return "poliza";
    if (c.mapeo_siniestro !== null && c.mapeo_siniestro !== undefined) return "siniestro";
    if (c.mapeo_medico !== null && c.mapeo_medico !== undefined) return "medico";
    return null;
  };

  const setCatalogo = (id: string, t: CatalogoTipo | null) => {
    update(id, {
      mapeo_perfil: t === "perfil" ? "" : t === "firma" ? FIRMA_MAPPING_ID : null,
      mapeo_poliza: t === "poliza" ? "" : null,
      mapeo_siniestro: t === "siniestro" ? "" : null,
      mapeo_medico: t === "medico" ? "" : null,
    });
  };

  const setCampoMapeo = (id: string, t: CatalogoTipo, mapeoId: string | null) => {
    update(id, {
      mapeo_perfil: t === "perfil" ? mapeoId : t === "firma" ? FIRMA_MAPPING_ID : null,
      mapeo_poliza: t === "poliza" ? mapeoId : null,
      mapeo_siniestro: t === "siniestro" ? mapeoId : null,
      mapeo_medico: t === "medico" ? mapeoId : null,
    });
  };

  const opcionesCatalogo = (t: CatalogoTipo | null) => {
    if (!t || !mapeos) return [];
    if (t === "perfil") return mapeos.perfiles;
    if (t === "poliza") return mapeos.polizas;
    if (t === "siniestro") return mapeos.siniestros;
    if (t === "medico") return mapeos.medicos;
    return [];
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
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" />
            Importar CSV
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
              <TableHead className="w-8"></TableHead>
              <TableHead className="w-12">#</TableHead>
              <TableHead className="min-w-[140px]">Clave</TableHead>
              <TableHead className="min-w-[160px]">Etiqueta</TableHead>
              <TableHead className="min-w-[110px]">Tipo</TableHead>
              <TableHead className="w-16">Pág</TableHead>
              <TableHead className="w-16">X%</TableHead>
              <TableHead className="w-16">Y%</TableHead>
              <TableHead className="w-16">W%</TableHead>
              <TableHead className="w-16">H%</TableHead>
              <TableHead className="min-w-[160px]">Sección</TableHead>
              <TableHead className="w-32">Catálogo</TableHead>
              <TableHead className="min-w-[200px]">Campo de mapeo</TableHead>
              <TableHead className="min-w-[180px]">Valor mapeado</TableHead>
              <TableHead className="w-16">Req</TableHead>
              <TableHead className="w-28">Estado</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={18} className="text-center text-muted-foreground py-8">
                  Cargando…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={18} className="text-center text-muted-foreground py-8">
                  Sin campos. Agrega el primero con "Nuevo campo".
                </TableCell>
              </TableRow>
            )}
            {filtered.map((c, idx) => {
              const isDirty = dirty.has(c.id);
              const isSelected = selected.has(c.id);
              const isExpanded = expanded.has(c.id);
              const supportsOptions = c.tipo === "radio" || c.tipo === "checkbox" || c.tipo === "select";
              const preview = getMapeoPreview(c);
              const seccionesPagina = secciones.filter(
                (s) => s.pagina === (c.campo_pagina ?? 1),
              );
              const seccionesOpts = seccionesPagina.length > 0 ? seccionesPagina : secciones;
              return (
                <Fragment key={c.id}>
                <TableRow
                  className={cn(isDirty && "bg-warning/5", isSelected && "bg-primary/5")}
                >
                  <TableCell>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(v) => toggleOne(c.id, !!v)}
                      aria-label={`Seleccionar ${c.clave}`}
                    />
                  </TableCell>
                  <TableCell>
                    {supportsOptions && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => toggleExpand(c.id)}
                        title={isExpanded ? "Ocultar opciones" : "Editar opciones"}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    )}
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
                    <Input
                      type="number"
                      step="0.01"
                      value={numField(c.campo_x)}
                      onChange={(e) => update(c.id, { campo_x: parseNum(e.target.value) })}
                      className="h-8 text-xs px-1 font-mono"
                      placeholder="—"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={numField(c.campo_y)}
                      onChange={(e) => update(c.id, { campo_y: parseNum(e.target.value) })}
                      className="h-8 text-xs px-1 font-mono"
                      placeholder="—"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={numField(c.campo_ancho)}
                      onChange={(e) => update(c.id, { campo_ancho: parseNum(e.target.value) })}
                      className="h-8 text-xs px-1 font-mono"
                      placeholder="—"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={numField(c.campo_alto)}
                      onChange={(e) => update(c.id, { campo_alto: parseNum(e.target.value) })}
                      className="h-8 text-xs px-1 font-mono"
                      placeholder="—"
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
                    <Select
                      value={getCatalogo(c) ?? NO_CATALOG}
                      onValueChange={(v) =>
                        setCatalogo(c.id, v === NO_CATALOG ? null : (v as CatalogoTipo))
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_CATALOG}>Sin mapeo</SelectItem>
                        <SelectItem value="perfil">Perfil</SelectItem>
                        <SelectItem value="poliza">Póliza</SelectItem>
                        <SelectItem value="siniestro">Siniestro</SelectItem>
                        <SelectItem value="medico">Médico</SelectItem>
                        <SelectItem value="firma">Firma</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const cat = getCatalogo(c);
                      const opciones = opcionesCatalogo(cat);
                      const currentId =
                        cat === "perfil" ? c.mapeo_perfil :
                        cat === "poliza" ? c.mapeo_poliza :
                        cat === "siniestro" ? c.mapeo_siniestro :
                        cat === "medico" ? c.mapeo_medico : null;
                      return (
                        <Select
                          value={currentId && currentId !== "" ? currentId : NO_MAPPING}
                          onValueChange={(v) =>
                            cat && setCampoMapeo(c.id, cat, v === NO_MAPPING ? null : v)
                          }
                          disabled={!cat}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder={cat ? "Seleccionar campo…" : "Elige catálogo"} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NO_MAPPING}>—</SelectItem>
                            {opciones.map((o) => (
                              <SelectItem key={o.id} value={o.id}>
                                <div className="flex flex-col">
                                  <span>{o.nombre_display}</span>
                                  <span className="font-mono text-[10px] text-muted-foreground">
                                    {o.columna_origen}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      );
                    })()}
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
                    <Checkbox
                      checked={c.requerido}
                      onCheckedChange={(v) => update(c.id, { requerido: !!v })}
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={c.origen ?? "auto"}
                      onValueChange={(v) => update(c.id, { origen: v })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">⚡ Auto</SelectItem>
                        <SelectItem value="manual">○ Manual</SelectItem>
                      </SelectContent>
                    </Select>
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
                {isExpanded && supportsOptions && (
                  <TableRow className="bg-muted/10">
                    <TableCell colSpan={18} className="p-3">
                      <CampoOpcionesEditor
                        opciones={(Array.isArray(c.opciones) ? (c.opciones as CampoOpcion[]) : []) as CampoOpcion[]}
                        defaultPagina={c.campo_pagina}
                        onChange={(next) => update(c.id, { opciones: next as any })}
                      />
                    </TableCell>
                  </TableRow>
                )}
                </Fragment>
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

      <CSVImportDialog<CampoImportRow>
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Importar campos desde CSV"
        description="Columnas: clave, etiqueta, tipo, seccion_nombre, pagina, requerido, longitud_max, opciones (separadas por ;), mapeo_perfil, mapeo_poliza, mapeo_siniestro, mapeo_medico, campo_x, campo_y, campo_ancho, campo_alto. Las secciones que no existan se crearán automáticamente."
        templateHeaders={[
          "clave", "etiqueta", "tipo", "seccion_nombre", "pagina", "requerido",
          "longitud_max", "opciones", "mapeo_perfil", "mapeo_poliza",
          "mapeo_siniestro", "mapeo_medico",
          "campo_x", "campo_y", "campo_ancho", "campo_alto",
        ]}
        templateExampleRow={[
          "nombre", "Nombre completo", "texto", "Datos del paciente", "1", "true",
          "100", "", "full_name", "", "", "", "10.5", "12.3", "40", "4",
        ]}
        templateFilename="plantilla_campos.csv"
        previewColumns={[
          { key: "clave", label: "Clave" },
          { key: "etiqueta", label: "Etiqueta" },
          { key: "tipo", label: "Tipo" },
          { key: "seccion_nombre", label: "Sección" },
          { key: "pagina", label: "Pág" },
        ]}
        rowToPreview={(r) => ({
          clave: r.clave,
          etiqueta: r.etiqueta,
          tipo: r.tipo,
          seccion_nombre: r.seccion_nombre ?? "—",
          pagina: r.pagina ?? 1,
        })}
        isImporting={importMut.isPending}
        parseRow={(raw): CSVValidationResult<CampoImportRow> => {
          const errors: string[] = [];
          const clave = (raw.clave ?? "").trim();
          const etiqueta = (raw.etiqueta ?? "").trim();
          const tipo = (raw.tipo ?? "").trim() || "texto";
          if (!clave) errors.push("clave requerida");
          if (!etiqueta) errors.push("etiqueta requerida");
          if (!TIPOS.includes(tipo)) errors.push(`tipo inválido (${tipo})`);

          const parseBool = (s: string) => {
            const v = s.trim().toLowerCase();
            return ["true", "1", "sí", "si", "yes", "y", "x"].includes(v);
          };
          const parseNumOpt = (s: string | undefined): number | null => {
            if (s === undefined) return null;
            const t = s.trim();
            if (t === "") return null;
            const n = Number(t);
            return Number.isNaN(n) ? null : n;
          };
          const parseCoord = (s: string | undefined, label: string): number | null => {
            const n = parseNumOpt(s);
            if (n === null) return null;
            if (n < 0 || n > 100) errors.push(`${label} fuera de rango 0-100`);
            return n;
          };

          const opcionesStr = (raw.opciones ?? "").trim();
          const opciones = opcionesStr
            ? opcionesStr.split(";").map((s) => s.trim()).filter(Boolean)
            : null;

          const row: CampoImportRow = {
            clave,
            etiqueta,
            tipo,
            seccion_nombre: (raw.seccion_nombre ?? "").trim() || null,
            pagina: parseNumOpt(raw.pagina) ?? 1,
            requerido: parseBool(raw.requerido ?? ""),
            longitud_max: parseNumOpt(raw.longitud_max),
            opciones,
            mapeo_perfil: (raw.mapeo_perfil ?? "").trim() || null,
            mapeo_poliza: (raw.mapeo_poliza ?? "").trim() || null,
            mapeo_siniestro: (raw.mapeo_siniestro ?? "").trim() || null,
            mapeo_medico: (raw.mapeo_medico ?? "").trim() || null,
            campo_x: parseCoord(raw.campo_x, "campo_x"),
            campo_y: parseCoord(raw.campo_y, "campo_y"),
            campo_ancho: parseCoord(raw.campo_ancho, "campo_ancho"),
            campo_alto: parseCoord(raw.campo_alto, "campo_alto"),
          };

          if (errors.length > 0) return { ok: false, row: null, errors };
          return { ok: true, row, errors: [] };
        }}
        onImport={async (rows) => {
          await importMut.mutateAsync(rows);
        }}
      />
    </div>
  );
}