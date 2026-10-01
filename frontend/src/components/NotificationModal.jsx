import React, { useState } from "react";
import { X, Bell, Mail, MessageSquare, Smartphone, Check } from "lucide-react";
import { useNotifications } from "../context/NotificationContext";

export default function NotificationModal({ isOpen, onClose }) {
  const { preferences, updatePreferences, notifications, markAllAsRead } = useNotifications();
  const [activeTab, setActiveTab] = useState("alerts");
  const [prefs, setPrefs] = useState(preferences);

  if (!isOpen) return null;

  const handleToggle = (key) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    updatePreferences(updated);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Compliance Alert Center</h2>
              <p className="text-xs text-gray-500">Automated 30-day expiry sweep & channel preferences</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mt-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("alerts")}
            className={`pb-2.5 px-4 border-b-2 transition-colors ${
              activeTab === "alerts"
                ? "border-indigo-600 text-indigo-600 font-bold"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Recent Sweeps ({notifications.length})
          </button>
          <button
            onClick={() => setActiveTab("prefs")}
            className={`pb-2.5 px-4 border-b-2 transition-colors ${
              activeTab === "prefs"
                ? "border-indigo-600 text-indigo-600 font-bold"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Notification Channels
          </button>
        </div>

        {activeTab === "alerts" ? (
          <div className="mt-4 space-y-3 max-h-72 overflow-y-auto pr-1">
            <div className="flex justify-end">
              <button
                onClick={markAllAsRead}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold"
              >
                Mark all as read
              </button>
            </div>
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3 rounded-xl border text-xs transition-colors ${
                  !n.read ? "bg-indigo-50/40 border-indigo-200" : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-gray-900">{n.title}</span>
                  <span className="text-[10px] text-gray-400">{n.sent_at}</span>
                </div>
                <p className="text-gray-600 text-[11px] leading-relaxed">{n.content}</p>
                <div className="mt-2 flex items-center justify-between text-[10px]">
                  <span className="font-medium text-gray-500">{n.location_name}</span>
                  <span className="font-bold uppercase px-1.5 py-0.5 rounded bg-gray-200 text-gray-700">
                    Channel: {n.channel}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 space-y-4 text-xs">
            <p className="text-gray-500 text-xs">
              Configure which alert categories you receive across Email, SMS, and In-App channels (Section 4.11 in architecture).
            </p>
            <div className="space-y-3">
              {[
                { key: "email_enabled", label: "Email Notifications (SMTP / Resend)", icon: Mail },
                { key: "sms_enabled", label: "SMS Alerts (Twilio)", icon: Smartphone },
                { key: "in_app_enabled", label: "In-App Notification Drawer", icon: Bell },
                { key: "expiry_warning", label: "30-Day Proximity Expiry Sweeps", icon: MessageSquare },
                { key: "cascading_risk", label: "Cascading Risk & Prerequisite Penalties", icon: MessageSquare },
              ].map((item) => {
                const Icon = item.icon;
                const enabled = prefs[item.key];
                return (
                  <div
                    key={item.key}
                    onClick={() => handleToggle(item.key)}
                    className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50/60 hover:bg-gray-100 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 text-indigo-600" />
                      <span className="font-medium text-gray-800">{item.label}</span>
                    </div>
                    <div
                      className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                        enabled ? "bg-indigo-600 justify-end" : "bg-gray-300 justify-start"
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-5 pt-3 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
