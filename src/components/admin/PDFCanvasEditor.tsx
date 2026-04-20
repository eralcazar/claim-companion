import { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page } from "react-pdf";
import "@/lib/pdfWorker";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import type { Campo } from "@/hooks/useFormatos";
import { FieldBox } from "./FieldBox";
import { ProposalBox } from "./ProposalBox";
import type { ProposedField } from "./VisualEditor";
import { Loader2 } from "lucide-react";

interface Props {
  url: string;
  page: number;
  zoom: number;
  campos: Campo[];
  selectedId: string | null;
  creating: boolean;
  onSelect: (id: string | null) => void;
  onChangeCampo: (id: string, patch: Partial<Campo>) => void;
  onCommitCampo: (id: string, patch: Partial<Campo>) => void;
  onCreate: (rect: { x: number; y: number; w: number; h: number }) => void;
  onLoadSuccess: (numPages: number) => void;
  proposals?: ProposedField[];
  selectedProposalKey?: string | null;
  onSelectProposal?: (key: string | null) => void;
}

export function PDFCanvasEditor({
  url,
  page,
  zoom,
  campos,
  selectedId,
  creating,
  onSelect,
  onChangeCampo,
  onCommitCampo,
  onCreate,
  onLoadSuccess,
  proposals = [],
  selectedProposalKey = null,
  onSelectProposal,
}: Props) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);
  const [draftRect, setDraftRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const draftStart = useRef<{ x: number; y: number } | null>(null);

  const updateRect = () => {
    if (overlayRef.current) {
      setContainerRect(overlayRef.current.getBoundingClientRect());
    }
  };

  useEffect(() => {
    const ro = new ResizeObserver(updateRect);
    if (overlayRef.current) ro.observe(overlayRef.current);
    window.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
    };
  }, []);

  // Mouse-down on empty area: deselect or start drawing in creating mode.
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.target !== overlayRef.current) return;
    const rect = overlayRef.current!.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;

    if (!creating) {
      onSelect(null);
      return;
    }

    draftStart.current = { x: px, y: py };
    setDraftRect({ x: px, y: py, w: 0, h: 0 });

    const onMove = (ev: PointerEvent) => {
      const r = overlayRef.current!.getBoundingClientRect();
      const cx = ((ev.clientX - r.left) / r.width) * 100;
      const cy = ((ev.clientY - r.top) / r.height) * 100;
      const sx = draftStart.current!.x;
      const sy = draftStart.current!.y;
      setDraftRect({
        x: Math.min(sx, cx),
        y: Math.min(sy, cy),
        w: Math.abs(cx - sx),
        h: Math.abs(cy - sy),
      });
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      const r = draftRectRef.current;
      if (r && r.w > 1 && r.h > 1) {
        onCreate({
          x: round(r.x),
          y: round(r.y),
          w: round(r.w),
          h: round(r.h),
        });
      }
      setDraftRect(null);
      draftStart.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  };

  // Keep latest draftRect in a ref so onUp closure sees it.
  const draftRectRef = useRef(draftRect);
  useEffect(() => {
    draftRectRef.current = draftRect;
  }, [draftRect]);

  const camposPagina = useMemo(
    () => campos.filter((c) => (c.campo_pagina ?? 1) === page),
    [campos, page],
  );

  const proposalsPagina = useMemo(
    () => proposals.filter((p) => p.page === page),
    [proposals, page],
  );

  return (
    <div className="relative inline-block">
      <Document
        file={url}
        onLoadSuccess={({ numPages }) => onLoadSuccess(numPages)}
        loading={
          <div className="flex h-96 w-96 items-center justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        }
        error={
          <div className="flex h-96 w-96 items-center justify-center p-4 text-center text-sm text-destructive">
            No se pudo cargar el PDF.
          </div>
        }
      >
        <Page
          pageNumber={page}
          scale={zoom}
          onRenderSuccess={updateRect}
          renderAnnotationLayer={false}
          renderTextLayer={false}
        />
      </Document>
      <div
        ref={overlayRef}
        className="absolute inset-0"
        style={{ cursor: creating ? "crosshair" : "default" }}
        onPointerDown={onPointerDown}
      >
        {camposPagina.map((c) => (
          <FieldBox
            key={c.id}
            campo={c}
            selected={c.id === selectedId}
            containerRect={containerRect}
            hasMapping={!!(c.mapeo_perfil || c.mapeo_poliza || c.mapeo_siniestro || c.mapeo_medico)}
            onSelect={() => onSelect(c.id)}
            onChange={(patch) => onChangeCampo(c.id, patch)}
            onCommit={(patch) => onCommitCampo(c.id, patch)}
          />
        ))}
        {proposalsPagina.map((p) => (
          <ProposalBox
            key={p.clave}
            proposal={p}
            selected={p.clave === selectedProposalKey}
            onSelect={() => onSelectProposal?.(p.clave)}
          />
        ))}
        {draftRect && (
          <div
            className="absolute border-2 border-dashed border-primary bg-primary/10 pointer-events-none"
            style={{
              left: `${draftRect.x}%`,
              top: `${draftRect.y}%`,
              width: `${draftRect.w}%`,
              height: `${draftRect.h}%`,
            }}
          />
        )}
      </div>
    </div>
  );
}

function round(v: number) {
  return Math.round(v * 100) / 100;
}