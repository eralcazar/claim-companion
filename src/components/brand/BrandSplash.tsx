import { useEffect, useState } from "react";
import { CareCentralLogo } from "./CareCentralLogo";
import { cn } from "@/lib/utils";

const SESSION_KEY = "carecentral_splash_shown";

export function BrandSplash() {
  const [show, setShow] = useState(false);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, "1");
    setShow(true);
    const t1 = setTimeout(() => setFade(true), 900);
    const t2 = setTimeout(() => setShow(false), 1400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center bg-background transition-opacity duration-500",
        fade ? "opacity-0 pointer-events-none" : "opacity-100",
      )}
      aria-hidden
    >
      <div
        className="absolute inset-0"
        style={{ background: "var(--gradient-hero)" }}
      />
      <div className="relative animate-in fade-in zoom-in-95 duration-700">
        <div
          className="absolute -inset-8 rounded-full blur-3xl opacity-40"
          style={{ background: "var(--gradient-brand)" }}
        />
        <div className="relative">
          <CareCentralLogo size={140} withText />
        </div>
      </div>
    </div>
  );
}