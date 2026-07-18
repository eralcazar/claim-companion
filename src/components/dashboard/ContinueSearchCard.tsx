import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ArrowRight, Trash2, Pin, PinOff, Pencil, ArrowUp, ArrowDown, Check, X } from "lucide-react";
import { Link } from "react-router-dom";
import {
  useSavedSearches,
  useTouchSavedSearch,
  useDeleteSavedSearch,
  useRenameSavedSearch,
  useTogglePinSavedSearch,
  useReorderSavedSearches,
  toSearchParamsString,
  type SavedSearch,
} from "@/hooks/useSavedSearches";

function describe(s: SavedSearch) {
  const parts: string[] = [];
  if (s.q) parts.push(`“${s.q}”`);
  if (s.area && s.area !== "todas") parts.push(s.area);
  if (s.pais && s.pais !== "todos") parts.push(s.pais);
  if (s.sector && s.sector !== "todos") parts.push(s.sector);
  if (s.only_favs) parts.push("solo favoritas");
  return parts.length ? parts.join(" · ") : "Sin filtros";
}

export function ContinueSearchCard() {
  const { data: searches = [], isLoading } = useSavedSearches();
  const touch = useTouchSavedSearch();
  const del = useDeleteSavedSearch();
  const rename = useRenameSavedSearch();
  const pin = useTogglePinSavedSearch();
  const reorder = useReorderSavedSearches();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  if (isLoading || searches.length === 0) return null;

  const visible = searches.slice(0, 5);

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= visible.length) return;
    // reorder only within the same pinned group
    if (visible[index].pinned !== visible[target].pinned) return;
    const next = [...visible];
    [next[index], next[target]] = [next[target], next[index]];
    reorder.mutate(next.map((s) => s.id));
  };

  const startEdit = (s: SavedSearch) => {
    setEditingId(s.id);
    setEditValue(s.nombre);
  };

  const commitEdit = (id: string) => {
    if (editValue.trim()) rename.mutate({ id, nombre: editValue });
    setEditingId(null);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-heading">
          <Search className="h-5 w-5 text-primary" />
          Continuar con mi búsqueda
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2" aria-label="Búsquedas guardadas">
          {visible.map((s, idx) => {
            const href = `/admin/especialidades${toSearchParamsString(s)}`;
            const isEditing = editingId === s.id;
            return (
              <li
                key={s.id}
                className="flex items-center gap-1 rounded-lg bg-muted/50 p-2 focus-within:ring-2 focus-within:ring-ring"
              >
                {s.pinned && <Pin className="h-3 w-3 text-primary shrink-0" aria-label="Fijada" />}
                {isEditing ? (
                  <div className="flex-1 flex items-center gap-1">
                    <Input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitEdit(s.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="h-8 text-sm"
                      aria-label="Nuevo nombre de la búsqueda"
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => commitEdit(s.id)} aria-label="Guardar nombre">
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)} aria-label="Cancelar edición">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                  asChild
                  variant="ghost"
                  className="flex-1 justify-start h-auto py-2 px-2 text-left"
                  onClick={() => touch.mutate(s.id)}
                >
                  <Link to={href} aria-label={`Abrir búsqueda ${s.nombre}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.nombre}</p>
                      <p className="text-xs text-muted-foreground truncate">{describe(s)}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                  </Link>
                </Button>
                )}
                {!isEditing && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground"
                      onClick={() => move(idx, -1)}
                      aria-label={`Subir ${s.nombre}`}
                      disabled={idx === 0 || visible[idx - 1]?.pinned !== s.pinned}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground"
                      onClick={() => move(idx, 1)}
                      aria-label={`Bajar ${s.nombre}`}
                      disabled={idx === visible.length - 1 || visible[idx + 1]?.pinned !== s.pinned}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground"
                      onClick={() => pin.mutate({ id: s.id, pinned: !s.pinned })}
                      aria-label={s.pinned ? `Desfijar ${s.nombre}` : `Fijar ${s.nombre}`}
                      aria-pressed={s.pinned}
                    >
                      {s.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground"
                      onClick={() => startEdit(s)}
                      aria-label={`Renombrar ${s.nombre}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-destructive"
                  onClick={() => del.mutate(s.id)}
                  aria-label={`Eliminar búsqueda ${s.nombre}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}