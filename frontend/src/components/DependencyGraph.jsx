import React from "react";
import { ArrowRight, AlertTriangle, CheckCircle, ShieldCheck } from "lucide-react";

export default function DependencyGraph({ dependencies = [], licenseTypes = [], activeDocs = [] }) {
  // Check statuses
  const getDocStatus = (ltId) => {
    const doc = activeDocs.find(d => d.license_type_id === ltId);
    if (!doc) return { status: "MISSING", label: "Missing", color: "bg-gray-100 text-gray-600 border-gray-300" };
    if (doc.status === "EXPIRED" || (doc.expiry_date && new Date(doc.expiry_date) < new Date())) {
      return { status: "EXPIRED", label: "Expired", color: "bg-red-50 text-red-700 border-red-300" };
    }
    if (doc.status === "PENDING_VERIFICATION") {
      return { status: "PENDING", label: "Pending", color: "bg-amber-50 text-amber-700 border-amber-300" };
    }
    return { status: "VERIFIED", label: "Valid", color: "bg-emerald-50 text-emerald-700 border-emerald-300" };
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-indigo-600" />
            Cascading Risk Dependency Graph
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            If a blocking prerequisite lapses, downstream statutory licenses are automatically penalized.
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md">
          {dependencies.length} Active Rules
        </span>
      </div>

      <div className="space-y-4">
        {dependencies.map((dep) => {
          const prereqType = licenseTypes.find(lt => lt.id === dep.prerequisite_license_type_id);
          const targetType = licenseTypes.find(lt => lt.id === dep.license_type_id);
          const prereqStatus = getDocStatus(dep.prerequisite_license_type_id);
          const targetStatus = getDocStatus(dep.license_type_id);
          const isCascadingRisk = prereqStatus.status === "EXPIRED" && targetStatus.status === "VERIFIED";

          return (
            <div
              key={dep.id}
              className={`p-4 rounded-lg border transition-all ${
                isCascadingRisk
                  ? "bg-red-50/70 border-red-300 ring-2 ring-red-400/30"
                  : "bg-gray-50 border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Prerequisite Node */}
                <div className="flex-1">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Prerequisite License
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-white rounded-md border border-gray-200 shadow-xs">
                    <span className="text-sm font-semibold text-gray-800">
                      {prereqType?.name || "Prerequisite License"}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${prereqStatus.color}`}>
                      {prereqStatus.label}
                    </span>
                  </div>
                </div>

                {/* Connector Arrow */}
                <div className="flex flex-col items-center justify-center px-2">
                  <div className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded mb-1">
                    {dep.is_blocking ? "BLOCKING" : "NON-BLOCKING"}
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 rotate-90 md:rotate-0" />
                </div>

                {/* Dependent Target Node */}
                <div className="flex-1">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Dependent License
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-white rounded-md border border-gray-200 shadow-xs">
                    <span className="text-sm font-semibold text-gray-800">
                      {targetType?.name || "Target License"}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${targetStatus.color}`}>
                      {targetStatus.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cascading Alert Note */}
              {isCascadingRisk && (
                <div className="mt-3 flex items-start gap-2 bg-red-100/70 text-red-800 text-xs p-2 rounded border border-red-200">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                  <div>
                    <span className="font-bold">Cascading Risk Active: </span>
                    {prereqType?.name} is lapsed! Statutory compliance for {targetType?.name} is invalid regardless of its standalone expiry.
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
