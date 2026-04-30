import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  size?: number;
  withText?: boolean;
}

export function CareCentralLogo({ className, size = 40, withText = false }: Props) {
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="CareCentral"
      >
        <defs>
          <linearGradient id="cc-grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="hsl(173 80% 40%)" />
            <stop offset="100%" stopColor="hsl(187 85% 53%)" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#cc-grad)" />
        {/* Cruz médica + corazón */}
        <path
          d="M32 18c-3.5-5-12-3-12 4 0 6 6 11 12 16 6-5 12-10 12-16 0-7-8.5-9-12-4z"
          fill="white"
          fillOpacity="0.95"
        />
        <rect x="29" y="38" width="6" height="14" rx="1.5" fill="white" />
        <rect x="22" y="42" width="20" height="6" rx="1.5" fill="white" />
      </svg>
      {withText && (
        <span className="font-heading text-xl font-bold tracking-tight text-foreground">
          Care<span className="text-primary">Central</span>
        </span>
      )}
    </div>
  );
}