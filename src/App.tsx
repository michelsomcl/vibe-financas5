
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import NewTransaction from "./pages/NewTransaction";
import Categories from "./pages/Categories";
import Accounts from "./pages/Accounts";
import Bills from "./pages/Bills";
import NotFound from "./pages/NotFound";
import { AuroraBackgroundDemo } from "./components/ui/aurora-demo";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="inicio" element={<Dashboard />} />
            <Route path="transacoes" element={<Transactions />} />
            <Route path="nova-transacao" element={<NewTransaction />} />
            <Route path="categorias" element={<Categories />} />
            <Route path="contas" element={<Accounts />} />
            <Route path="contas-a-pagar" element={<Bills />} />
            <Route path="demo" element={<AuroraBackgroundDemo />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
