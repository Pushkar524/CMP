import { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import Layout from "./components/Layout";
import { WorkspaceLoader } from "./components/Skeletons";
import ErrorBoundary from "./components/ErrorBoundary";

// Lazy load route pages for performance & code-splitting
const Login = lazy(() => import("./pages/Auth/Login"));
const Register = lazy(() => import("./pages/Auth/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard/Dashboard"));
const Locations = lazy(() => import("./pages/Locations/Locations"));
const Documents = lazy(() => import("./pages/Documents/Documents"));
const ComplianceScore = lazy(() => import("./pages/ComplianceScore/ComplianceScore"));
const AuditLinks = lazy(() => import("./pages/AuditLinks/AuditLinks"));
const AuditView = lazy(() => import("./pages/AuditView/AuditView"));

function ProtectedLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return <WorkspaceLoader message="Loading workspace..." />;
  }

  return user ? <Layout /> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotificationProvider>
          <Router>
            <Suspense fallback={<WorkspaceLoader message="Loading page..." />}>
              <Routes>
                {/* Public Auth / Login */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Public External Inspector Cloud Data Room */}
                <Route path="/audit/:token" element={<AuditView />} />

                {/* Authenticated Management Platform */}
                <Route path="/" element={<ProtectedLayout />}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="locations" element={<Locations />} />
                  <Route path="documents" element={<Documents />} />
                  <Route path="compliance" element={<ComplianceScore />} />
                  <Route path="audit-links" element={<AuditLinks />} />
                </Route>
              </Routes>
            </Suspense>
          </Router>
        </NotificationProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
