import React, { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Scale,
  GitBranch,
  CheckCircle2,
  ListOrdered
} from "lucide-react";
import { api } from "../../services/api";
import { BufferingLoader } from "../Skeletons";

export default function AiAuditModal({ isOpen, onClose, locationId, locationName }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("gaps"); // "gaps" | "cascading" | "roadmap"

  const fetchAudit = async () => {
    if (!locationId) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.getLocationAiAudit(locationId);
      setData(res);
    } catch (err) {
      console.error("AI audit failed:", err);
      setError(err.message || "Could not complete AI compliance audit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && locationId) {
      fetchAudit();
    } else {
      setData(null);
    }
  }, [isOpen, locationId]);

  if (!isOpen) return null;

  const analysis = data?.analysis || {};
  const isCritical = analysis.overallHealth === "CRITICAL";
  const isWarning = analysis.overallHealth === "WARNING";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-gray-100 flex items-start justify-between bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shrink-0">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-indigo-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-white">AI Compliance Auditor</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  Gemini 1.5 / 3.8 Flash
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Statutory gap recognition & remediation plan for <strong className="text-white">{locationName || data?.location?.name}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAudit}
              disabled={loading}
              title="Re-run AI Analysis"
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5 bg-slate-50/50">
          {loading && (
            <BufferingLoader
              title="Consulting Gemini AI Copilot..."
              message="Evaluating location jurisdiction, missing statutory filings, and cascading dependency blockages..."
              className="py-16"
            />
          )}

          {error && !loading && (
            <div className="p-5 bg-red-50 border border-red-200 rounded-2xl text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-red-600 mx-auto" />
              <p className="text-xs text-red-700 font-medium">{error}</p>
              <button
                onClick={fetchAudit}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
              >
                Retry Analysis
              </button>
            </div>
          )}

          {!loading && !error && data && (
            <>
              {/* Executive Summary & Score Potential Banner */}
              <div
                className={`p-5 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                  isCritical
                    ? "bg-rose-50/70 border-rose-200 text-rose-950"
                    : isWarning
                    ? "bg-amber-50/70 border-amber-200 text-amber-950"
                    : "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2.5 rounded-xl shrink-0 ${
                      isCritical
                        ? "bg-rose-600 text-white"
                        : isWarning
                        ? "bg-amber-600 text-white"
                        : "bg-emerald-600 text-white"
                    }`}
                  >
                    {isCritical ? (
                      <ShieldAlert className="w-5 h-5" />
                    ) : (
                      <ShieldCheck className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold">
                        {analysis.healthTitle || "Statutory Compliance Assessment"}
                      </h3>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          isCritical
                            ? "bg-rose-200 text-rose-900"
                            : isWarning
                            ? "bg-amber-200 text-amber-900"
                            : "bg-emerald-200 text-emerald-900"
                        }`}
                      >
                        {analysis.overallHealth || "EVALUATED"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 mt-1.5 leading-relaxed max-w-xl">
                      {analysis.executiveSummary}
                    </p>
                  </div>
                </div>

                {/* Score Projection Pill */}
                <div className="flex md:flex-col items-center justify-between md:items-end gap-2 bg-white/80 backdrop-blur-xs p-3 rounded-xl border border-black/5 shrink-0 w-full md:w-auto">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Score Potential
                  </span>
                  <div className="flex items-center gap-1 text-sm font-black text-indigo-600">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span>{data.location?.currentScore ?? 0}%</span>
                    <ArrowRight className="w-3 h-3 text-gray-400" />
                    <span className="text-emerald-700 text-base">{analysis.potentialScore || "100%"}</span>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-2 border-b border-gray-200 pb-2 text-xs font-bold">
                <button
                  onClick={() => setActiveTab("gaps")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                    activeTab === "gaps"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>Statutory Gaps ({analysis.criticalGaps?.length || 0})</span>
                </button>

                <button
                  onClick={() => setActiveTab("cascading")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                    activeTab === "cascading"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>Cascading Risks ({analysis.cascadingRisks?.length || 0})</span>
                </button>

                <button
                  onClick={() => setActiveTab("roadmap")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                    activeTab === "roadmap"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                  <span>Remediation Roadmap ({analysis.remediationRoadmap?.length || 0})</span>
                </button>
              </div>

              {/* Tab 1: Statutory Gaps */}
              {activeTab === "gaps" && (
                <div className="space-y-3">
                  {(analysis.criticalGaps || []).length === 0 ? (
                    <div className="p-8 text-center bg-white rounded-2xl border border-gray-200">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      <p className="text-xs text-gray-600 font-bold">No critical statutory gaps detected!</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">All mandatory jurisdictional filings are accounted for.</p>
                    </div>
                  ) : (
                    analysis.criticalGaps.map((gap, i) => (
                      <div
                        key={i}
                        className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-2 hover:border-indigo-200 transition-all"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="text-sm font-bold text-gray-900">{gap.licenseName}</h4>
                            <p className="text-[11px] font-semibold text-indigo-700 mt-0.5">
                              {gap.statutoryAct}
                            </p>
                          </div>
                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${
                              gap.urgency === "IMMEDIATE"
                                ? "bg-rose-100 text-rose-800"
                                : gap.urgency === "HIGH"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {gap.urgency}
                          </span>
                        </div>

                        <div className="p-2.5 bg-rose-50/60 border border-rose-100 rounded-xl text-xs text-rose-900">
                          <strong className="font-bold">⚠️ Legal Penalty Risk: </strong>
                          {gap.penaltyRisk}
                        </div>

                        <p className="text-xs text-gray-600 leading-relaxed pt-1">
                          <strong className="text-gray-900">Recommended Action: </strong>
                          {gap.remediationAdvice}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 2: Cascading Risks */}
              {activeTab === "cascading" && (
                <div className="space-y-3">
                  {(analysis.cascadingRisks || []).length === 0 ? (
                    <div className="p-8 text-center bg-white rounded-2xl border border-gray-200">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      <p className="text-xs text-gray-600 font-bold">No cascading blocks active</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">All prerequisite license chains are fully satisfied.</p>
                    </div>
                  ) : (
                    analysis.cascadingRisks.map((chain, i) => (
                      <div
                        key={i}
                        className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-2.5"
                      >
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-bold text-gray-900">{chain.blockedLicense}</span>
                          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-rose-100 text-rose-800">
                            BLOCKED
                          </span>
                        </div>

                        <div className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-start gap-2">
                          <ArrowRight className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-slate-500">Missing Prerequisite: </span>
                            <strong className="text-slate-900 font-bold">{chain.prerequisiteNeeded}</strong>
                          </div>
                        </div>

                        <p className="text-xs text-gray-600 leading-relaxed">
                          <strong className="text-gray-900">Impact: </strong>
                          {chain.impact}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 3: Remediation Roadmap */}
              {activeTab === "roadmap" && (
                <div className="space-y-3">
                  {(analysis.remediationRoadmap || []).map((step, i) => (
                    <div
                      key={i}
                      className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs flex items-start gap-3.5"
                    >
                      <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {step.step || i + 1}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-bold text-gray-900 leading-snug">{step.task}</h4>
                          <span className="text-xs font-black text-emerald-600 shrink-0">
                            {step.estimatedScoreBoost}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                          <span>Timeline:</span>
                          <strong className="text-slate-700">{step.timeline}</strong>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 border-t border-gray-100 bg-white flex items-center justify-between shrink-0">
          <span className="text-[11px] text-gray-400">
            Audit grounded in active Indian central and jurisdictional acts.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
          >
            Close Audit
          </button>
        </div>

      </div>
    </div>
  );
}
