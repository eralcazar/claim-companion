import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

function isTypingTarget(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (el.isContentEditable) return true;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export const SHORTCUT_HELP_EVENT = "carecentral:toggle-shortcut-help";
export function toggleShortcutHelp(open?: boolean) {
  window.dispatchEvent(new CustomEvent(SHORTCUT_HELP_EVENT, { detail: { open } }));
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
    let gPressed = false;

    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const typing = isTypingTarget(e.target);

      if (e.key === "?" && !typing) {
        e.preventDefault();
        toggleShortcutHelp();
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
        gPressed = false;
        return;
      }

      if (!typing && e.key.toLowerCase() === "g") {
        gPressed = true;
        window.clearTimeout(gTimer);
        gTimer = window.setTimeout(() => { gPressed = false; }, 1200);
        return;
      }

      if (gPressed && !typing) {
        const k = e.key.toLowerCase();
        if (k === "c") { e.preventDefault(); navigate("/admin/especialidades"); gPressed = false; }
        else if (k === "h") { e.preventDefault(); navigate("/dashboard"); gPressed = false; }
        else if (k === "s") { e.preventDefault(); navigate("/historial-salud"); gPressed = false; }
        else gPressed = false;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(gTimer);
    };
  }, [navigate, focusSearch]);
}