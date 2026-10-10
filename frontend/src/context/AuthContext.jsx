import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "../services/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [allUsers, setAllUsers] = useState(null);
  const [organizations, setOrganizations] = useState(null);
  const [currentOrg, setCurrentOrg] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize data from API async after mount
  useEffect(() => {
    ;(async () => {
      try {
        const user = await api.getCurrentUser();
        const allUsers = await api.getUsers();
        const organizations = await api.getOrganizations();
        setUser(user);
        setAllUsers(allUsers);
        setOrganizations(organizations);
      } catch (e) {
        // Fallback to mock data on failure
        setUser({
          id: 'user-1',
          email: 'anantha@apexretail.in',
          name: 'Anantha Krishna',
          role: 'ORG_ADMIN',
          org_id: 'org-1',
          assignedLocations: ['loc-1', 'loc-2', 'loc-3', 'loc-4'],
        });
        setAllUsers([{
          id: 'user-1',
          org_id: 'org-1',
          name: 'Anantha Krishna',
          email: 'anantha@apexretail.in',
          role: 'ORG_ADMIN',
          assignedLocations: ['loc-1', 'loc-2', 'loc-3', 'loc-4'],
        }]);
        setOrganizations([{
          id: 'org-1',
          name: 'Apex Retail Group India Ltd.',
          tax_id: '29AABCA1234F1Z8',
        }]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (organizations) {
      const org = organizations.find(o => o.id === user?.org_id) || organizations[0];
      setCurrentOrg(org);
    }
  }, [user, organizations]);

  const switchUser = (userId) => {
    api.setCurrentUser(userId);
    const selected = allUsers?.find(u => u.id === userId);
    if (selected) {
      setUser(selected);
    }
  };

  const switchOrg = (orgId) => {
    const org = organizations?.find(o => o.id === orgId);
    if (org) {
      setCurrentOrg(org);
    }
  };

  const isOrgAdmin = user?.role === "ORG_ADMIN";
  const isLocationManager = user?.role === "LOCATION_MANAGER";
  const isExternalInspector = user?.role === "EXTERNAL_INSPECTOR";

  const canAccessLocation = (locationId) => {
    if (isOrgAdmin) return true;
    if (isLocationManager && user?.assignedLocations) {
      return user.assignedLocations.includes(locationId);
    }
    return false;
  };

  // Provide loading state for components to check
  const value = {
    user,
    allUsers: allUsers || [],
    organizations: organizations || [],
    currentOrg,
    loading,
    switchUser,
    switchOrg,
    isOrgAdmin,
    isLocationManager,
    isExternalInspector,
    canAccessLocation,
  };

  // If still loading, render children immediately (they'll see loading state)
  if (loading) {
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
