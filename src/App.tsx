import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import DashboardSolicitante from "./pages/DashboardSolicitante";
import DashboardGestora from "./pages/DashboardGestora";
import DashboardAdmin from "./pages/DashboardAdmin";
import ProfileGestora from "./pages/ProfileGestora";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard-solicitante" element={<DashboardSolicitante />} />
            <Route path="/dashboard-gestora" element={<DashboardGestora />} />
            <Route path="/dashboard-admin" element={<DashboardAdmin />} />
            <Route path="/profile" element={<ProfileGestora />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
