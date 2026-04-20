import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  useAseguradoras,
  useFormularios,
  useCampos,
  useSecciones,
  useUpdateFormulario,
  type Formulario,
} from "@/hooks/useFormatos";
import { InsurerTree } from "@/components/admin/InsurerTree";
import { FormHeader } from "@/components/admin/FormHeader";
import { FieldsTable } from "@/components/admin/FieldsTable";
import { SectionsList } from "@/components/admin/SectionsList";
import { VisualEditor } from "@/components/admin/VisualEditor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { FolderTree, Save, HardDrive } from "lucide-react";
import { StorageManager } from "@/components/admin/StorageManager";

export default function FormatManager() {
  const { roles } = useAuth();
  const { data: aseguradoras } = useAseguradoras();
  const { data: formularios } = useFormularios();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!roles.includes("admin")) return <Navigate to="/" replace />;

  const selected = formularios?.find((f) => f.id === selectedId) ?? null;
  const aseguradora = aseguradoras?.find((a) => a.id === selected?.aseguradora_id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Gestor de Formatos</h1>
          <p className="text-sm text-muted-foreground">
            Define los campos, mapeos y coordenadas de cada PDF de aseguradora.
          </p>
        </div>
        {/* Mobile tree trigger */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="md:hidden">
              <FolderTree className="h-4 w-4" />
              Aseguradoras
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0">
            <div className="border-b p-3 font-medium">Aseguradoras</div>
            <div className="overflow-y-auto h-[calc(100vh-3rem)]">
              <InsurerTree
                selectedId={selectedId}
                onSelect={(f) => setSelectedId(f.id)}
              />
            </div>
          </SheetContent>
        </Sheet>
        {/* Global storage manager */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm">
              <HardDrive className="h-4 w-4" />
              Archivos del bucket
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
            <div className="space-y-3 pt-4">
              <h2 className="text-lg font-semibold">Archivos del bucket "formatos"</h2>
              <p className="text-sm text-muted-foreground">
                Gestiona carpetas y archivos PDF de los formatos de aseguradoras.
              </p>
              <StorageManager />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="grid gap-4 md:grid-cols-[280px_1fr]">
        {/* Desktop tree */}
        <Card className="hidden md:block max-h-[calc(100vh-12rem)] overflow-y-auto">
          <InsurerTree
            selectedId={selectedId}
            onSelect={(f) => setSelectedId(f.id)}
          />
        </Card>

        <div className="space-y-4">
          {!selected && (
            <Card className="p-12 text-center text-muted-foreground">
              Selecciona un formulario del árbol para editar sus campos.
            </Card>
          )}
          {selected && (
            <FormDetail formulario={selected} aseguradoraNombre={aseguradora?.nombre} />
          )}
        </div>
      </div>
    </div>
  );
}

function FormDetail({
  formulario,
  aseguradoraNombre,
}: {
  formulario: Formulario;
  aseguradoraNombre?: string;
}) {
  const { data: campos = [] } = useCampos(formulario.id);
  const { data: secciones = [] } = useSecciones(formulario.id);
  const { data: aseguradoras } = useAseguradoras();
  const aseguradora = aseguradoras?.find((a) => a.id === formulario.aseguradora_id);

  return (
    <>
      <FormHeader
        formulario={formulario}
        aseguradora={aseguradora}
        totalCampos={campos.length}
      />
      <Tabs defaultValue="campos">
        <TabsList>
          <TabsTrigger value="campos">Campos ({campos.length})</TabsTrigger>
          <TabsTrigger value="secciones">Secciones ({secciones.length})</TabsTrigger>
          <TabsTrigger value="visual">Editor visual</TabsTrigger>
          <TabsTrigger value="info">Info</TabsTrigger>
        </TabsList>
        <TabsContent value="campos" className="mt-4">
          <FieldsTable formularioId={formulario.id} secciones={secciones} />
        </TabsContent>
        <TabsContent value="secciones" className="mt-4">
          <SectionsList formularioId={formulario.id} secciones={secciones} />
        </TabsContent>
        <TabsContent value="visual" className="mt-4">
          <VisualEditor formulario={formulario} />
        </TabsContent>
        <TabsContent value="info" className="mt-4">
          <InfoTab formulario={formulario} />
        </TabsContent>
      </Tabs>
    </>
  );
}

function InfoTab({ formulario }: { formulario: Formulario }) {
  const update = useUpdateFormulario();
  const [form, setForm] = useState({
    nombre_display: formulario.nombre_display,
    total_paginas: formulario.total_paginas,
    total_campos_estimado: formulario.total_campos_estimado,
    activo: formulario.activo,
  });

  return (
    <Card className="p-4 space-y-4 max-w-xl">
      <div className="space-y-2">
        <Label>Nombre display</Label>
        <Input
          value={form.nombre_display}
          onChange={(e) => setForm({ ...form, nombre_display: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Total páginas</Label>
          <Input
            type="number"
            value={form.total_paginas}
            onChange={(e) => setForm({ ...form, total_paginas: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label>Campos estimados</Label>
          <Input
            type="number"
            value={form.total_campos_estimado}
            onChange={(e) =>
              setForm({ ...form, total_campos_estimado: Number(e.target.value) })
            }
          />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="activo">Activo</Label>
        <Switch
          id="activo"
          checked={form.activo}
          onCheckedChange={(v) => setForm({ ...form, activo: v })}
        />
      </div>
      <Button
        onClick={() => update.mutate({ id: formulario.id, ...form })}
        disabled={update.isPending}
      >
        <Save className="h-4 w-4" />
        Guardar cambios
      </Button>
    </Card>
  );
}