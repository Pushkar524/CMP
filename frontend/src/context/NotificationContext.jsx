import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "../services/api";

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState(api.getNotifications());
  const [preferences, setPreferences] = useState(api.getPreferences());

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

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        preferences,
        updatePreferences,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
