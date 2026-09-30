import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  FileCheck,
  ShieldAlert,
  ArrowRight,
  Upload,
  RefreshCw,
  Building,
  CheckCircle2
} from "lucide-react";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import ScoreGauge from "../../components/ScoreGauge";
import UploadDocumentModal from "../../components/Modals/UploadDocumentModal";

export default function Dashboard() {
  const { currentOrg, canAccessLocation } = useAuth();
  const [locations, setLocations] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [licenseTypes, setLicenseTypes] = useState([]);
  const [dependencies, setDependencies] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const loadData = () => {
    setLocations(api.getLocations());
    setDocuments(api.getDocuments());
    setLicenseTypes(api.getLicenseTypes());
    setDependencies(api.getDependencies());
  };

  useEffect(() => {
    loadData();
  }, []);

  const visibleLocations = locations.filter(l => canAccessLocation(l.id));

  // Compute roll-up organization compliance score (Section 4.4 in README)
  const avgScore = visibleLocations.length > 0
    ? Math.round(visibleLocations.reduce((acc, l) => acc + (l.current_compliance_score || 0), 0) / visibleLocations.length)
    : 100;

  const expiredCount = documents.filter(d => d.status === "EXPIRED" || (d.expiry_date && new Date(d.expiry_date) < new Date())).length;
  const pendingCount = documents.filter(d => d.status === "PENDING_VERIFICATION").length;
  const verifiedCount = documents.filter(d => d.status === "VERIFIED").length;

  const handleRecalculateScores = () => {
    setIsRecalculating(true);
    setTimeout(() => {
      visibleLocations.forEach(loc => {
        api.calculateLocationScore(loc.id);
      });
      loadData();
      setIsRecalculating(false);
    }, 500);
  };

  const handleUploadSuccess = async (docData, file) => {
    await api.uploadDocument(docData, file);
    loadData();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Cascading Risk Warning */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-amber-950">
              Cascading Risk Warning: Andheri Central Fulfillment Warehouse
            </h2>
            <p className="text-xs text-amber-900/80 mt-1 max-w-2xl leading-relaxed">
              Lift Safety Clearance expired. As per regulatory rules, the downstream{" "}
              <strong>Fire Safety NOC</strong> is automatically penalized (-18 pts) until the prerequisite is renewed.
            </p>
          </div>
        </div>
        <Link
          to="/compliance"
          className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
        >
          View Dependency Graph
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Org Rolled-Up Compliance Gauge */}
        <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Org Compliance Index
            </div>
            <div className="text-2xl font-black text-gray-900 mt-1">{avgScore}%</div>
            <div className="text-[11px] text-gray-500 mt-1 font-medium">
              Rolled up across {visibleLocations.length} locations
            </div>
          </div>
          <div className="scale-75 -mr-3">
            <ScoreGauge score={avgScore} size={90} strokeWidth={8} showLabel={false} />
          </div>
        </div>

        {/* Active Documents */}
        <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Verified Certificates
            </div>
            <div className="text-2xl font-black text-emerald-600 mt-1">{verifiedCount}</div>
            <div className="text-[11px] text-gray-500 mt-1 font-medium">
              Tamper-evident SHA-256 hashed
            </div>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <FileCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Pending Verification */}
        <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Pending Approvals
            </div>
            <div className="text-2xl font-black text-indigo-600 mt-1">{pendingCount}</div>
            <div className="text-[11px] text-gray-500 mt-1 font-medium">
              Awaiting Org Admin sign-off
            </div>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        {/* Expired / Cascading Risks */}
        <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Lapsed / At-Risk
            </div>
            <div className="text-2xl font-black text-red-600 mt-1">{expiredCount}</div>
            <div className="text-[11px] text-gray-500 mt-1 font-medium">
              Actionable renewal alerts
            </div>
          </div>
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Grid: Location Scoreboard & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Location Scoreboard */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200/90 shadow-xs p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">Location Statutory Compliance</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Real-time scoring based on validity, proximity to expiry, state rules, and cascading risk
              </p>
            </div>
            <button
              onClick={handleRecalculateScores}
              disabled={isRecalculating}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRecalculating ? "animate-spin" : ""}`} />
              Recalculate
            </button>
          </div>

          <div className="divide-y divide-gray-100">
            {visibleLocations.map((loc) => {
              const score = loc.current_compliance_score || 100;
              const isHealthy = score >= 90;
              const isWarning = score >= 70 && score < 90;

              return (
                <div key={loc.id} className="py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-700 shrink-0 text-sm">
                      {loc.code.substring(0, 3)}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        {loc.name}
                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                          {loc.type}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {loc.state} &bull; Code: {loc.code} &bull; Lead: {loc.manager_name || "Manager"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div
                        className={`text-sm font-black ${
                          isHealthy ? "text-emerald-600" : isWarning ? "text-amber-600" : "text-red-600"
                        }`}
                      >
                        {score}%
                      </div>
                      <div className="text-[10px] text-gray-400 font-semibold uppercase">
                        {isHealthy ? "Compliant" : isWarning ? "Warning" : "Critical"}
                      </div>
                    </div>
                    <Link
                      to="/compliance"
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Quick Actions & Intelligence Tips */}
        <div className="space-y-6">
          {/* Quick Action Buttons */}
          <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-5 space-y-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Quick Compliance Actions
            </h3>
            <button
              onClick={() => setShowUploadModal(true)}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload Regulatory Document
            </button>
            <Link
              to="/audit-links"
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2"
            >
              Generate External Audit Link
            </Link>
          </div>

          {/* SCLIP Feature Highlights from README */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4" />
              Academic Architecture Highlights
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              <strong>Dynamic Scoring:</strong> Unlike a static checklist, SCLIP computes a live 0–100 score by factoring proximity to expiry, lifetime exemptions, cascading prerequisite risks, and jurisdictional gap detection.
            </p>
            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>SHA-256 Document Integrity</span>
              <span className="text-emerald-400 font-semibold">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Document Modal */}
      <UploadDocumentModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleUploadSuccess}
        locations={visibleLocations}
        licenseTypes={licenseTypes}
      />
    </div>
  );
}
