import React, { useState, useEffect } from "react";
import {
  X,
  Settings,
  Building2,
  ShieldCheck,
  Lock,
  Bell,
  Database,
  Check,
  RotateCcw,
  Sliders,
  AlertTriangle,
  Mail,
  Smartphone,
  Save,
  Key,
  Calendar,
  Cloud,
  Users,
  UserPlus
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";

const DEFAULT_SETTINGS = {
  // General / Org Profile
  orgName: "Acme Retail Corporation",
  taxId: "29AABCA1234D1Z5",
  industry: "Retail & Consumer Stores",
  headquarters: "Brigade Gateway, Bangalore, Karnataka, 560055",
  complianceEmail: "compliance-officer@acmeretail.com",

  // Compliance Engine Rules
  expiryLeadDays: "30",
  cascadingPenalty: true,
  strictDualCustody: true,
  autoRecalculateScores: true,
  defaultValidityYears: "1",

  // Security & Data Rooms
  pinEnforcement: true,
  defaultDataRoomExpiryDays: "7",
  enforceSha256Integrity: true,
  logAuditAccess: true,
  sessionTimeoutMinutes: "60",

  // Notifications & Alerts
  emailAlerts: true,
  smsAlerts: false,
  weeklyDigest: true,
  inAppToasts: true,

  // Storage
  storageProvider: "AWS S3 / Supabase Storage",
  encryptionMode: "AES-256 at Rest",
  maxUploadMb: "50"
};

export default function SettingsModal({ isOpen, onClose }) {
  const { currentOrg, isOrgAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState("general");
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isSaved, setIsSaved] = useState(false);
  const [organizationUsers, setOrganizationUsers] = useState([]);
  const [availableLocations, setAvailableLocations] = useState([]);
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "LOCATION_MANAGER",
    locationIds: [],
  });
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [userFormStatus, setUserFormStatus] = useState("");

  // Load saved settings from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("cmp_workspace_settings");
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings((prev) => ({
          ...prev,
          ...parsed,
          orgName: currentOrg?.name || parsed.orgName || prev.orgName,
          taxId: currentOrg?.tax_id || parsed.taxId || prev.taxId,
        }));
      } else if (currentOrg) {
        setSettings((prev) => ({
          ...prev,
          orgName: currentOrg.name || prev.orgName,
          taxId: currentOrg.tax_id || prev.taxId,
        }));
      }
    } catch {
      // ignore JSON parse error
    }
  }, [isOpen, currentOrg]);

  useEffect(() => {
    if (!isOpen || !isOrgAdmin) return;
    (async () => {
      try {
        const [users, locations] = await Promise.all([
          api.getUsers(),
          api.getLocations(),
        ]);
        setOrganizationUsers(Array.isArray(users) ? users : []);
        setAvailableLocations(Array.isArray(locations) ? locations : []);
      } catch (error) {
        setUserFormStatus(error.message || "Could not load organization users and locations.");
      }
    })();
  }, [isOpen, isOrgAdmin]);

  if (!isOpen) return null;

  const handleToggle = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    setIsSaved(false);
  };

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setIsSaved(false);
  };

  const handleSave = () => {
    try {
      localStorage.setItem("cmp_workspace_settings", JSON.stringify(settings));
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (e) {
      console.error("Failed to save settings:", e);
    }
  };

  const handleReset = () => {
    if (window.confirm("Reset all settings back to system defaults?")) {
      setSettings({
        ...DEFAULT_SETTINGS,
        orgName: currentOrg?.name || DEFAULT_SETTINGS.orgName,
        taxId: currentOrg?.tax_id || DEFAULT_SETTINGS.taxId,
      });
      localStorage.removeItem("cmp_workspace_settings");
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    setUserFormStatus("");

    if (!userForm.name.trim() || !userForm.email.trim() || userForm.password.length < 8) {
      setUserFormStatus("Enter a name, valid email, and password with at least 8 characters.");
      return;
    }
    if (userForm.role === "LOCATION_MANAGER" && userForm.locationIds.length === 0) {
      setUserFormStatus("Select at least one location for a location manager.");
      return;
    }

    setIsCreatingUser(true);
    try {
      await api.createUser({
        name: userForm.name.trim(),
        email: userForm.email.trim(),
        password: userForm.password,
        role: userForm.role,
        locationIds: userForm.role === "LOCATION_MANAGER" ? userForm.locationIds : [],
      });
      setOrganizationUsers(await api.getUsers());
      setUserForm({
        name: "",
        email: "",
        password: "",
        role: "LOCATION_MANAGER",
        locationIds: [],
      });
      setUserFormStatus("User account created successfully.");
    } catch (error) {
      setUserFormStatus(error.message || "Could not create the user account.");
    } finally {
      setIsCreatingUser(false);
    }
  };

  const toggleUserLocation = (locationId) => {
    setUserForm((previous) => ({
      ...previous,
      locationIds: previous.locationIds.includes(locationId)
        ? previous.locationIds.filter((id) => id !== locationId)
        : [...previous.locationIds, locationId],
    }));
  };

  const tabs = [
    { id: "general", label: "Organization", icon: Building2 },
    { id: "compliance", label: "Compliance Rules", icon: ShieldCheck },
    { id: "security", label: "Security & RBAC", icon: Lock },
    ...(isOrgAdmin ? [{ id: "users", label: "Users & Access", icon: Users }] : []),
    { id: "alerts", label: "Alerts & Channels", icon: Bell },
    { id: "storage", label: "Storage & Cloud", icon: Database },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Platform Settings & Policies</h2>
              <p className="text-xs text-gray-500">
                Configure enterprise compliance rules, security thresholds, and notification defaults
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 mt-4 overflow-x-auto text-xs font-semibold gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-2.5 px-3.5 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? "border-indigo-600 text-indigo-600 font-bold"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? "text-indigo-600" : "text-gray-400"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="mt-5 max-h-[58vh] overflow-y-auto pr-1">
          {/* TAB 1: ORGANIZATION PROFILE */}
          {activeTab === "general" && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Organization Legal Name</label>
                <input
                  type="text"
                  value={settings.orgName}
                  onChange={(e) => handleChange("orgName", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Corporate Tax ID / GSTIN</label>
                  <input
                    type="text"
                    value={settings.taxId}
                    onChange={(e) => handleChange("taxId", e.target.value)}
                    className="w-full font-mono border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Industry Vertical</label>
                  <select
                    value={settings.industry}
                    onChange={(e) => handleChange("industry", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="Retail & Consumer Stores">Retail & Consumer Stores</option>
                    <option value="Logistics & Warehousing">Logistics & Warehousing</option>
                    <option value="Manufacturing & Industrial">Manufacturing & Industrial</option>
                    <option value="Hospitality & Restaurants">Hospitality & Restaurants</option>
                    <option value="Healthcare & Pharmaceuticals">Healthcare & Pharmaceuticals</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Corporate Headquarters Address</label>
                <input
                  type="text"
                  value={settings.headquarters}
                  onChange={(e) => handleChange("headquarters", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Primary Compliance Officer Contact Email</label>
                <input
                  type="email"
                  value={settings.complianceEmail}
                  onChange={(e) => handleChange("complianceEmail", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>
          )}

          {/* TAB 2: COMPLIANCE RULES */}
          {activeTab === "compliance" && (
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl">
                <label className="block font-bold text-indigo-950 mb-1">
                  License Expiry Lead Warning Threshold
                </label>
                <p className="text-[11px] text-indigo-700 mb-2.5">
                  Licenses expiring within this window will turn amber and trigger reminder workflows across Dashboard and Registry.
                </p>
                <select
                  value={settings.expiryLeadDays}
                  onChange={(e) => handleChange("expiryLeadDays", e.target.value)}
                  className="w-full sm:w-60 border border-indigo-200 rounded-lg p-2 bg-white text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="15">15 Days Before Expiry (Tight)</option>
                  <option value="30">30 Days Before Expiry (Recommended)</option>
                  <option value="60">60 Days Before Expiry</option>
                  <option value="90">90 Days Before Expiry (Quarterly)</option>
                </select>
              </div>

              {/* Toggles */}
              <div className="divide-y divide-gray-100">
                <div className="py-3 flex items-start justify-between gap-4">
                  <div>
                    <span className="font-bold text-gray-900 block">Cascading Dependency Penalties</span>
                    <span className="text-[11px] text-gray-500">
                      When a prerequisite license (e.g. Lift Clearance) lapses, automatically dock dependent certificates (e.g. Fire NOC).
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle("cascadingPenalty")}
                    className={`w-11 h-6 shrink-0 rounded-full transition-colors relative cursor-pointer ${
                      settings.cascadingPenalty ? "bg-indigo-600" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white shadow-xs transform transition-transform absolute top-1 ${
                        settings.cascadingPenalty ? "left-6" : "left-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="py-3 flex items-start justify-between gap-4">
                  <div>
                    <span className="font-bold text-gray-900 block">Strict Dual-Custody Verification</span>
                    <span className="text-[11px] text-gray-500">
                      Mandate Org Admin approval for documents uploaded by store/warehouse location managers before marking as verified.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle("strictDualCustody")}
                    className={`w-11 h-6 shrink-0 rounded-full transition-colors relative cursor-pointer ${
                      settings.strictDualCustody ? "bg-indigo-600" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white shadow-xs transform transition-transform absolute top-1 ${
                        settings.strictDualCustody ? "left-6" : "left-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="py-3 flex items-start justify-between gap-4">
                  <div>
                    <span className="font-bold text-gray-900 block">Real-time Dynamic Score Recalculation</span>
                    <span className="text-[11px] text-gray-500">
                      Trigger instant recalculation of location compliance scores immediately on certificate renewal or rejection.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle("autoRecalculateScores")}
                    className={`w-11 h-6 shrink-0 rounded-full transition-colors relative cursor-pointer ${
                      settings.autoRecalculateScores ? "bg-indigo-600" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white shadow-xs transform transition-transform absolute top-1 ${
                        settings.autoRecalculateScores ? "left-6" : "left-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SECURITY & DATA ROOM */}
          {activeTab === "security" && (
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <Key className="w-4 h-4 text-amber-600" />
                  <span className="font-bold text-amber-900">Data Room Default Expiration</span>
                </div>
                <p className="text-[11px] text-amber-700 mb-2">
                  Duration after which shared external auditor links automatically expire and invalidate access.
                </p>
                <select
                  value={settings.defaultDataRoomExpiryDays}
                  onChange={(e) => handleChange("defaultDataRoomExpiryDays", e.target.value)}
                  className="w-full sm:w-60 border border-amber-300 rounded-lg p-2 bg-white text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                >
                  <option value="1">24 Hours (Immediate Audit)</option>
                  <option value="7">7 Days (Standard Inspection)</option>
                  <option value="14">14 Days (Extended Audit)</option>
                  <option value="30">30 Days (Annual Clearance Review)</option>
                </select>
              </div>

              <div className="divide-y divide-gray-100">
                <div className="py-3 flex items-start justify-between gap-4">
                  <div>
                    <span className="font-bold text-gray-900 block">Mandatory PIN on External Links</span>
                    <span className="text-[11px] text-gray-500">
                      Require creators to assign a 4-6 digit numeric PIN to protect statutory packages from unauthorized access.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle("pinEnforcement")}
                    className={`w-11 h-6 shrink-0 rounded-full transition-colors relative cursor-pointer ${
                      settings.pinEnforcement ? "bg-indigo-600" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white shadow-xs transform transition-transform absolute top-1 ${
                        settings.pinEnforcement ? "left-6" : "left-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="py-3 flex items-start justify-between gap-4">
                  <div>
                    <span className="font-bold text-gray-900 block">Cryptographic SHA-256 Fingerprint Check</span>
                    <span className="text-[11px] text-gray-500">
                      Compute and seal tamper-proof checksums on every uploaded certificate buffer to guarantee audit chain of custody.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle("enforceSha256Integrity")}
                    className={`w-11 h-6 shrink-0 rounded-full transition-colors relative cursor-pointer ${
                      settings.enforceSha256Integrity ? "bg-indigo-600" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white shadow-xs transform transition-transform absolute top-1 ${
                        settings.enforceSha256Integrity ? "left-6" : "left-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="py-3 flex items-start justify-between gap-4">
                  <div>
                    <span className="font-bold text-gray-900 block">Inspector IP & Access Audit Logging</span>
                    <span className="text-[11px] text-gray-500">
                      Record client IP addresses, browser agents, and timestamps for external data room views in compliance audit logs.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle("logAuditAccess")}
                    className={`w-11 h-6 shrink-0 rounded-full transition-colors relative cursor-pointer ${
                      settings.logAuditAccess ? "bg-indigo-600" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white shadow-xs transform transition-transform absolute top-1 ${
                        settings.logAuditAccess ? "left-6" : "left-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: USER & LOCATION ACCESS */}
          {activeTab === "users" && isOrgAdmin && (
            <div className="space-y-4 text-xs">
              <form onSubmit={handleCreateUser} className="p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-3">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-indigo-600" />
                  <div>
                    <h3 className="font-bold text-gray-900">Create Organization User</h3>
                    <p className="text-[11px] text-gray-500">Accounts are created directly under {currentOrg?.name || "this organization"}.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={userForm.name}
                      onChange={(event) => setUserForm((prev) => ({ ...prev, name: event.target.value }))}
                      className="w-full border border-gray-300 rounded-lg p-2.5"
                      placeholder="Location Manager name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={userForm.email}
                      onChange={(event) => setUserForm((prev) => ({ ...prev, email: event.target.value }))}
                      className="w-full border border-gray-300 rounded-lg p-2.5"
                      placeholder="manager@company.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Temporary Password</label>
                    <input
                      type="password"
                      value={userForm.password}
                      onChange={(event) => setUserForm((prev) => ({ ...prev, password: event.target.value }))}
                      className="w-full border border-gray-300 rounded-lg p-2.5"
                      placeholder="At least 8 characters"
                      minLength={8}
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Role</label>
                    <select
                      value={userForm.role}
                      onChange={(event) => setUserForm((prev) => ({
                        ...prev,
                        role: event.target.value,
                        locationIds: event.target.value === "LOCATION_MANAGER" ? prev.locationIds : [],
                      }))}
                      className="w-full border border-gray-300 rounded-lg p-2.5 bg-white"
                    >
                      <option value="LOCATION_MANAGER">Location Manager</option>
                      <option value="ORG_ADMIN">Organization Admin</option>
                      <option value="EXTERNAL_INSPECTOR">External Inspector</option>
                    </select>
                  </div>
                </div>

                {userForm.role === "LOCATION_MANAGER" && (
                  <div>
                    <label className="block font-bold text-gray-700 mb-2">Assigned Locations</label>
                    {availableLocations.length === 0 ? (
                      <p className="text-[11px] text-gray-500">No locations are available.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {availableLocations.map((location) => (
                          <label
                            key={location.id}
                            className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 bg-white cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={userForm.locationIds.includes(location.id)}
                              onChange={() => toggleUserLocation(location.id)}
                              className="rounded text-indigo-600"
                            />
                            <span className="truncate">
                              <strong className="block text-gray-800">{location.name}</strong>
                              <span className="text-[10px] text-gray-500">{location.code || "No code"} · {location.state || "State pending"}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {userFormStatus && (
                  <p className={`text-[11px] font-semibold ${userFormStatus.includes("successfully") ? "text-emerald-700" : "text-red-700"}`}>
                    {userFormStatus}
                  </p>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isCreatingUser}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-60"
                  >
                    <UserPlus className="w-4 h-4" />
                    {isCreatingUser ? "Creating Account..." : "Create Account"}
                  </button>
                </div>
              </form>

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <span className="font-bold text-gray-900">Organization Accounts</span>
                  <span className="text-[10px] text-gray-500">{organizationUsers.length} users</span>
                </div>
                {organizationUsers.length === 0 ? (
                  <p className="p-4 text-gray-500 text-center">No organization users found.</p>
                ) : (
                  <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
                    {organizationUsers.map((organizationUser) => (
                      <div key={organizationUser.id} className="px-3 py-2.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 truncate">{organizationUser.name}</p>
                          <p className="text-[10px] text-gray-500 truncate">{organizationUser.email}</p>
                        </div>
                        <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 shrink-0">
                          {organizationUser.role?.replace(/_/g, " ")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: ALERTS & CHANNELS */}
          {activeTab === "alerts" && (
            <div className="space-y-4 text-xs">
              <p className="text-gray-500 text-xs">
                Select dispatch channels for automated compliance sweeps, renewals, and expiration alerts.
              </p>

              <div className="space-y-2.5">
                {[
                  {
                    key: "emailAlerts",
                    label: "Email Dispatch (Resend / SMTP)",
                    desc: "Send automated renewal reminders to Org Admins and Location Managers.",
                    icon: Mail
                  },
                  {
                    key: "smsAlerts",
                    label: "Critical SMS Broadcasts",
                    desc: "Urgent SMS notifications sent 48 hours prior to statutory license expiration.",
                    icon: Smartphone
                  },
                  {
                    key: "weeklyDigest",
                    label: "Weekly Executive Compliance Digest",
                    desc: "Summary report dispatched every Monday morning analyzing aggregate compliance health.",
                    icon: Calendar
                  },
                  {
                    key: "inAppToasts",
                    label: "In-App Toast Announcements",
                    desc: "Real-time alerts displayed when documents are verified or rejected.",
                    icon: Bell
                  }
                ].map((channel) => {
                  const Icon = channel.icon;
                  const isChecked = settings[channel.key];
                  return (
                    <div
                      key={channel.key}
                      onClick={() => handleToggle(channel.key)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                        isChecked
                          ? "bg-indigo-50/50 border-indigo-200"
                          : "bg-gray-50 border-gray-200 opacity-75"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-lg mt-0.5 ${
                            isChecked
                              ? "bg-indigo-600 text-white"
                              : "bg-gray-200 text-gray-500"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-gray-900 block">{channel.label}</span>
                          <span className="text-[11px] text-gray-500">{channel.desc}</span>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                          isChecked
                            ? "bg-indigo-600 border-indigo-600 text-white"
                            : "border-gray-300 bg-white"
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: STORAGE & CLOUD */}
          {activeTab === "storage" && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-indigo-600" />
                    <span className="font-bold text-gray-900">Object Storage Provider</span>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Active / Connected
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600 pt-2 border-t border-gray-200">
                  <div>
                    <span className="font-semibold text-gray-500 block">Primary Provider:</span>
                    <span className="font-mono text-gray-900">{settings.storageProvider}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-500 block">Encryption Standard:</span>
                    <span className="font-mono text-emerald-700 font-bold">{settings.encryptionMode}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-500 block">Target Bucket:</span>
                    <span className="font-mono text-gray-900">sclip-documents</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-500 block">Max Document Size:</span>
                    <span className="font-mono text-gray-900">{settings.maxUploadMb} MB per file</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-900 text-slate-200 rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 block">
                  Presigned URL Security
                </span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Downloads and thumbnail streams are generated using signed tokens valid for 1 hour. Direct bucket public browsing is strictly disabled.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Save, Reset & Feedback */}
        <div className="mt-6 pt-3.5 border-t border-gray-100 flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            {isSaved && (
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 animate-in fade-in duration-200">
                <Check className="w-4 h-4" />
                Settings Saved!
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
