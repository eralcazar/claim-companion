import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Login from "@/pages/Login";
import Landing from "@/pages/Landing";
import Legal from "@/pages/Legal";
import Dashboard from "@/pages/Dashboard";
import Profile from "@/pages/Profile";
import FirmasManager from "@/pages/FirmasManager";
import Policies from "@/pages/Policies";
import Claims from "@/pages/Claims";
import NewClaim from "@/pages/NewClaim";
import EditClaim from "@/pages/EditClaim";
import Appointments from "@/pages/Appointments";
import Medications from "@/pages/Medications";
import MedicalRecords from "@/pages/MedicalRecords";
import BrokerPanel from "@/pages/BrokerPanel";
import DoctorPanel from "@/pages/DoctorPanel";
import AdminPanel from "@/pages/AdminPanel";
import PipelineStatus from "@/pages/admin/PipelineStatus";
import FormatManager from "@/pages/admin/FormatManager";
import UserManager from "@/pages/admin/UserManager";
import AccessManager from "@/pages/admin/AccessManager";
import EspecialidadesCatalog from "@/pages/admin/EspecialidadesCatalog";
import MedicosManager from "@/pages/admin/MedicosManager";
import DoctorProfile from "@/pages/DoctorProfile";
import Formats from "@/pages/Formats";
import Recetas from "@/pages/Recetas";
import Estudios from "@/pages/Estudios";
import Tendencias from "@/pages/Tendencias";
import NotFound from "@/pages/NotFound";
import NursePanel from "@/pages/NursePanel";
import LabPanel from "@/pages/LabPanel";
import PharmacyPanel from "@/pages/PharmacyPanel";
import PatientView from "@/pages/PatientView";
import ClaimsWithoutReport from "@/pages/medico/ClaimsWithoutReport";
import PatientPersonnelPage, { AdminPatientPersonnelPage } from "@/pages/PatientPersonnelPage";
import CheckoutReturn from "@/pages/CheckoutReturn";
import ProductManager from "@/pages/admin/ProductManager";
import InventoryManager from "@/pages/admin/InventoryManager";
import PlanManager from "@/pages/admin/PlanManager";
import Plans from "@/pages/Plans";
import Subscription from "@/pages/Subscription";
import Consultorio from "@/pages/Consultorio";
import PresionArterial from "@/pages/PresionArterial";
import Nutricion from "@/pages/Nutricion";
import OxygenSaturation from "@/pages/OxygenSaturation";
import Temperatura from "@/pages/Temperatura";
import Glucosa from "@/pages/Glucosa";
import ExpedienteDigital from "@/pages/ExpedienteDigital";
import Kari from "@/pages/Kari";
import KariTokens from "@/pages/KariTokens";
import KariUsageAdmin from "@/pages/admin/KariUsageAdmin";
import BleDevicesManager from "@/pages/admin/BleDevicesManager";
import McpAuditLog from "@/pages/admin/McpAuditLog";
import NotificationPreferencesPage from "@/pages/NotificationPreferences";
import Procedimientos from "@/pages/Procedimientos";
import Odontograma from "@/pages/Odontograma";
import Domicilio from "@/pages/Domicilio";
import Facturacion from "@/pages/Facturacion";
import OAuthConsent from "@/pages/OAuthConsent";
import DispositivosCompatibles from "@/pages/DispositivosCompatibles";
import HistorialSalud from "@/pages/HistorialSalud";
import DerechosARCO from "@/pages/DerechosARCO";
import IntegrityDashboard from "@/pages/admin/IntegrityDashboard";
import CfdiConfigManager from "@/pages/admin/CfdiConfigManager";
import VerifyShare from "@/pages/public/VerifyShare";
import ShareView from "@/pages/public/ShareView";
import PurchasesManager from "@/pages/farmacia/PurchasesManager";
import PricingManager from "@/pages/farmacia/PricingManager";
import CustomersManager from "@/pages/farmacia/CustomersManager";
import Pos from "@/pages/Pos";
import PharmacyComparator from "@/pages/public/PharmacyComparator";
import Buscar from "@/pages/public/Buscar";
import Especialista from "@/pages/public/Especialista";
import PerfilPublico from "@/pages/medico/PerfilPublico";
import MarketplaceReview from "@/pages/admin/MarketplaceReview";
import Reservar from "@/pages/public/Reservar";

const queryClient = new QueryClient();

function RootRoute() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  if (user) return <Navigate to="/dashboard" replace />;
  return <Landing />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/legal" element={<Legal />} />
            <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
            <Route path="/verificar/:token" element={<VerifyShare />} />
            <Route path="/s/:token" element={<ShareView />} />
            <Route path="/comparador" element={<PharmacyComparator />} />
            <Route path="/comparador/:sku" element={<PharmacyComparator />} />
            <Route path="/buscar" element={<Buscar />} />
            <Route path="/especialista/:slug" element={<Especialista />} />
            <Route path="/reservar/:slug" element={<Reservar />} />
            <Route path="/" element={<RootRoute />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/perfil" element={<Profile />} />
              <Route path="/perfil/firmas" element={<FirmasManager />} />
              <Route path="/polizas" element={<Policies />} />
              <Route path="/reclamos" element={<Claims />} />
              <Route path="/formatos" element={<Formats />} />
              <Route path="/recetas" element={<Recetas />} />
              <Route path="/estudios" element={<Estudios />} />
              <Route path="/tendencias" element={<Tendencias />} />
              <Route path="/presion" element={<PresionArterial />} />
              <Route path="/nutricion" element={<Nutricion />} />
              <Route path="/reclamos/nuevo" element={<NewClaim />} />
              <Route path="/reclamos/editar/:id" element={<EditClaim />} />
              <Route path="/agenda" element={<Appointments />} />
              <Route path="/medicamentos" element={<Medications />} />
              <Route path="/registros" element={<MedicalRecords />} />
              <Route path="/broker" element={<BrokerPanel />} />
              <Route path="/medico" element={<DoctorPanel />} />
              <Route path="/medico/reclamos-sin-informe" element={<ClaimsWithoutReport />} />
              <Route path="/consultorio" element={<Consultorio />} />
              <Route path="/consultorio/:appointmentId" element={<Consultorio />} />
              <Route path="/enfermeria" element={<NursePanel />} />
              <Route path="/laboratorio" element={<LabPanel />} />
              <Route path="/farmacia" element={<PharmacyPanel />} />
              <Route path="/personal/paciente/:id" element={<PatientView />} />
              <Route path="/perfil/accesos" element={<PatientPersonnelPage />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/admin/accesos-pacientes" element={<AdminPatientPersonnelPage />} />
              <Route path="/admin/pipeline-status" element={<PipelineStatus />} />
              <Route path="/admin/gestor-archivos" element={<FormatManager />} />
              <Route path="/admin/usuarios" element={<UserManager />} />
              <Route path="/admin/perfiles-acceso" element={<AccessManager />} />
              <Route path="/admin/especialidades" element={<EspecialidadesCatalog />} />
              <Route path="/admin/medicos" element={<MedicosManager />} />
              <Route path="/medico/perfil" element={<DoctorProfile />} />
              <Route path="/medico/perfil-publico" element={<PerfilPublico />} />
              <Route path="/admin/marketplace" element={<MarketplaceReview />} />
              <Route path="/checkout/return" element={<CheckoutReturn />} />
              <Route path="/admin/productos" element={<ProductManager />} />
              <Route path="/admin/planes" element={<PlanManager />} />
              <Route path="/farmacia/inventario" element={<InventoryManager />} />
              <Route path="/farmacia/compras" element={<PurchasesManager />} />
              <Route path="/farmacia/precios" element={<PricingManager />} />
              <Route path="/farmacia/clientes" element={<CustomersManager />} />
              <Route path="/pos" element={<Pos />} />
              <Route path="/planes" element={<Plans />} />
              <Route path="/suscripcion" element={<Subscription />} />
              <Route path="/oxygen-saturation" element={<OxygenSaturation />} />
              <Route path="/temperatura" element={<Temperatura />} />
              <Route path="/glucosa" element={<Glucosa />} />
              <Route path="/expediente" element={<ExpedienteDigital />} />
              <Route path="/kari" element={<Kari />} />
              <Route path="/kari/tokens" element={<KariTokens />} />
              <Route path="/admin/kari-uso" element={<KariUsageAdmin />} />
              <Route path="/admin/ble-devices" element={<BleDevicesManager />} />
              <Route path="/admin/mcp-audit" element={<McpAuditLog />} />
              <Route path="/perfil/notificaciones" element={<NotificationPreferencesPage />} />
              <Route path="/dispositivos" element={<DispositivosCompatibles />} />
              <Route path="/historial-salud" element={<HistorialSalud />} />
              <Route path="/derechos-arco" element={<DerechosARCO />} />
              <Route path="/admin/integridad" element={<IntegrityDashboard />} />
              <Route path="/procedimientos" element={<Procedimientos />} />
              <Route path="/odontograma" element={<Odontograma />} />
              <Route path="/domicilio" element={<Domicilio />} />
              <Route path="/facturacion" element={<Facturacion />} />
              <Route path="/admin/facturacion" element={<CfdiConfigManager />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
