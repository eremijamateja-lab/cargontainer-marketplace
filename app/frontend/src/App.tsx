import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import Index from './pages/Index';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import AuthError from './pages/AuthError';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Requests from './pages/Requests';
import Marketplace from './pages/Marketplace';
import Offers from './pages/Offers';
import Messages from './pages/Messages';
import Shipments from './pages/Shipments';
import Contact from './pages/Contact';
import Company from './pages/Company';
import Directory from './pages/Directory';
import Admin from './pages/Admin';
import PendingApproval from './pages/PendingApproval';
import ProtectedRoute from './components/ProtectedRoute';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/auth/error" element={<AuthError />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/pending-approval" element={<PendingApproval />} />
            <Route path="/contact" element={<Contact />} />

            {/* Protected routes — require approved company */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/requests" element={<ProtectedRoute><Requests /></ProtectedRoute>} />
            <Route path="/marketplace" element={<ProtectedRoute><Marketplace /></ProtectedRoute>} />
            <Route path="/offers" element={<ProtectedRoute><Offers /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/shipments" element={<ProtectedRoute><Shipments /></ProtectedRoute>} />
            <Route path="/company" element={<ProtectedRoute><Company /></ProtectedRoute>} />
            <Route path="/directory" element={<ProtectedRoute><Directory /></ProtectedRoute>} />

            {/* Admin route — also protected but admin check is inside the page */}
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/approvals" element={<Admin />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;