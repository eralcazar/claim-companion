import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Eraser } from "lucide-react";

interface Props {
  value?: string; // base64 PNG
  onChange: (dataUrl: string) => void;
  height?: number;
  label?: string;
}

export default function SignatureCanvas({ value, onChange, height = 150, label }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [drawing, setDrawing] = useState(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);

  // Initialize canvas: set width to container, restore stored value if any
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const parent = c.parentElement;
    if (!parent) return;
    const ratio = window.devicePixelRatio || 1;
    const w = parent.clientWidth;
    c.width = w * ratio;
    c.height = height * ratio;
    c.style.width = `${w}px`;
    c.style.height = `${height}px`;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f172a";
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, w, height);
      img.src = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getPoint = (e: React.MouseEvent | React.TouchEvent) => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    const ev = "touches" in e ? e.touches[0] : (e as React.MouseEvent);
    return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setDrawing(true);
    lastRef.current = getPoint(e);
  };

  const move = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !lastRef.current) return;
    const p = getPoint(e);
    ctx.beginPath();
    ctx.moveTo(lastRef.current.x, lastRef.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastRef.current = p;
  };

  const end = () => {
    if (!drawing) return;
    setDrawing(false);
    lastRef.current = null;
    const c = canvasRef.current;
    if (c) onChange(c.toDataURL("image/png"));
  };

  const clear = () => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    onChange("");
  };

  return (
    <div className="space-y-2">
      {label && <p className="text-xs font-medium">{label}</p>}
      <div className="rounded-md border bg-background">
        <canvas
          ref={canvasRef}
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
          className="touch-none w-full"
        />
      </div>
      <Button type="button" variant="outline" size="sm" onClick={clear}>
        <Eraser className="h-3 w-3 mr-1" /> Limpiar firma
      </Button>
    </div>
  );
}
