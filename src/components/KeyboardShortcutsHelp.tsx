import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Keyboard } from "lucide-react";
import { SHORTCUT_HELP_EVENT, toggleShortcutHelp } from "@/hooks/useKeyboardShortcuts";

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-muted px-2 py-0.5 text-xs font-mono shadow-sm">
      {children}
    </kbd>
  );
}

export function KeyboardShortcutsHelp() {
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ open?: boolean }>).detail;
      setHelpOpen((v) => (typeof detail?.open === "boolean" ? detail.open : !v));
    };
    window.addEventListener(SHORTCUT_HELP_EVENT, handler);
    return () => window.removeEventListener(SHORTCUT_HELP_EVENT, handler);
  }, []);

  const rows: Array<[React.ReactNode, string]> = [
    [<><Kbd>/</Kbd></>, "Enfocar la búsqueda"],
    [<><Kbd>g</Kbd> <span className="text-muted-foreground text-xs">luego</span> <Kbd>c</Kbd></>, "Ir al Catálogo de especialidades"],
    [<><Kbd>g</Kbd> <span className="text-muted-foreground text-xs">luego</span> <Kbd>h</Kbd></>, "Ir a Inicio"],
    [<><Kbd>g</Kbd> <span className="text-muted-foreground text-xs">luego</span> <Kbd>s</Kbd></>, "Ir a Historial de salud"],
    [<><Kbd>Esc</Kbd></>, "Limpiar el texto de búsqueda"],
    [<><Kbd>?</Kbd></>, "Abrir / cerrar esta ayuda"],
  ];

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Ver atajos de teclado"
        onClick={() => toggleShortcutHelp(true)}
        className="hidden md:inline-flex"
      >
        <Keyboard className="h-4 w-4" />
      </Button>
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Atajos de teclado</DialogTitle>
            <DialogDescription>
              Navega por CareCentral sin salir del teclado.
            </DialogDescription>
          </DialogHeader>
          <ul className="divide-y divide-border" aria-label="Lista de atajos">
            {rows.map(([keys, label], i) => (
              <li key={i} className="flex items-center justify-between gap-4 py-2">
                <span className="text-sm">{label}</span>
                <span className="flex items-center gap-1">{keys}</span>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}