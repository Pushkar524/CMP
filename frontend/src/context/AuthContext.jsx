import React, { createContext, useContext, useState, useEffect } from "react";
import { api, auth } from "../services/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [allUsers, setAllUsers] = useState(null);
  const [organizations, setOrganizations] = useState(null);
  const [currentOrg, setCurrentOrg] = useState(null);
  const [loading, setLoading] = useState(true);

  const applyProfile = async (profile) => {
    const hydratedUser = {
      ...profile.user,
      org_id: profile.organization?.id,
      assignedLocations: (profile.accessibleLocations || []).map((location) => location.id),
    };
    setUser(hydratedUser);
    setOrganizations(profile.organization ? [profile.organization] : []);
    if (hydratedUser.role === "ORG_ADMIN") {
      const users = await api.getUsers();
      setAllUsers(users.length > 0 ? users : [hydratedUser]);
    } else {
      setAllUsers([hydratedUser]);
    }
  };

  // Initialize data from API async after mount
  useEffect(() => {
    ;(async () => {
      if (!localStorage.getItem('sclip_auth_token')) {
        setLoading(false);
        return;
      }

      try {
        const response = await auth.getCurrentUser();
        await applyProfile(response.data);
      } catch (error) {
        auth.logout();
        setUser(null);
        setAllUsers([]);
        setOrganizations([]);
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

  const login = async (email, password) => {
    const response = await auth.login(email, password);
    await applyProfile(response.data);
    return response;
  };

  const switchUser = async (userId) => {
    const selected = allUsers?.find(u => u.id === userId);
    if (!selected) return;

    try {
      await login(selected.email, "Password@123");
    } catch {
      api.setCurrentUser(userId);
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

  const logout = () => {
    auth.logout();
    setUser(null);
    setAllUsers([]);
    setOrganizations([]);
    setCurrentOrg(null);
  };

  // Provide loading state for components to check
  const value = {
    user,
    allUsers: allUsers || [],
    organizations: organizations || [],
    currentOrg,
    loading,
    login,
    logout,
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
