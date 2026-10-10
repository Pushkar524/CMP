import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "../services/api";

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [preferences, setPreferences] = useState({
    email_enabled: true,
    sms_enabled: false,
    in_app_enabled: true,
    expiry_warning: true,
    lapsed_license: true,
    cascading_risk: true,
  });
  const [loading, setLoading] = useState(true);

  // Initialize data from API async after mount
  useEffect(() => {
    ;(async () => {
      try {
        const notifs = await api.getNotifications();
        setNotifications(notifs || []);
      } catch (e) {
        // Fallback to empty on failure
        setNotifications([]);
      }
      try {
        const prefs = api.getPreferences();
        setPreferences(prefs);
      } catch (e) {
        // Fallback to defaults
        setPreferences({
          email_enabled: true,
          sms_enabled: false,
          in_app_enabled: true,
          expiry_warning: true,
          lapsed_license: true,
          cascading_risk: true,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id) => {
    api.markNotificationRead(id);
    setNotifications(api.getNotifications());
  };

  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    api.saveNotifications(updated);
    setNotifications(updated);
  };

  const updatePreferences = (newPrefs) => {
    api.savePreferences(newPrefs);
    setPreferences(newPrefs);
  };

  // Provide loading state for components to check
  const value = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    preferences,
    updatePreferences,
    loading,
  };

  // If still loading, render children immediately
  if (loading) {
    return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
