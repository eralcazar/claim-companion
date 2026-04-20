import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import {
  type Aseguradora,
  type Formulario,
  getFormatoPublicUrl,
} from "@/hooks/useFormatos";

interface Props {
  formulario: Formulario;
  aseguradora?: Aseguradora;
  totalCampos: number;
}

export function FormHeader({ formulario, aseguradora, totalCampos }: Props) {
  const url = getFormatoPublicUrl(formulario.storage_path);

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">
            {formulario.nombre_display}
            {aseguradora && (
              <span className="text-muted-foreground"> — {aseguradora.nombre}</span>
            )}
          </h2>
          <p className="font-mono text-xs text-muted-foreground break-all">
            {formulario.storage_path}
          </p>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>Páginas: <strong className="text-foreground">{formulario.total_paginas}</strong></span>
            <span>·</span>
            <span>
              Campos en BD: <strong className="text-foreground">{totalCampos}</strong> / estimado: {formulario.total_campos_estimado}
            </span>
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
            Abrir PDF
          </a>
        </Button>
      </div>
    </Card>
  );
}