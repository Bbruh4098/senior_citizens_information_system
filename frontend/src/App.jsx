import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ConfigProvider } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

// Layouts
import AdminLayout from "./layouts/AdminLayout";
import PublicLayout from "./layouts/PublicLayout";

// Auth
import Login from "./pages/Login";

// Admin Pages
import Dashboard from "./pages/Dashboard";
import Seniors from "./pages/Seniors";
import NewApplication from "./pages/registration/NewApplication";
import ReplaceLostApplication from "./pages/registration/ReplaceLostApplication";
import ReplaceDamagedApplication from "./pages/registration/ReplaceDamagedApplication";
import RenewApplication from "./pages/registration/RenewApplication";
import Applications from "./pages/registration/Applications";
import IdPrinting from "./pages/IdPrinting";
import PreRegistrations from "./pages/PreRegistrations";
import Benefits from "./pages/Benefits";
import Accounts from "./pages/admin/Accounts";
import BranchManagement from "./pages/admin/BranchManagement";
import BenefitSettings from "./pages/admin/BenefitSettings";
import BenefitComplaints from "./pages/admin/BenefitComplaints";
import AuditLog from "./pages/admin/AuditLog";
import Announcements from "./pages/Announcements";
import Archives from "./pages/Archives";

// Public Pages
import Home from "./pages/public/Home";
import About from "./pages/public/About";
import Services from "./pages/public/Services";
import News from "./pages/public/News";
import Contact from "./pages/public/Contact";
import Apply from "./pages/public/Apply";

// Senior Portal Pages
import SeniorLogin from "./pages/senior/SeniorLogin";
import SeniorDashboard from "./pages/senior/SeniorDashboard";
import SeniorBenefits from "./pages/senior/SeniorBenefits";
import SeniorComplaints from "./pages/senior/SeniorComplaints";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Placeholder components for incomplete admin pages
const ComingSoon = ({ title }) => (
  <div style={{ textAlign: "center", padding: "60px 20px" }}>
    <h2>{title}</h2>
    <p style={{ color: "#888" }}>This page is coming soon...</p>
  </div>
);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: "#4338ca",
            borderRadius: 8,
            fontFamily:
              "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          },
        }}
      >
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* ============ PUBLIC WEBSITE ROUTES ============ */}
              <Route path="/" element={<PublicLayout />}>
                <Route index element={<Home />} />
                <Route path="about" element={<About />} />
                <Route path="services" element={<Services />} />
                <Route path="news" element={<News />} />
                <Route path="contact" element={<Contact />} />
                <Route path="apply" element={<Apply />} />
              </Route>

              {/* ============ AUTH ROUTES ============ */}
              <Route path="/login" element={<Login />} />

              {/* ============ SENIOR PORTAL ROUTES ============ */}
              <Route path="/senior/login" element={<SeniorLogin />} />
              <Route path="/senior/dashboard" element={<SeniorDashboard />} />
              <Route path="/senior/profile" element={<SeniorDashboard />} />
              <Route path="/senior/benefits" element={<SeniorBenefits />} />
              <Route
                path="/senior/announcements"
                element={<SeniorDashboard />}
              />
              <Route path="/senior/complaints" element={<SeniorComplaints />} />

              {/* ============ ADMIN PORTAL ROUTES ============ */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route
                  index
                  element={<Navigate to="/admin/dashboard" replace />}
                />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="seniors" element={<Seniors />} />
                <Route path="registration">
                  <Route
                    index
                    element={<Navigate to="/admin/registration/list" replace />}
                  />
                  <Route path="new" element={<NewApplication />} />
                  <Route path="renew" element={<RenewApplication />} />
                  <Route path="replace-lost" element={<ReplaceLostApplication />} />
                  <Route path="replace-damaged" element={<ReplaceDamagedApplication />} />
                  <Route path="list" element={<Applications />} />
                </Route>
                <Route path="id-printing" element={<IdPrinting />} />
                <Route path="benefits" element={<Benefits />} />
                <Route
                  path="pre-registrations"
                  element={<PreRegistrations />}
                />
                <Route
                  path="complaints"
                  element={<BenefitComplaints />}
                />
                <Route path="announcements" element={<Announcements />} />
                <Route path="archives" element={<Archives />} />
                <Route
                  path="heatmap"
                  element={<ComingSoon title="Heat Map" />}
                />
                <Route
                  path="accounts"
                  element={
                    <ProtectedRoute allowedRoles={[1]}>
                      <Accounts />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="settings/branches"
                  element={
                    <ProtectedRoute allowedRoles={[1]}>
                      <BranchManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="benefits/configuration"
                  element={
                    <ProtectedRoute allowedRoles={[1]}>
                      <BenefitSettings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="audit-log"
                  element={
                    <ProtectedRoute allowedRoles={[1]}>
                      <AuditLog />
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* Catch all - redirect to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ConfigProvider>
    </QueryClientProvider>
  );
}

export default App;
