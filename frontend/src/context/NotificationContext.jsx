import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
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

  // Normalizes notification shape from backend
  const normalizeNotification = (n) => ({
    ...n,
    id: n.id,
    title: n.title || "Notification",
    message: n.message || n.content || "",
    channel: n.channel || "IN_APP",
    isRead: Boolean(n.isRead || n.status === "READ"),
    status: n.status || "UNREAD",
    sentAt: n.sentAt || n.sent_at || new Date().toISOString(),
    link: n.link || null,
  });

  const fetchNotificationsAndPrefs = useCallback(async () => {
    const token = localStorage.getItem("sclip_auth_token");
    if (!token) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    try {
      const [notifsData, prefsData] = await Promise.allSettled([
        api.getNotifications(),
        api.getPreferences(),
      ]);

      if (notifsData.status === "fulfilled" && Array.isArray(notifsData.value)) {
        setNotifications(notifsData.value.map(normalizeNotification));
      }

      if (prefsData.status === "fulfilled" && prefsData.value) {
        setPreferences(prefsData.value);
      }
    } catch (e) {
      console.warn("Notice: could not load notifications:", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount and setup polling every 30 seconds
  useEffect(() => {
    fetchNotificationsAndPrefs();

    const interval = window.setInterval(() => {
      if (localStorage.getItem("sclip_auth_token")) {
        fetchNotificationsAndPrefs();
      }
    }, 30000);

    return () => window.clearInterval(interval);
  }, [fetchNotificationsAndPrefs]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsRead = async (id) => {
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true, status: "READ" } : n))
    );
    try {
      await api.markNotificationRead(id);
    } catch (e) {
      console.error("Failed to mark notification as read:", e.message);
      fetchNotificationsAndPrefs();
    }
  };

  const markAllAsRead = async () => {
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true, status: "READ" }))
    );
    try {
      await api.markAllAsRead();
    } catch (e) {
      console.error("Failed to mark all as read:", e.message);
      fetchNotificationsAndPrefs();
    }
  };

  const deleteNotification = async (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await api.deleteNotification(id);
    } catch (e) {
      console.error("Failed to delete notification:", e.message);
      fetchNotificationsAndPrefs();
    }
  };

  const updatePreferences = async (newPrefs) => {
    setPreferences(newPrefs);
    try {
      await api.savePreferences(newPrefs);
    } catch (e) {
      console.error("Failed to update preferences:", e.message);
    }
  };

  const triggerTestAlert = async (title, message, type = "EXPIRY_WARNING", link = "/dashboard") => {
    try {
      await api.createTestAlert(title, message, type, link);
      await fetchNotificationsAndPrefs();
    } catch (e) {
      console.error("Failed to trigger test alert:", e.message);
      throw e;
    }
  };

  const runSweep = async () => {
    try {
      await api.runSweep();
      await fetchNotificationsAndPrefs();
    } catch (e) {
      console.error("Failed to run compliance sweep:", e.message);
      throw e;
    }
  };

  const value = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    preferences,
    updatePreferences,
    triggerTestAlert,
    runSweep,
    refreshNotifications: fetchNotificationsAndPrefs,
    loading,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
