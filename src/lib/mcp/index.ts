import { auth, defineMcp } from "@lovable.dev/mcp-js";
import { withAudit } from "./audit";
import whoami from "./tools/whoami";
import listRecetas from "./tools/list-recetas";
import getReceta from "./tools/get-receta";
import listPharmacyCatalog from "./tools/list-pharmacy-catalog";
import listPharmacyInventory from "./tools/list-pharmacy-inventory";
import listPharmacyOrders from "./tools/list-pharmacy-orders";
import listEstudios from "./tools/list-estudios";
import getPatientSummary from "./tools/get-patient-summary";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "carecentral-mcp",
  title: "CareCentral MCP",
  version: "0.1.0",
  instructions:
    "Herramientas para CareCentral: expediente digital, recetas, farmacia (catálogo, inventario, órdenes) y estudios de laboratorio. Toda lectura respeta los permisos del usuario conectado (RLS). Empieza con `whoami` para conocer el rol y capacidades.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    whoami,
    listRecetas,
    getReceta,
    listPharmacyCatalog,
    listPharmacyInventory,
    listPharmacyOrders,
    listEstudios,
    getPatientSummary,
  ].map(withAudit),
});