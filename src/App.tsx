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
import Formats from "@/pages/Formats";
import NotFound from "@/pages/NotFound";

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
              <Route path="/polizas" element={<Policies />} />
              <Route path="/reclamos" element={<Claims />} />
              <Route path="/formatos" element={<Formats />} />
              <Route path="/reclamos/nuevo" element={<NewClaim />} />
              <Route path="/reclamos/editar/:id" element={<EditClaim />} />
              <Route path="/agenda" element={<Appointments />} />
              <Route path="/medicamentos" element={<Medications />} />
              <Route path="/registros" element={<MedicalRecords />} />
              <Route path="/broker" element={<BrokerPanel />} />
              <Route path="/medico" element={<DoctorPanel />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/admin/pipeline-status" element={<PipelineStatus />} />
              <Route path="/admin/gestor-archivos" element={<FormatManager />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
