import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";
import Kanban from "./pages/Kanban";
import Contatos from "./pages/Contatos";
import Agentes from "./pages/Agentes";
import Configuracoes from "./pages/Configuracoes";
import ConfigWhatsApp from "./pages/ConfigWhatsApp";
import ConfigEmpresa from "./pages/ConfigEmpresa";
import ConfigEquipe from "./pages/ConfigEquipe";
import ConfigHorarios from "./pages/ConfigHorarios";
import ConfigEtiquetas from "./pages/ConfigEtiquetas";
import ConfigRespostasRapidas from "./pages/ConfigRespostasRapidas";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ConfirmEmail from "./pages/ConfirmEmail";
import Planos from "./pages/Planos";
import Onboarding from "./pages/Onboarding";
import AdminLayout from "./components/AdminLayout";
import AdminEmpresas from "./pages/admin/AdminEmpresas";
import AdminEmpresaDetalhe from "./pages/admin/AdminEmpresaDetalhe";
import AdminPlanos from "./pages/admin/AdminPlanos";
import Assinar from "./pages/Assinar";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/confirm" element={<ConfirmEmail />} />
            <Route path="/planos" element={<Planos />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/assinar/:token" element={<Assinar />} />

            {/* Protected */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/kanban" element={<Kanban />} />
                <Route path="/contatos" element={<Contatos />} />
                <Route path="/agentes" element={<Agentes />} />
                <Route path="/configuracoes" element={<Configuracoes />} />
                <Route path="/configuracoes/whatsapp" element={<ConfigWhatsApp />} />
                <Route path="/configuracoes/empresa" element={<ConfigEmpresa />} />
                <Route path="/configuracoes/equipe" element={<ConfigEquipe />} />
                <Route path="/configuracoes/horarios" element={<ConfigHorarios />} />
                <Route path="/configuracoes/etiquetas" element={<ConfigEtiquetas />} />
                <Route path="/configuracoes/respostas-rapidas" element={<ConfigRespostasRapidas />} />
              </Route>
            </Route>

            {/* Super Admin */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<AdminEmpresas />} />
                <Route path="/admin/empresa/:id" element={<AdminEmpresaDetalhe />} />
                <Route path="/admin/planos" element={<AdminPlanos />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
