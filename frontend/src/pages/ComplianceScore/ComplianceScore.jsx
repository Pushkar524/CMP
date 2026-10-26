import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Building,
  RefreshCw,
  Sparkles,
  CalendarDays,
  Layers,
  Clock,
  ShieldCheck,
  FileText,
  Filter,
  Calendar
} from "lucide-react";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import ScoreGauge from "../../components/ScoreGauge";
import DependencyGraph from "../../components/DependencyGraph";
import TrendChart from "../../components/TrendChart";
import { ComplianceScoreSkeleton, BufferingLoader } from "../../components/Skeletons";

const STATUTORY_CALENDAR_EVENTS = [
  {
    id: "epf_esi_monthly",
    title: "EPF & ESI Monthly Electronic Challan & Remittance",
    category: "LABOUR",
    statutoryAct: "EPF & MP Act, 1952 & ESI Act, 1948",
    dueDate: "2026-11-15",
    frequency: "Monthly (15th)",
    matchedCodes: ["EPF_REGISTRATION", "ESI_REGISTRATION"],
    description: "Monthly electronic contribution filing for employees' provident fund and statutory health insurance coverage.",
  },
  {
    id: "gstr_3b_monthly",
    title: "GSTR-3B Summary Return & Tax Settlement",
    category: "TAX",
    statutoryAct: "Central Goods and Services Tax Act, 2017",
    dueDate: "2026-11-20",
    frequency: "Monthly (20th)",
    matchedCodes: ["GST_REGISTRATION"],
    description: "Self-declaration summary return for monthly inward/outward supplies and tax liability settlement.",
  },
  {
    id: "advance_tax_q3",
    title: "Advance Income Tax - 3rd Installment (75%)",
    category: "TAX",
    statutoryAct: "Income Tax Act, 1961 - Section 208/211",
    dueDate: "2026-12-15",
    frequency: "Quarterly (Dec 15)",
    matchedCodes: ["PAN", "GST_REGISTRATION"],
    description: "Mandatory corporate advance tax payment milestone for corporate entities whose tax liability exceeds ₹10,000.",
  },
  {
    id: "clra_half_yearly",
    title: "Contract Labour (CLRA) Half-Yearly Return Filing",
    category: "LABOUR",
    statutoryAct: "Contract Labour (Regulation & Abolition) Act, 1970",
    dueDate: "2027-01-30",
    frequency: "Half-Yearly (Jan 30)",
    matchedCodes: ["CONTRACT_LABOUR_LICENSE"],
    description: "Mandatory semi-annual submission of workforce engagement and minimum wages disbursement records.",
  },
  {
    id: "trade_license_renewal",
    title: "Municipal Trade License Annual Renewal Window",
    category: "MUNICIPAL",
    statutoryAct: "Karnataka Municipal Corporations Act / Local ULB Bylaws",
    dueDate: "2027-02-28",
    frequency: "Annual (Feb 28)",
    matchedCodes: ["TRADE_LICENSE", "SHOP_AND_ESTABLISHMENT"],
    description: "Annual statutory renewal for operating stores and commercial hubs within municipal limits.",
  },
  {
    id: "advance_tax_q4",
    title: "Advance Income Tax - 4th Installment (100%)",
    category: "TAX",
    statutoryAct: "Income Tax Act, 1961 - Section 208/211",
    dueDate: "2027-03-15",
    frequency: "Quarterly (Mar 15)",
    matchedCodes: ["PAN", "GST_REGISTRATION"],
    description: "Final installment of estimated annual corporation income tax.",
  },
  {
    id: "pcb_annual_return",
    title: "Consent to Operate (CTO) Environmental Compliance Return",
    category: "ENVIRONMENTAL",
    statutoryAct: "Water (P&CP) Act, 1974 & Air (P&CP) Act, 1981",
    dueDate: "2027-04-30",
    frequency: "Annual (Apr 30)",
    matchedCodes: ["POLLUTION_NOC", "HAZARDOUS_WASTE_AUTH"],
    description: "Annual environmental emissions and hazardous packaging waste management report to SPCB.",
  },
  {
    id: "fssai_annual_return",
    title: "FSSAI Food Business Annual Licensing Return",
    category: "MUNICIPAL",
    statutoryAct: "Food Safety and Standards Act, 2006",
    dueDate: "2027-05-31",
    frequency: "Annual (May 31)",
    matchedCodes: ["FSSAI_LICENSE"],
    description: "Annual declaration of food handling, storage, and cafeteria hygiene standards compliance.",
  },
];

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
  const [activeTab, setActiveTab] = useState("engine");
  const [calendarFilter, setCalendarFilter] = useState("ALL");

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

      {/* View Switcher: Engine vs Regulatory Calendar */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab("engine")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === "engine"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Scoring Engine & Risk Chains</span>
        </button>
        <button
          onClick={() => setActiveTab("calendar")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === "calendar"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>Statutory Regulatory Calendar</span>
          <span className="text-[10px] bg-indigo-100 text-indigo-700 font-extrabold px-1.5 py-0.5 rounded-full">
            2026–2027 Schedule
          </span>
        </button>
      </div>

      {/* Active Tab View */}
      {activeTab === "calendar" ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Next Upcoming Deadline</span>
              <div className="text-sm font-bold text-gray-900 mt-1 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>EPF & ESI Monthly Remittance</span>
              </div>
              <span className="text-xs text-amber-600 font-semibold mt-0.5 block">Due Nov 15, 2026 (~21 days)</span>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Monitored Statutory Acts</span>
              <div className="text-sm font-bold text-gray-900 mt-1 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>8 Acts & Jurisdictions</span>
              </div>
              <span className="text-xs text-gray-500 mt-0.5 block">Income Tax, EPF, CLRA, FSSAI, PCB</span>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Facility Scope</span>
              <div className="text-sm font-bold text-gray-900 mt-1 truncate">
                {selectedLoc?.name}
              </div>
              <span className="text-xs text-indigo-600 font-semibold mt-0.5 block">{selectedLoc?.state} &bull; {selectedLoc?.type}</span>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Readiness Health</span>
              <div className="text-sm font-bold text-emerald-600 mt-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Active Monitoring</span>
              </div>
              <span className="text-xs text-gray-500 mt-0.5 block">Auto-alerts enabled for all milestones</span>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {["ALL", "TAX", "LABOUR", "MUNICIPAL", "ENVIRONMENTAL"].map((cat) => (
              <button
                key={cat}
                onClick={() => setCalendarFilter(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  calendarFilter === cat
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {cat === "ALL" ? "All Statutory Filings (8)" : cat}
              </button>
            ))}
          </div>

          {/* Calendar Events Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {STATUTORY_CALENDAR_EVENTS
              .filter((ev) => calendarFilter === "ALL" || ev.category === calendarFilter)
              .map((ev) => {
                const now = new Date();
                const due = new Date(ev.dueDate);
                const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

                const matchingDoc = locDocs.find((d) =>
                  ev.matchedCodes.some((code) => d.license_type?.code === code || (d.file_name && d.file_name.toLowerCase().includes(code.toLowerCase())))
                );
                const isCovered = !!matchingDoc;

                return (
                  <div
                    key={ev.id}
                    className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs flex flex-col justify-between hover:border-indigo-200 transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          ev.category === "TAX" ? "bg-emerald-50 text-emerald-700" :
                          ev.category === "LABOUR" ? "bg-blue-50 text-blue-700" :
                          ev.category === "MUNICIPAL" ? "bg-amber-50 text-amber-700" :
                          "bg-purple-50 text-purple-700"
                        }`}>
                          {ev.category} &bull; {ev.frequency}
                        </span>

                        <span className="text-xs font-semibold text-gray-500 flex items-center gap-1 font-mono">
                          <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                          {ev.dueDate}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-gray-900 leading-snug">{ev.title}</h3>
                      <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{ev.description}</p>

                      <div className="mt-3 text-[10px] text-gray-600 bg-gray-50 p-2 rounded-lg font-medium">
                        <span className="font-bold text-gray-700">Governing Act:</span> {ev.statutoryAct}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                      <span className={`font-semibold ${diffDays <= 30 ? "text-amber-600" : "text-gray-500"}`}>
                        {diffDays > 0 ? `In ${diffDays} days` : "Due today"}
                      </span>

                      {isCovered ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Certificate On File
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Filing Required
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ) : (
        /* Main Scorecard & Breakdown */
        isSwitchingFacility ? (
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
      ))}
    </div>
  );
}
