import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "../services/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(api.getCurrentUser());
  const [allUsers, setAllUsers] = useState(api.getUsers());
  const [organizations, setOrganizations] = useState(api.getOrganizations());
  const [currentOrg, setCurrentOrg] = useState(organizations[0]);

  useEffect(() => {
    const org = organizations.find(o => o.id === user.org_id) || organizations[0];
    setCurrentOrg(org);
  }, [user, organizations]);

  const switchUser = (userId) => {
    api.setCurrentUser(userId);
    const selected = allUsers.find(u => u.id === userId);
    if (selected) {
      setUser(selected);
    }
  };

  const switchOrg = (orgId) => {
    const org = organizations.find(o => o.id === orgId);
    if (org) {
      setCurrentOrg(org);
    }
  };

  const isOrgAdmin = user.role === "ORG_ADMIN";
  const isLocationManager = user.role === "LOCATION_MANAGER";
  const isExternalInspector = user.role === "EXTERNAL_INSPECTOR";

  const canAccessLocation = (locationId) => {
    if (isOrgAdmin) return true;
    if (isLocationManager) {
      return (user.assignedLocations || []).includes(locationId);
    }
    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        allUsers,
        currentOrg,
        organizations,
        switchUser,
        switchOrg,
        isOrgAdmin,
        isLocationManager,
        isExternalInspector,
        canAccessLocation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
