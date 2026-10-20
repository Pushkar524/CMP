import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Building,
  RefreshCw,
  Sparkles
} from "lucide-react";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import ScoreGauge from "../../components/ScoreGauge";
import DependencyGraph from "../../components/DependencyGraph";
import TrendChart from "../../components/TrendChart";
import { ComplianceScoreSkeleton, BufferingLoader } from "../../components/Skeletons";

export default function ComplianceScore() {
  const { canAccessLocation } = useAuth();
  const [locations, setLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [dependencies, setDependencies] = useState([]);
  const [licenseTypes, setLicenseTypes] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [scoreResult, setScoreResult] = useState(null);
  const [scoreHistory, setScoreHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitchingFacility, setIsSwitchingFacility] = useState(false);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setIsLoading(true);
        const [nextLocations, nextDependencies, nextLicenseTypes, nextDocuments] = await Promise.all([
          api.getLocations(),
          api.getDependencies(),
          api.getLicenseTypes(),
          api.getDocuments(),
        ]);
        if (!isMounted) return;

        const locs = (Array.isArray(nextLocations) ? nextLocations : []).filter(l => canAccessLocation(l.id));
        setLocations(locs);
        setDependencies(Array.isArray(nextDependencies) ? nextDependencies : []);
        setLicenseTypes(Array.isArray(nextLicenseTypes) ? nextLicenseTypes : []);
        setDocuments(Array.isArray(nextDocuments) ? nextDocuments : []);

        if (locs.length > 0) {
          const initialLocId = locs[0].id;
          setSelectedLocationId(initialLocId);

          // Fetch initial location score and historical trend before dismissing buffering loader
          const [nextScore, nextHistory] = await Promise.all([
            api.calculateLocationScore(initialLocId),
            api.getLocationHistory(initialLocId),
          ]);
          if (!isMounted) return;

          setScoreResult(nextScore);
          setScoreHistory(Array.isArray(nextHistory?.history) ? nextHistory.history : []);
        } else {
          setScoreResult(null);
          setScoreHistory([]);
        }
      } catch (error) {
        console.error("Compliance data loading failed", error);
        if (isMounted) {
          setLocations([]);
          setDependencies([]);
          setLicenseTypes([]);
          setDocuments([]);
          setScoreResult(null);
          setScoreHistory([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleFacilityChange = async (newLocationId) => {
    if (!newLocationId || newLocationId === selectedLocationId || isSwitchingFacility) return;
    setSelectedLocationId(newLocationId);
    setIsSwitchingFacility(true);
    try {
      if (newLocationId === "all") {
        const overview = await api.getOrganizationOverview();
        setScoreResult({
          score: overview.averageScore,
          breakdown: overview.breakdown,
        });
        setScoreHistory([]);
      } else {
        const [nextScore, nextHistory] = await Promise.all([
          api.calculateLocationScore(newLocationId),
          api.getLocationHistory(newLocationId),
        ]);
        setScoreResult(nextScore);
        setScoreHistory(Array.isArray(nextHistory?.history) ? nextHistory.history : []);
      }
    } catch (error) {
      console.error("Compliance score loading failed for facility", error);
    } finally {
      setIsSwitchingFacility(false);
    }
  };

  const handleRefreshScore = async () => {
    if (!selectedLocationId || isSwitchingFacility) return;
    setIsSwitchingFacility(true);
    try {
      if (selectedLocationId === "all") {
        const overview = await api.getOrganizationOverview();
        setScoreResult({
          score: overview.averageScore,
          breakdown: overview.breakdown,
        });
        setScoreHistory([]);
      } else {
        const [nextScore, nextHistory] = await Promise.all([
          api.calculateLocationScore(selectedLocationId),
          api.getLocationHistory(selectedLocationId),
        ]);
        setScoreResult(nextScore);
        setScoreHistory(Array.isArray(nextHistory?.history) ? nextHistory.history : []);
      }
    } catch (error) {
      console.error("Compliance score refresh failed", error);
    } finally {
      setIsSwitchingFacility(false);
    }
  };

  const selectedLoc = selectedLocationId === "all"
    ? { id: "all", name: "Overall Organization Footprint", type: "All Facilities", state: "Multi-State" }
    : locations.find(l => l.id === selectedLocationId);

  const locDocs = selectedLocationId === "all"
    ? documents
    : documents.filter(d => d.location_id === selectedLocationId);

  const scoreBreakdown = scoreResult?.breakdown || {};
  const scoreSummary = scoreBreakdown.summary || {};
  const deductions = scoreBreakdown.deductions || [];
  const rawSuggestions = scoreBreakdown.suggestedActions || scoreResult?.suggestions || [];

  // Deduplicate and consolidate deductions if multiple entries exist for the same license
  const consolidatedDeductions = [];
  const deductionMap = new Map();

  for (const d of deductions) {
    const key = `${d.locationName || ''}-${d.licenseName || d.licenseCode || d.reason}`;
    if (!deductionMap.has(key)) {
      const entry = {
        ...d,
        reason: d.reason ? d.reason.replace(/\bis prerequisite missing\b/gi, 'is missing') : d.reason,
      };
      deductionMap.set(key, entry);
      consolidatedDeductions.push(entry);
    } else {
      const existing = deductionMap.get(key);
      if (d.reason && existing.reason !== d.reason) {
        const cleanedReason = d.reason.replace(/\bis prerequisite missing\b/gi, 'is missing');
        const blockerMatch = cleanedReason.match(/prerequisite\s*\(([^)]+)\)/i);
        const existingMatch = existing.reason.match(/prerequisite[s]?\s*\(([^)]+)\)/i);
        if (blockerMatch && existingMatch) {
          const combined = Array.from(new Set([...existingMatch[1].split(/,\s*/), blockerMatch[1]])).join(', ');
          existing.reason = `Cascading Risk: Downstream operations blocked because prerequisites (${combined}) are missing or expired`;
        } else {
          existing.reason = `${existing.reason}; ${cleanedReason}`;
        }
      }
      if (d.recommendation && existing.recommendation !== d.recommendation) {
        existing.recommendation = `${existing.recommendation} | ${d.recommendation}`;
      }
    }
  }

  const suggestions = consolidatedDeductions.length > 0
    ? consolidatedDeductions.map((d) => ({
        title: d.licenseName || d.reason,
        reason: d.reason,
        desc: d.recommendation || d.reason,
        severity: d.severity || (d.penalty >= 15 ? "CRITICAL" : d.penalty >= 10 ? "HIGH" : "MEDIUM"),
        penalty: d.penalty,
        statutoryAct: d.statutoryAct,
        penaltyRisk: d.penaltyRisk,
        locationName: d.locationName,
      }))
    : rawSuggestions.map((action) => ({
        title: typeof action === "string" ? action.split(" (+")[0] : action.title || "Compliance Action Required",
        desc: typeof action === "string" ? action : action.desc || "",
        severity: typeof action === "string" && action.toLowerCase().includes("critical") ? "CRITICAL" : "HIGH",
        penalty: null,
      }));

  const totalMandatory = scoreBreakdown.totalMandatory ?? scoreSummary.totalRequired ?? 0;
  const uploadedCount = scoreBreakdown.uploadedCount ?? scoreSummary.compliantCount ?? 0;
  const gapsCount = scoreBreakdown.gapsCount ?? scoreSummary.missingCount ?? 0;

  // Buffer until all core metadata and the initial score have finished loading
  if (isLoading || (locations.length > 0 && (!selectedLoc || !scoreResult))) {
    return <ComplianceScoreSkeleton />;
  }

  if (locations.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-12 text-center">
        <Building className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-base font-bold text-gray-900">No Facilities Available</h3>
        <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
          You don't have access to any facilities or no locations have been configured yet.
        </p>
      </div>
    );
  }

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

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Facility:
            </label>
            <select
              value={selectedLocationId}
              onChange={(e) => handleFacilityChange(e.target.value)}
              disabled={isSwitchingFacility}
              className="text-xs border border-gray-300 rounded-xl px-3 py-2 bg-white font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden disabled:opacity-50 cursor-pointer"
            >
              <option value="all">Overall Footprint (All Facilities)</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.code} - {loc.state})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleRefreshScore}
            disabled={isSwitchingFacility}
            className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 transition-colors cursor-pointer disabled:opacity-50"
            title="Recalculate live compliance score & AI regulatory audit"
          >
            <RefreshCw className={`w-4 h-4 ${isSwitchingFacility ? "animate-spin text-indigo-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Scorecard & Breakdown */}
      {isSwitchingFacility ? (
        <BufferingLoader
          title="Recalculating Compliance Profile..."
          message={`Evaluating filings, risk chains, and behind-the-scenes statutory audit for ${
            selectedLoc?.name || "selected facility"
          }...`}
          className="my-6 min-h-[360px]"
        />
      ) : (
        <>
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
                        {totalMandatory} Licenses
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-100">
                      <span className="text-gray-500">Uploaded & Verified:</span>
                      <span className="font-bold text-emerald-600">
                        {uploadedCount} Active
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-100">
                      <span className="text-gray-500">Jurisdictional Gaps:</span>
                      <span className="font-bold text-red-600">
                        {gapsCount} Missing
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
                    {suggestions.length} Actionable Items
                  </span>
                </div>

                {/* Behind-The-Scenes AI Regulatory Audit Insight */}
                {scoreBreakdown.aiAudit && (
                  <div className="p-3.5 bg-gradient-to-r from-violet-50/80 to-indigo-50/50 border border-violet-100 rounded-xl text-xs text-violet-950 flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-violet-900 text-xs">AI Statutory Audit:</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-200/70 text-violet-800">
                          {scoreBreakdown.aiAudit.healthTitle || scoreBreakdown.healthStatus}
                        </span>
                        {scoreBreakdown.aiAudit.potentialScore && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            Target Score: {scoreBreakdown.aiAudit.potentialScore}
                          </span>
                        )}
                      </div>
                      {scoreBreakdown.aiAudit.executiveSummary && (
                        <p className="text-gray-700 leading-relaxed text-[11px]">
                          {scoreBreakdown.aiAudit.executiveSummary}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {suggestions.length === 0 ? (
                    <div className="p-8 text-center bg-emerald-50 rounded-xl border border-emerald-100">
                      <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                      <h4 className="text-sm font-bold text-emerald-950">100% Fully Compliant</h4>
                      <p className="text-xs text-emerald-700 mt-1">
                        No gaps, no lapsed prerequisites, and all required documents are within healthy validity windows.
                      </p>
                    </div>
                  ) : (
                    suggestions.map((sug, idx) => {
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
                                <div className="font-bold text-sm text-gray-900 flex items-center gap-2">
                                  <span>{sug.title}</span>
                                  {sug.locationName && (
                                    <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                      {sug.locationName}
                                    </span>
                                  )}
                                </div>
                                {sug.reason && sug.reason !== sug.title && (
                                  <div className="text-[11px] font-medium text-gray-600 mt-0.5">{sug.reason}</div>
                                )}
                                <p className="mt-1 text-xs opacity-85 leading-relaxed">{sug.desc}</p>

                                {/* Behind-The-Scenes Enriched Statutory Act & Legal Exposure */}
                                {sug.statutoryAct && (
                                  <div className="text-[10px] text-gray-600 mt-1.5 flex items-center gap-1 font-medium">
                                    <span className="font-bold text-gray-700">Statutory Reference:</span> {sug.statutoryAct}
                                  </div>
                                )}
                                {sug.penaltyRisk && (
                                  <div className="text-[10px] text-red-700 mt-0.5 font-medium">
                                    <span className="font-bold">Legal Exposure:</span> {sug.penaltyRisk}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <span
                                className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                  isCritical
                                    ? "bg-red-200 text-red-800"
                                    : isHigh
                                    ? "bg-amber-200 text-amber-800"
                                    : "bg-blue-200 text-blue-800"
                                }`}
                              >
                                {sug.severity}
                              </span>
                              {sug.penalty != null && (
                                <span className="text-[10px] font-bold text-red-600 bg-red-100/80 px-1.5 py-0.5 rounded">
                                  -{sug.penalty} pts
                                </span>
                              )}
                            </div>
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
          <TrendChart locationName={selectedLoc?.name} history={scoreHistory} />
        </>
      )}
    </div>
  );
}
