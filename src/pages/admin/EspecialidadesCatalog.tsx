import { useMemo, useRef, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  useEspecialidades,
  useUpsertEspecialidad,
  useDeleteEspecialidad,
  useEspecialidadFavoritos,
  useToggleEspecialidadFavorito,
  type Especialidad,
} from "@/hooks/useEspecialidades";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Trash2, Save, Search, Star, Link as LinkIcon, X } from "lucide-react";
import { toast } from "sonner";

export default function EspecialidadesCatalog() {
  const { roles } = useAuth();
  const { data: especialidades = [] } = useEspecialidades();
  const { data: favoritos } = useEspecialidadFavoritos();
  const toggleFav = useToggleEspecialidadFavorito();
  const upsert = useUpsertEspecialidad();
  const del = useDeleteEspecialidad();
  const [newName, setNewName] = useState("");
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const area = searchParams.get("area") ?? "todas";
  const pais = searchParams.get("pais") ?? "todos";
  const sector = searchParams.get("sector") ?? "todos";
  const onlyFavs = searchParams.get("favs") === "1";
  const searchInputRef = useRef<HTMLInputElement>(null);

  const updateParam = (key: string, value: string, defaultVal: string) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === defaultVal) next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  };
  const setQuery = (v: string) => updateParam("q", v, "");
  const setArea = (v: string) => updateParam("area", v, "todas");
  const setPais = (v: string) => updateParam("pais", v, "todos");
  const setSector = (v: string) => updateParam("sector", v, "todos");
  const setOnlyFavs = (v: boolean) => updateParam("favs", v ? "1" : "", "");

  const hasActiveFilters =
    !!query || area !== "todas" || pais !== "todos" || sector !== "todos" || onlyFavs;

  const clearFilters = () => {
    setSearchParams(new URLSearchParams(), { replace: true });
    requestAnimationFrame(() => searchInputRef.current?.focus());
  };

  const shareFilters = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Enlace copiado con los filtros actuales");
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  };

  if (!roles.includes("admin")) return <Navigate to="/" replace />;

  const handleAdd = () => {
    const nombre = newName.trim();
    if (!nombre) return;
    upsert.mutate({ nombre, activa: true });
    setNewName("");
  };

  const areas = useMemo(
    () => Array.from(new Set(especialidades.map((e) => e.area).filter(Boolean))) as string[],
    [especialidades],
  );
  const paises = useMemo(
    () => Array.from(new Set(especialidades.map((e) => e.pais).filter(Boolean))) as string[],
    [especialidades],
  );
  const sectores = useMemo(
    () => Array.from(new Set(especialidades.map((e) => e.sector).filter(Boolean))) as string[],
    [especialidades],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return especialidades
      .filter((e) => (area === "todas" ? true : e.area === area))
      .filter((e) => (pais === "todos" ? true : e.pais === pais))
      .filter((e) => (sector === "todos" ? true : e.sector === sector))
      .filter((e) => (onlyFavs ? favoritos?.has(e.id) : true))
      .filter((e) => (q ? e.nombre.toLowerCase().includes(q) : true))
      .sort((a, b) => {
        const fa = favoritos?.has(a.id) ? 0 : 1;
        const fb = favoritos?.has(b.id) ? 0 : 1;
        if (fa !== fb) return fa - fb;
        return a.nombre.localeCompare(b.nombre, "es");
      });
  }, [especialidades, query, area, pais, sector, onlyFavs, favoritos]);

  const totalActivas = especialidades.filter((e) => e.activa).length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Catálogo de Especialidades</h1>
        <p className="text-sm text-muted-foreground">
          Especialidades médicas disponibles para asignar a los doctores.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant="secondary">Total: {especialidades.length}</Badge>
          <Badge variant="secondary">Activas: {totalActivas}</Badge>
          <Badge variant="secondary">Favoritas: {favoritos?.size ?? 0}</Badge>
        </div>
      </div>

      <Card className="p-4 space-y-4">
        <div className="flex gap-2">
          <Input
            aria-label="Nueva especialidad"
            placeholder="Nueva especialidad (ej. Cardiología)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button onClick={handleAdd} disabled={!newName.trim() || upsert.isPending}>
            <Plus className="h-4 w-4" />
            Agregar
          </Button>
        </div>

        <div className="grid gap-2 md:grid-cols-5">
          <div className="relative md:col-span-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              ref={searchInputRef}
              aria-label="Buscar especialidad"
              className="pl-8"
              placeholder="Buscar especialidad…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape" && query) {
                  e.preventDefault();
                  setQuery("");
                }
              }}
            />
          </div>
          <Select value={area} onValueChange={setArea}>
            <SelectTrigger aria-label="Filtrar por área"><SelectValue placeholder="Área" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las áreas</SelectItem>
              {areas.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={pais} onValueChange={setPais}>
            <SelectTrigger aria-label="Filtrar por país"><SelectValue placeholder="País" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los países</SelectItem>
              {paises.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sector} onValueChange={setSector}>
            <SelectTrigger aria-label="Filtrar por sector"><SelectValue placeholder="Sector" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los sectores</SelectItem>
              {sectores.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="only-favs" checked={onlyFavs} onCheckedChange={setOnlyFavs} />
          <label htmlFor="only-favs" className="text-sm cursor-pointer">Solo favoritas</label>
          <div className="ml-auto flex items-center gap-2">
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} aria-label="Limpiar todos los filtros">
                <X className="h-3.5 w-3.5" /> Limpiar
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={shareFilters} aria-label="Copiar enlace con los filtros aplicados">
              <LinkIcon className="h-3.5 w-3.5" /> Compartir
            </Button>
            <span
              className="text-xs text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              Mostrando {filtered.length} de {especialidades.length}
            </span>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" aria-label="Favorita"></TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead className="w-32">Área</TableHead>
              <TableHead className="w-32">Activa</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8">
                  <div className="flex flex-col items-center gap-2 text-center" role="status">
                    <p className="text-sm font-medium">
                      {onlyFavs && (favoritos?.size ?? 0) === 0
                        ? "Aún no tienes especialidades favoritas"
                        : "Sin coincidencias"}
                    </p>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      {onlyFavs && (favoritos?.size ?? 0) === 0
                        ? "Marca la ⭐ en cualquier especialidad para verla aquí y que aparezca primero en tus dispositivos."
                        : "Prueba con otro término, quita algún filtro o limpia todo para ver el catálogo completo."}
                    </p>
                    <div className="flex gap-2 pt-1">
                      {hasActiveFilters && (
                        <Button size="sm" variant="outline" onClick={clearFilters}>
                          Limpiar filtros
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => searchInputRef.current?.focus()}
                      >
                        Volver a buscar
                      </Button>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {filtered.map((e) => (
              <EspecialidadRow
                key={e.id}
                e={e}
                favorito={favoritos?.has(e.id) ?? false}
                onToggleFav={() => toggleFav.mutate({ id: e.id, favorito: favoritos?.has(e.id) ?? false })}
                onSave={(payload) => upsert.mutate(payload)}
                onDelete={() => setToDelete(e.id)}
              />
            ))}
          </TableBody>
        </Table>
      </Card>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar especialidad?</AlertDialogTitle>
            <AlertDialogDescription>
              No podrás eliminarla si está asignada a algún médico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (toDelete) del.mutate(toDelete);
                setToDelete(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EspecialidadRow({
  e,
  favorito,
  onToggleFav,
  onSave,
  onDelete,
}: {
  e: Especialidad;
  favorito: boolean;
  onToggleFav: () => void;
  onSave: (payload: { id: string; nombre: string; activa: boolean }) => void;
  onDelete: () => void;
}) {
  const [nombre, setNombre] = useState(e.nombre);
  const [activa, setActiva] = useState(e.activa);
  const dirty = nombre !== e.nombre || activa !== e.activa;

  return (
    <TableRow>
      <TableCell>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onToggleFav}
          aria-label={favorito ? `Quitar ${e.nombre} de favoritas` : `Marcar ${e.nombre} como favorita`}
          aria-pressed={favorito}
        >
          <Star className={`h-4 w-4 ${favorito ? "fill-yellow-400 text-yellow-500" : "text-muted-foreground"}`} />
        </Button>
      </TableCell>
      <TableCell>
        <Input aria-label={`Editar nombre de ${e.nombre}`} value={nombre} onChange={(ev) => setNombre(ev.target.value)} />
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{e.area ?? "—"}</TableCell>
      <TableCell>
        <Switch aria-label={`Activa: ${e.nombre}`} checked={activa} onCheckedChange={setActiva} />
      </TableCell>
      <TableCell className="text-right space-x-1">
        {dirty && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSave({ id: e.id, nombre, activa })}
            aria-label={`Guardar cambios en ${e.nombre}`}
          >
            <Save className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          onClick={onDelete}
          aria-label={`Eliminar ${e.nombre}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
}