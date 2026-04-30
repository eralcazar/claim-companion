import { cn } from "@/lib/utils";
import logo3d from "@/assets/carecentral-logo-3d.png";

interface Props {
  className?: string;
  size?: number;
  withText?: boolean;
}

export function CareCentralLogo({ className, size = 40, withText = false }: Props) {
  // El PNG 3D ya incluye logo + wordmark integrados.
  // - withText=true  => mostramos la imagen completa (logo + "CareCentral")
  // - withText=false => recortamos para mostrar solo el ícono superior
  if (withText) {
    return (
      <img
        src={logo3d}
        alt="CareCentral"
        className={cn("inline-block object-contain", className)}
        style={{ height: size * 1.6, width: "auto" }}
      />
    );
  }
  // Solo ícono: recortamos el ~65% superior del PNG (que contiene el círculo+cruz+mano).
  return (
    <div
      className={cn("inline-block overflow-hidden", className)}
      style={{ width: size, height: size }}
    >
      <img
        src={logo3d}
        alt="CareCentral"
        style={{
          width: size,
          height: size / 0.65,
          objectFit: "cover",
          objectPosition: "center top",
          display: "block",
        }}
      />
    </div>
  );
}