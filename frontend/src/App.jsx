import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import Layout from "./components/Layout";
import Login from "./pages/Auth/Login";
import Dashboard from "./pages/Dashboard/Dashboard";
import Locations from "./pages/Locations/Locations";
import Documents from "./pages/Documents/Documents";
import ComplianceScore from "./pages/ComplianceScore/ComplianceScore";
import AuditLinks from "./pages/AuditLinks/AuditLinks";
import AuditView from "./pages/AuditView/AuditView";

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <Routes>
            {/* Public Auth / Login */}
            <Route path="/login" element={<Login />} />

            {/* Public External Inspector Cloud Data Room */}
            <Route path="/audit/:token" element={<AuditView />} />

            {/* Authenticated Management Platform */}
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="locations" element={<Locations />} />
              <Route path="documents" element={<Documents />} />
              <Route path="compliance" element={<ComplianceScore />} />
              <Route path="audit-links" element={<AuditLinks />} />
            </Route>
          </Routes>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
