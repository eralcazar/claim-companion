import { Link } from "react-router-dom";
import { useAssignedPatients } from "@/hooks/usePatientPersonnel";
import { Card, CardContent } from "@/components/ui/card";
import { Store, ChevronRight, Package, CheckCircle2, ListChecks } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CatalogManager } from "@/components/pharmacy/CatalogManager";
import { usePharmacyOrders, useMarkFulfilled } from "@/hooks/usePharmacy";
import { useLowStock } from "@/hooks/useInventory";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { useAuth } from "@/contexts/AuthContext";
import { AlertTriangle, Boxes } from "lucide-react";

function LowStockWidget() {
  const lowStock = useLowStock();
  if (lowStock.length === 0) return null;
  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <p className="font-medium text-sm">Stock bajo ({lowStock.length})</p>
          <Link to="/farmacia/inventario" className="ml-auto">
            <Button size="sm" variant="outline">
              <Boxes className="h-3 w-3 mr-1" />Ver inventario
            </Button>
          </Link>
        </div>
        <ul className="text-xs space-y-0.5">
          {lowStock.slice(0, 5).map((r) => (
            <li key={r.catalog_id} className="flex justify-between">
              <span className="truncate">{r.catalog?.nombre || r.catalog_id}</span>
              <span className="tabular-nums text-destructive">{r.stock_actual} / mín {r.stock_minimo}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function OrderList({ status }: { status: "pagada" | "surtida" | "pendiente_pago" }) {
  const { data: orders = [], isLoading } = usePharmacyOrders({ status });
  const fulfill = useMarkFulfilled();

  if (isLoading) return <div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  if (orders.length === 0) return <Card><CardContent className="p-8 text-center text-muted-foreground">Sin órdenes.</CardContent></Card>;

  return (
    <div className="space-y-2">
      {orders.map((o: any) => (
        <Card key={o.id}>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="font-medium tabular-nums">${(o.total_centavos / 100).toFixed(2)} {o.moneda?.toUpperCase()}</p>
                <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</p>
              </div>
              <Badge variant={o.status === "pagada" ? "default" : o.status === "surtida" ? "secondary" : "outline"}>
                {o.status}
              </Badge>
            </div>
            <ul className="text-xs text-muted-foreground space-y-0.5">
              {(o.items || []).map((it: any) => (
                <li key={it.id}>{it.cantidad}× {it.nombre_snapshot} {it.presentacion_snapshot && <span>· {it.presentacion_snapshot}</span>}</li>
              ))}
            </ul>
            {status === "pagada" && (
              <Button size="sm" onClick={() => fulfill.mutate(o.id)}>
                <CheckCircle2 className="h-4 w-4 mr-1" />Marcar como surtida
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function PharmacyPanel() {
  const { roles } = useAuth();
  const isPaciente = roles.includes("paciente") && !roles.includes("farmacia");
  const { data: patients = [] } = useAssignedPatients("farmacia");

  // If user is just a patient, redirect them to their own orders view
  if (isPaciente) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <PaymentTestModeBanner />
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
          <Store className="h-6 w-6 text-primary" />Mis pedidos de farmacia
        </h1>
        <Tabs defaultValue="pagada">
          <TabsList>
            <TabsTrigger value="pendiente_pago">Pendientes</TabsTrigger>
            <TabsTrigger value="pagada">Pagadas</TabsTrigger>
            <TabsTrigger value="surtida">Surtidas</TabsTrigger>
          </TabsList>
          <TabsContent value="pendiente_pago"><OrderList status="pendiente_pago" /></TabsContent>
          <TabsContent value="pagada"><OrderList status="pagada" /></TabsContent>
          <TabsContent value="surtida"><OrderList status="surtida" /></TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <PaymentTestModeBanner />
      <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
        <Store className="h-6 w-6 text-primary" />Panel Farmacia
      </h1>

      <LowStockWidget />

      <Tabs defaultValue="ordenes">
        <TabsList>
          <TabsTrigger value="ordenes"><Package className="h-4 w-4 mr-1" />Órdenes</TabsTrigger>
          <TabsTrigger value="catalogo"><ListChecks className="h-4 w-4 mr-1" />Catálogo</TabsTrigger>
          <TabsTrigger value="pacientes">Pacientes</TabsTrigger>
        </TabsList>

        <TabsContent value="ordenes" className="space-y-4">
          <Tabs defaultValue="pagada">
            <TabsList>
              <TabsTrigger value="pagada">Pagadas</TabsTrigger>
              <TabsTrigger value="pendiente_pago">Pendientes</TabsTrigger>
              <TabsTrigger value="surtida">Surtidas</TabsTrigger>
            </TabsList>
            <TabsContent value="pagada"><OrderList status="pagada" /></TabsContent>
            <TabsContent value="pendiente_pago"><OrderList status="pendiente_pago" /></TabsContent>
            <TabsContent value="surtida"><OrderList status="surtida" /></TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="catalogo">
          <CatalogManager />
        </TabsContent>

        <TabsContent value="pacientes">
          {patients.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Sin pacientes asignados.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {patients.map((p) => (
                <Link key={p.id} to={`/personal/paciente/${p.patient_id}`}>
                  <Card>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{p.patient_name}</p>
                        <p className="text-xs text-muted-foreground">{p.patient_email}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}