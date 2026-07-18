import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, ArrowRight, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import {
  useSavedSearches,
  useTouchSavedSearch,
  useDeleteSavedSearch,
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

  if (isLoading || searches.length === 0) return null;

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
          {searches.slice(0, 5).map((s) => {
            const href = `/admin/especialidades${toSearchParamsString(s)}`;
            return (
              <li key={s.id} className="flex items-center gap-2 rounded-lg bg-muted/50 p-2 focus-within:ring-2 focus-within:ring-ring">
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-destructive"
                  onClick={() => del.mutate(s.id)}
                  aria-label={`Eliminar búsqueda ${s.nombre}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}