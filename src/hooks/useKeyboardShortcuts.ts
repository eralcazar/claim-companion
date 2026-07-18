import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

function isTypingTarget(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (el.isContentEditable) return true;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/**
 * Global keyboard shortcuts:
 *  - "/"           → focus main search (any input[data-search-input])
 *  - "g" then "c"  → Catálogo de especialidades
 *  - "g" then "h"  → Inicio (dashboard)
 *  - "g" then "s"  → Historial de salud
 *  - "?"           → toggles the help sheet (see KeyboardShortcutsHelp)
 */
export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const [gPressed, setGPressed] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const focusSearch = useCallback(() => {
    const el =
      (document.querySelector<HTMLInputElement>("[data-search-input]")) ??
      (document.querySelector<HTMLInputElement>('input[type="search"]'));
    if (el) {
      el.focus();
      el.select?.();
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    let gTimer: number | undefined;

    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const typing = isTypingTarget(e.target);

      if (e.key === "?" && !typing) {
        e.preventDefault();
        setHelpOpen((v) => !v);
        return;
      }

      if (e.key === "/" && !typing) {
        e.preventDefault();
        if (!focusSearch()) {
          navigate("/admin/especialidades");
          setTimeout(focusSearch, 250);
        }
        return;
      }

      if (e.key === "Escape") {
        setGPressed(false);
        return;
      }

      if (!typing && e.key.toLowerCase() === "g") {
        setGPressed(true);
        window.clearTimeout(gTimer);
        gTimer = window.setTimeout(() => setGPressed(false), 1200);
        return;
      }

      if (gPressed && !typing) {
        const k = e.key.toLowerCase();
        if (k === "c") { e.preventDefault(); navigate("/admin/especialidades"); setGPressed(false); }
        else if (k === "h") { e.preventDefault(); navigate("/dashboard"); setGPressed(false); }
        else if (k === "s") { e.preventDefault(); navigate("/historial-salud"); setGPressed(false); }
        else setGPressed(false);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(gTimer);
    };
  }, [gPressed, navigate, focusSearch]);

  return { helpOpen, setHelpOpen };
}