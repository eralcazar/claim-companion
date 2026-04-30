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
        style={{ height: size * 1.4, width: "auto" }}
      />
    );
  }
  return (
    <div
      className={cn("inline-block overflow-hidden", className)}
      style={{ width: size, height: size }}
    >
      <img
        src={logo3d}
        alt="CareCentral"
        className="object-cover object-top"
        // El ícono ocupa ~60% superior del PNG; escalamos y recortamos.
        style={{ width: size, height: size * 1.7, objectPosition: "center top" }}
      />
    </div>
  );
}