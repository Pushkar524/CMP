import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Building,
  RefreshCw,
  ArrowRight
} from "lucide-react";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import ScoreGauge from "../../components/ScoreGauge";
import DependencyGraph from "../../components/DependencyGraph";
import TrendChart from "../../components/TrendChart";

export default function ComplianceScore() {
  const { canAccessLocation } = useAuth();
  const [locations, setLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [dependencies, setDependencies] = useState([]);
  const [licenseTypes, setLicenseTypes] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [scoreResult, setScoreResult] = useState(null);

  useEffect(() => {
    const locs = api.getLocations().filter(l => canAccessLocation(l.id));
    setLocations(locs);
    if (locs.length > 0) {
      setSelectedLocationId(locs[0].id);
    }
    setDependencies(api.getDependencies());
    setLicenseTypes(api.getLicenseTypes());
    setDocuments(api.getDocuments());
  }, []);

  useEffect(() => {
    if (selectedLocationId) {
      const res = api.calculateLocationScore(selectedLocationId);
      setScoreResult(res);
    }
  }, [selectedLocationId]);

  const selectedLoc = locations.find(l => l.id === selectedLocationId);
  const locDocs = documents.filter(d => d.location_id === selectedLocationId);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Rule-Based Compliance Score Engine</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Dynamic 0–100 scoring factoring expiry proximity, cascading risk chains, and jurisdictional gap analysis
          </p>
        </div>

        {/* Facility Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Facility:
          </label>
          <select
            value={selectedLocationId}
            onChange={(e) => setSelectedLocationId(e.target.value)}
            className="text-xs border border-gray-300 rounded-xl px-3 py-2 bg-white font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name} ({loc.code} - {loc.state})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Scorecard & Breakdown */}
      {scoreResult && selectedLoc && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Score Gauge & Engine Logic */}
          <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Live Statutory Score
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                  {selectedLoc.type} &bull; {selectedLoc.state}
                </span>
              </div>

              <div className="py-2">
                <ScoreGauge
                  score={scoreResult.score}
                  size={140}
                  strokeWidth={12}
                  subtitle={`${selectedLoc.name}`}
                />
              </div>

              {/* Scoring Engine Breakdown Factors */}
              <div className="mt-6 space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Statutory Mandatory Set:</span>
                  <span className="font-bold text-gray-900">
                    {scoreResult.breakdown.totalMandatory} Licenses
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Uploaded & Verified:</span>
                  <span className="font-bold text-emerald-600">
                    {scoreResult.breakdown.uploadedCount} Active
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Jurisdictional Gaps:</span>
                  <span className="font-bold text-red-600">
                    {scoreResult.breakdown.gapsCount} Missing
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 text-[11px] text-gray-500 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/60">
              <strong>Engine Logic:</strong> Computed by left-joining required license sets for {selectedLoc.type} in {selectedLoc.state}, factoring expiry proximity and walking blocking dependency chains.
            </div>
          </div>

          {/* Right: Engine Suggestions & Compliance Action Items */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200/90 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-gray-900">
                  Dynamic Compliance Suggestions & Risk Gaps
                </h3>
              </div>
              <span className="text-xs font-bold text-gray-400">
                {scoreResult.suggestions.length} Actionable Items
              </span>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {scoreResult.suggestions.length === 0 ? (
                <div className="p-8 text-center bg-emerald-50 rounded-xl border border-emerald-100">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-emerald-950">100% Fully Compliant</h4>
                  <p className="text-xs text-emerald-700 mt-1">
                    No gaps, no lapsed prerequisites, and all required documents are within healthy validity windows.
                  </p>
                </div>
              ) : (
                scoreResult.suggestions.map((sug, idx) => {
                  const isCritical = sug.severity === "CRITICAL";
                  const isHigh = sug.severity === "HIGH";

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border text-xs transition-all ${
                        isCritical
                          ? "bg-red-50/70 border-red-200 text-red-950"
                          : isHigh
                          ? "bg-amber-50/70 border-amber-200 text-amber-950"
                          : "bg-blue-50/70 border-blue-200 text-blue-950"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle
                            className={`w-4 h-4 shrink-0 mt-0.5 ${
                              isCritical ? "text-red-600" : isHigh ? "text-amber-600" : "text-blue-600"
                            }`}
                          />
                          <div>
                            <div className="font-bold text-sm">{sug.title}</div>
                            <p className="mt-1 text-xs opacity-85 leading-relaxed">{sug.desc}</p>
                          </div>
                        </div>
                        <span
                          className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                            isCritical
                              ? "bg-red-200 text-red-800"
                              : isHigh
                              ? "bg-amber-200 text-amber-800"
                              : "bg-blue-200 text-blue-800"
                          }`}
                        >
                          {sug.severity}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cascading Risk Dependency Graph */}
      <DependencyGraph
        dependencies={dependencies}
        licenseTypes={licenseTypes}
        activeDocs={locDocs}
      />

      {/* Historical Trend Chart */}
      <TrendChart locationName={selectedLoc?.name} />
    </div>
  );
}
