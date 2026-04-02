import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

import Auth from "./pages/Auth";
import ClientDashboard from "./pages/ClientDashboard";
import ClientRequestForm from "./pages/ClientRequestForm";
import DesignerDashboard from "./pages/DesignerDashboard";
import AdminPanel from "./pages/AdminPanel";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Route koruyucu — giriş yapılmamışsa auth'a yönlendir
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full" />
      </div>
    );
  }

  return session ? <>{children}</> : <Navigate to="/" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Giriş/kayıt — ana sayfa */}
          <Route path="/" element={<Auth />} />

          {/* Müşteri sayfaları */}
          <Route path="/dashboard" element={<ProtectedRoute><ClientDashboard /></ProtectedRoute>} />
          <Route path="/request" element={<ProtectedRoute><ClientRequestForm /></ProtectedRoute>} />

          {/* Tasarımcı paneli */}
          <Route path="/designer/:designerId" element={<ProtectedRoute><DesignerDashboard /></ProtectedRoute>} />

          {/* Admin paneli */}
          <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
