import { useEffect, useRef, useState } from "react";
import type { Campo } from "@/hooks/useFormatos";
import { cn } from "@/lib/utils";

type Handle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw" | null;

interface Props {
  campo: Campo;
  selected: boolean;
  containerRect: DOMRect | null;
  hasMapping: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<Campo>) => void;
  onCommit: (patch: Partial<Campo>) => void;
}

/** Live-draggable/resizable overlay box over the PDF page. */
export function FieldBox({
  campo,
  selected,
  containerRect,
  hasMapping,
  onSelect,
  onChange,
  onCommit,
}: Props) {
  const [drag, setDrag] = useState<{
    mode: "move" | "resize";
    handle: Handle;
    startX: number;
    startY: number;
    orig: { x: number; y: number; w: number; h: number };
  } | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  const x = campo.campo_x ?? 0;
  const y = campo.campo_y ?? 0;
  const w = campo.campo_ancho ?? 10;
  const h = campo.campo_alto ?? 4;

  useEffect(() => {
    if (!drag || !containerRect) return;

    const onMove = (e: PointerEvent) => {
      const dx = ((e.clientX - drag.startX) / containerRect.width) * 100;
      const dy = ((e.clientY - drag.startY) / containerRect.height) * 100;
      const o = drag.orig;
      let nx = o.x;
      let ny = o.y;
      let nw = o.w;
      let nh = o.h;

      if (drag.mode === "move") {
        nx = Math.max(0, Math.min(100 - o.w, o.x + dx));
        ny = Math.max(0, Math.min(100 - o.h, o.y + dy));
      } else {
        const handle = drag.handle!;
        if (handle.includes("e")) nw = Math.max(1, Math.min(100 - o.x, o.w + dx));
        if (handle.includes("s")) nh = Math.max(1, Math.min(100 - o.y, o.h + dy));
        if (handle.includes("w")) {
          const nWidth = Math.max(1, o.w - dx);
          nx = Math.min(o.x + o.w - 1, Math.max(0, o.x + dx));
          nw = nWidth;
        }
        if (handle.includes("n")) {
          const nHeight = Math.max(1, o.h - dy);
          ny = Math.min(o.y + o.h - 1, Math.max(0, o.y + dy));
          nh = nHeight;
        }
      }

      onChange({
        campo_x: round(nx),
        campo_y: round(ny),
        campo_ancho: round(nw),
        campo_alto: round(nh),
      });
    };

    const onUp = () => {
      onCommit({
        campo_x: campo.campo_x,
        campo_y: campo.campo_y,
        campo_ancho: campo.campo_ancho,
        campo_alto: campo.campo_alto,
      });
      setDrag(null);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [drag, containerRect, onChange, onCommit, campo.campo_x, campo.campo_y, campo.campo_ancho, campo.campo_alto]);

  const startDrag = (
    e: React.PointerEvent,
    mode: "move" | "resize",
    handle: Handle = null,
  ) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    setDrag({
      mode,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      orig: { x, y, w, h },
    });
  };

  const colorClass = hasMapping
    ? "border-emerald-500 bg-emerald-500/10"
    : "border-primary bg-primary/10";

  const handles: { pos: Handle; cls: string }[] = [
    { pos: "nw", cls: "-top-1 -left-1 cursor-nwse-resize" },
    { pos: "n", cls: "-top-1 left-1/2 -translate-x-1/2 cursor-ns-resize" },
    { pos: "ne", cls: "-top-1 -right-1 cursor-nesw-resize" },
    { pos: "e", cls: "top-1/2 -right-1 -translate-y-1/2 cursor-ew-resize" },
    { pos: "se", cls: "-bottom-1 -right-1 cursor-nwse-resize" },
    { pos: "s", cls: "-bottom-1 left-1/2 -translate-x-1/2 cursor-ns-resize" },
    { pos: "sw", cls: "-bottom-1 -left-1 cursor-nesw-resize" },
    { pos: "w", cls: "top-1/2 -left-1 -translate-y-1/2 cursor-ew-resize" },
  ];

  return (
    <div
      ref={ref}
      className={cn(
        "absolute border-2 group transition-shadow",
        colorClass,
        selected && "ring-2 ring-primary ring-offset-1 shadow-lg z-10",
      )}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${w}%`,
        height: `${h}%`,
        cursor: drag?.mode === "move" ? "grabbing" : "grab",
      }}
      onPointerDown={(e) => startDrag(e, "move")}
      title={campo.clave}
    >
      <span
        className={cn(
          "absolute -top-5 left-0 text-[10px] font-mono px-1 rounded bg-background/90 border whitespace-nowrap pointer-events-none",
          selected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
      >
        {campo.clave}
      </span>
      {selected &&
        handles.map((hd) => (
          <div
            key={hd.pos}
            className={cn(
              "absolute h-2 w-2 bg-primary border border-background rounded-sm",
              hd.cls,
            )}
            onPointerDown={(e) => startDrag(e, "resize", hd.pos)}
          />
        ))}
    </div>
  );
}

function round(v: number) {
  return Math.round(v * 100) / 100;
}