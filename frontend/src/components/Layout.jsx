import React, { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  MapPin,
  FileText,
  ShieldAlert,
  Link as LinkIcon,
  LogOut,
  Bell,
  Building2,
  UserCheck,
  ChevronDown,
  ExternalLink
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import NotificationModal from "./NotificationModal";

export default function Layout() {
  const location = useLocation();
  const { user, allUsers, currentOrg, organizations, switchUser, switchOrg, isOrgAdmin, isLocationManager } = useAuth();
  const { unreadCount } = useNotifications();
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showOrgMenu, setShowOrgMenu] = useState(false);

  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Locations", path: "/locations", icon: MapPin },
    { name: "Documents Registry", path: "/documents", icon: FileText },
    { name: "Compliance Score Engine", path: "/compliance", icon: ShieldAlert },
    { name: "Cloud Data Rooms", path: "/audit-links", icon: LinkIcon },
  ];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans antialiased overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800">
        {/* Brand */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800/80 gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-white text-base shadow-md">
            S
          </div>
          <div>
            <span className="font-extrabold text-white text-base tracking-tight">SCLIP</span>
            <span className="text-[10px] text-indigo-400 block -mt-1 font-semibold uppercase tracking-wider">
              Compliance Cloud
            </span>
          </div>
        </div>

        {/* Tenant Org Selector */}
        <div className="p-4 border-b border-slate-800">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Active Tenant
          </label>
          <div className="relative">
            <button
              onClick={() => setShowOrgMenu(!showOrgMenu)}
              className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-800 hover:bg-slate-700/80 text-white text-xs font-semibold transition-colors"
            >
              <div className="flex items-center gap-2 truncate">
                <Building2 className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="truncate">{currentOrg.name}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
            </button>

            {showOrgMenu && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-30 py-1">
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => {
                      switchOrg(org.id);
                      setShowOrgMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between ${
                      org.id === currentOrg.id ? "bg-indigo-600 text-white font-bold" : "text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    <span className="truncate">{org.name}</span>
                    <span className="text-[9px] opacity-75">{org.tax_id}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Nav Links */}
        <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center px-3.5 py-2.5 text-xs font-semibold rounded-lg transition-all ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-100"
                }`}
              >
                <Icon className={`mr-3 h-4 w-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Current Active Persona / RBAC Switcher */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Active Persona (RBAC)
            </span>
            <span
              className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                isOrgAdmin ? "bg-emerald-900/60 text-emerald-300" : "bg-amber-900/60 text-amber-300"
              }`}
            >
              {user.role}
            </span>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-800 hover:bg-slate-700/80 text-white text-xs transition-colors"
            >
              <div className="flex items-center gap-2 truncate">
                <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="text-left truncate">
                  <div className="font-semibold truncate">{user.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{user.email}</div>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
            </button>

            {showRoleMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-30 py-1">
                {allUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      switchUser(u.id);
                      setShowRoleMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors flex flex-col ${
                      u.id === user.id ? "bg-indigo-600 text-white font-bold" : "text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    <span>{u.name}</span>
                    <span className="text-[10px] opacity-75 font-normal">Role: {u.role}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <Link
            to="/login"
            className="mt-3 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </Link>
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200/80 flex items-center justify-between px-8 shadow-2xs shrink-0 z-10">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold text-gray-900">
              {navItems.find((i) => location.pathname.startsWith(i.path))?.name || "Dashboard"}
            </h1>
            <span className="text-xs text-gray-400">|</span>
            <span className="text-xs font-medium text-gray-500">
              Scope: {isOrgAdmin ? "All Locations (Org Admin)" : `Assigned Stores (${user.assignedLocations?.length || 0})`}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <button
              onClick={() => setShowNotifModal(true)}
              className="relative p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              title="Compliance Sweeps & Preferences"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow-xs">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Quick Demo Inspector Link */}
            <Link
              to="/audit/audit-blr-bbmp-2026"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Test Inspector Portal
            </Link>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 overflow-y-auto p-8 bg-slate-50/70">
          <Outlet />
        </main>
      </div>

      {/* Notification Preferences & Alerts Modal */}
      <NotificationModal isOpen={showNotifModal} onClose={() => setShowNotifModal(false)} />
    </div>
  );
}
