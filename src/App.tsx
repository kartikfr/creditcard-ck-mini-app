import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { EligibilityProvider } from "@/context/EligibilityContext";
import ScrollToTop from "@/components/ScrollToTop";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Earnings from "./pages/Earnings";
import MissingCashback from "./pages/MissingCashback";
import Deals from "./pages/Deals";
import CategoryDetail from "./pages/CategoryDetail";
import Profile from "./pages/Profile";
import AccountSettings from "./pages/AccountSettings";
import ReviewUs from "./pages/ReviewUs";
import OfferDetail from "./pages/OfferDetail";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import Help from "./pages/Help";
import FAQ from "./pages/FAQ";
import Feedback from "./pages/Feedback";
import TermsAndConditions from "./pages/TermsAndConditions";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import KnowMore from "./pages/KnowMore";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Protected Route wrapper - for pages that REQUIRE authentication
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  // Let the page handle showing login prompt instead of redirecting
  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/login" element={<Login />} />
        {/* PUBLIC ROUTES - No login required to view */}
        <Route path="/" element={<Home />} />
        <Route path="/offer/:uniqueIdentifier" element={<OfferDetail />} />
        <Route path="/deals" element={<Deals />} />
        <Route path="/category/*" element={<CategoryDetail />} />
        <Route path="/help" element={<Help />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/terms" element={<TermsAndConditions />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/know-more" element={<KnowMore />} />
        {/* PROTECTED ROUTES - Login required for user-specific data */}
        <Route path="/earnings" element={<ProtectedRoute><Earnings /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
        <Route path="/order/:orderId" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
        <Route path="/missing-cashback" element={<ProtectedRoute><MissingCashback /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/account-settings" element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />
        <Route path="/review-us" element={<ProtectedRoute><ReviewUs /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <EligibilityProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </EligibilityProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
