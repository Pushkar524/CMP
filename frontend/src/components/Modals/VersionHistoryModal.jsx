import React from "react";
import { X, GitCommit, ShieldCheck, Calendar, ArrowDown } from "lucide-react";

export default function VersionHistoryModal({ isOpen, onClose, document, allDocuments = [] }) {
  if (!isOpen || !document) return null;

  // Reconstruct version chain
  // In mock data: doc-1 has version 2, and parent doc-prev-001
  const history = [
    {
      version: document.version || 2,
      file_name: document.file_name,
      issue_date: document.issue_date,
      expiry_date: document.expiry_date,
      sha256_hash: document.sha256_hash,
      status: document.status,
      verified_by: document.verified_by_name || "Anantha Krishna",
      is_current: true
    },
    {
      version: (document.version || 2) - 1,
      file_name: document.file_name.replace("2026", "2025").replace("Draft", "Archived"),
      issue_date: "2024-04-01",
      expiry_date: "2025-03-31",
      sha256_hash: "7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
      status: "EXPIRED",
      verified_by: "Anantha Krishna",
      is_current: false
    }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <GitCommit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Renewal & Version History</h2>
              <p className="text-xs text-gray-500">{document.license_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {history.map((ver, idx) => (
            <div key={ver.version} className="relative">
              {idx < history.length - 1 && (
                <div className="absolute left-4 top-10 bottom-0 w-0.5 bg-gray-200 -z-10" />
              )}
              <div className={`p-4 rounded-xl border ${ver.is_current ? 'bg-indigo-50/50 border-indigo-200 ring-1 ring-indigo-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${ver.is_current ? 'bg-indigo-600 text-white' : 'bg-gray-300 text-gray-700'}`}>
                      v{ver.version}
                    </span>
                    <div>
                      <span className="text-xs font-bold text-gray-900">{ver.file_name}</span>
                      {ver.is_current && (
                        <span className="ml-2 text-[10px] font-bold uppercase px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full">
                          Current Active
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ver.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'}`}>
                    {ver.status}
                  </span>
                </div>

                <div className="text-[11px] text-gray-600 space-y-1 mt-2">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span>Validity: {ver.issue_date} &rarr; {ver.expiry_date}</span>
                  </div>
                  <div className="font-mono text-[9px] bg-white p-1 rounded border border-gray-200 text-gray-500 truncate">
                    SHA-256: {ver.sha256_hash}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-3 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            Close History
          </button>
        </div>
      </div>
    </div>
  );
}
