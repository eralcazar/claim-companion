import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Login from "@/pages/Login";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/perfil" element={<Profile />} />
              <Route path="/perfil/firmas" element={<FirmasManager />} />
              <Route path="/polizas" element={<Policies />} />
              <Route path="/reclamos" element={<Claims />} />
              <Route path="/formatos" element={<Formats />} />
              <Route path="/recetas" element={<Recetas />} />
              <Route path="/estudios" element={<Estudios />} />
              <Route path="/tendencias" element={<Tendencias />} />
              <Route path="/presion" element={<PresionArterial />} />
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
              <Route path="/checkout/return" element={<CheckoutReturn />} />
              <Route path="/admin/productos" element={<ProductManager />} />
              <Route path="/admin/planes" element={<PlanManager />} />
              <Route path="/farmacia/inventario" element={<InventoryManager />} />
              <Route path="/planes" element={<Plans />} />
              <Route path="/suscripcion" element={<Subscription />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
