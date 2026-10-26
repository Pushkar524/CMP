import React, { useState, useEffect } from "react";
import {
  X,
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Check,
  RefreshCw,
  Send,
  Trash2,
  ExternalLink,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { useNotifications } from "../context/NotificationContext";

export default function NotificationModal({ isOpen, onClose }) {
  const {
    preferences,
    updatePreferences,
    notifications,
    markAllAsRead,
    markAsRead,
    deleteNotification,
    triggerTestAlert,
    runSweep,
    unreadCount,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState("alerts");
  const [prefs, setPrefs] = useState(preferences);
  const [isSweeping, setIsSweeping] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    if (preferences) {
      setPrefs(preferences);
    }
  }, [preferences]);

  if (!isOpen) return null;

  const handleToggle = (key) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    updatePreferences(updated);
  };

  const handleRunSweep = async () => {
    setIsSweeping(true);
    setStatusMessage("");
    try {
      await runSweep();
      setStatusMessage("Sweep completed successfully!");
      setTimeout(() => setStatusMessage(""), 3000);
    } catch (e) {
      setStatusMessage("Sweep notice: " + (e.message || "Failed to run sweep"));
    } finally {
      setIsSweeping(false);
    }
  };

  const handleSendTest = async () => {
    setIsSendingTest(true);
    setStatusMessage("");
    try {
      await triggerTestAlert(
        "⚡ Real-Time Compliance Test Alert",
        "Verification alert dispatched via SCLIP notification engine. Multi-channel delivery operational.",
        "EXPIRY_WARNING",
        "/documents"
      );
      setStatusMessage("Test alert created!");
      setTimeout(() => setStatusMessage(""), 3000);
    } catch (e) {
      setStatusMessage("Notice: " + (e.message || "Failed to trigger alert"));
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
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
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status banner */}
        {statusMessage && (
          <div className="mt-3 px-3 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-xs font-medium animate-in fade-in duration-150">
            {statusMessage}
          </div>
        )}

        {/* Tabs & Quick Action Buttons */}
        <div className="flex items-center justify-between border-b border-gray-200 mt-4 text-xs font-semibold">
          <div className="flex">
            <button
              onClick={() => setActiveTab("alerts")}
              className={`pb-2.5 px-4 border-b-2 transition-colors ${
                activeTab === "alerts"
                  ? "border-indigo-600 text-indigo-600 font-bold"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Recent Sweeps ({notifications.length})
              {unreadCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 bg-red-600 text-white rounded-full text-[10px]">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("prefs")}
              className={`pb-2.5 px-4 border-b-2 transition-colors ${
                activeTab === "prefs"
                  ? "border-indigo-600 text-indigo-600 font-bold"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Channels & Settings
            </button>
          </div>

          {activeTab === "alerts" && (
            <div className="flex items-center gap-2 pb-2">
              <button
                onClick={handleRunSweep}
                disabled={isSweeping}
                title="Trigger immediate 30-day expiry and cascading risk sweep"
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isSweeping ? "animate-spin" : ""}`} />
                <span>Sweep</span>
              </button>
              <button
                onClick={handleSendTest}
                disabled={isSendingTest}
                title="Send test in-app alert"
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <Send className="w-3 h-3" />
                <span>Test Alert</span>
              </button>
            </div>
          )}
        </div>

        {/* Tab 1: Alerts */}
        {activeTab === "alerts" ? (
          <div className="mt-4 space-y-3 max-h-80 overflow-y-auto pr-1">
            {notifications.length > 0 && (
              <div className="flex justify-between items-center text-[11px] text-gray-500 px-1">
                <span>{unreadCount} unread alert{unreadCount === 1 ? "" : "s"}</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
            )}

            {notifications.length === 0 ? (
              <div className="text-center py-10 px-4 bg-gradient-to-b from-slate-50 to-indigo-50/30 border border-dashed border-indigo-200/80 rounded-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100/80 text-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <Sparkles className="w-6 h-6 text-indigo-600" />
                </div>
                <h4 className="text-sm font-bold text-gray-900">All Caught Up!</h4>
                <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto leading-relaxed">
                  Zero pending compliance escalations or critical expiry warnings across all monitored locations.
                </p>
                <div className="mt-4 flex items-center justify-center gap-2.5">
                  <button
                    onClick={handleRunSweep}
                    disabled={isSweeping}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    {isSweeping ? "Running Sweep..." : "Run Expiry Sweep"}
                  </button>
                  <button
                    onClick={handleSendTest}
                    disabled={isSendingTest}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    Send Test Alert
                  </button>
                </div>
              </div>
            ) : (
              notifications.map((n) => {
                const isUnread = !n.isRead && n.status !== "READ";
                const isUrgent = n.type === "LAPSED_LICENSE" || (n.title && n.title.includes("🚨"));
                const formattedDate = n.sentAt ? new Date(n.sentAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "";

                return (
                  <div
                    key={n.id}
                    className={`p-3 rounded-xl border text-xs transition-colors ${
                      isUnread
                        ? isUrgent
                          ? "bg-rose-50/50 border-rose-200"
                          : "bg-indigo-50/50 border-indigo-200"
                        : "bg-slate-50/80 border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        {isUnread && (
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              isUrgent ? "bg-rose-600" : "bg-indigo-600"
                            }`}
                          />
                        )}
                        <span className="font-bold text-gray-900 leading-snug">{n.title}</span>
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0">{formattedDate}</span>
                    </div>

                    <p className="text-gray-600 text-[11px] leading-relaxed pl-3.5">
                      {n.message || n.content}
                    </p>

                    <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] pl-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold uppercase px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-700">
                          {n.channel || "IN_APP"}
                        </span>
                        <span className="text-slate-400 font-medium">
                          {n.type ? n.type.replace(/_/g, " ") : "ALERT"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isUnread && (
                          <button
                            onClick={() => markAsRead(n.id)}
                            className="flex items-center gap-0.5 text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                            title="Mark as read"
                          >
                            <Check className="w-3 h-3" />
                            <span>Mark read</span>
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(n.id)}
                          className="text-gray-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Delete notification"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* Tab 2: Channels & Preferences */
          <div className="mt-4 space-y-4 text-xs">
            <p className="text-gray-500 text-xs">
              Configure which alert categories you receive across Email, SMS, and In-App channels.
            </p>
            <div className="space-y-2.5">
              {[
                { key: "email_enabled", label: "Email Notifications (SMTP / Resend)", icon: Mail, desc: "Receive email alerts on expiring licenses & renewals" },
                { key: "in_app_enabled", label: "In-App Notification Drawer", icon: Bell, desc: "Display badges and notifications inside workspace" },
                { key: "expiry_warning", label: "30-Day Proximity Expiry Sweeps", icon: MessageSquare, desc: "Alert when licenses enter the 30-day expiration window" },
                { key: "lapsed_license", label: "Lapsed License Immediate Warnings", icon: ShieldAlert, desc: "Urgent notifications when mandatory license expires" },
                { key: "cascading_risk", label: "Cascading Risk & Prerequisite Penalties", icon: MessageSquare, desc: "Alert when a blocking prerequisite compromises dependent licenses" },
              ].map((item) => {
                const Icon = item.icon;
                const enabled = Boolean(prefs[item.key]);
                return (
                  <div
                    key={item.key}
                    onClick={() => handleToggle(item.key)}
                    className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50/60 hover:bg-gray-100 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md shrink-0 mt-0.5">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">{item.label}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{item.desc}</div>
                      </div>
                    </div>
                    <div
                      className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors shrink-0 ml-3 ${
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

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
