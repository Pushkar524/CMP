import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ShieldCheck,
  Lock,
  KeyRound,
  FileText,
  Calendar,
  Building,
  CheckCircle2,
  AlertTriangle,
  Download
} from "lucide-react";
import { api } from "../../services/api";

export default function AuditView() {
  const { token } = useParams();
  const [pin, setPin] = useState("");
  const [accessState, setAccessState] = useState({ allowed: false, link: null, message: "" });
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pinError, setPinError] = useState("");

  useEffect(() => {
    // Attempt access (without pin first in case no pin required)
    const result = api.recordAuditAccess(token, "");
    if (result.allowed) {
      setAccessState(result);
      const allDocs = api.getDocuments();
      setDocuments(allDocs.filter(d => (result.link.document_ids || []).includes(d.id)));
    } else {
      setAccessState(result);
    }
    setIsLoading(false);
  }, [token]);

  const handlePinSubmit = (e) => {
    e.preventDefault();
    const result = api.recordAuditAccess(token, pin);
    if (result.allowed) {
      setAccessState(result);
      const allDocs = api.getDocuments();
      setDocuments(allDocs.filter(d => (result.link.document_ids || []).includes(d.id)));
      setPinError("");
    } else {
      setPinError(result.message || "Invalid PIN code.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="text-center text-sm font-semibold text-gray-500 animate-pulse">
          Validating Secure Audit Token...
        </div>
      </div>
    );
  }

  // If rejected because revoked or expired
  if (!accessState.allowed && accessState.message && !accessState.message.includes("PIN")) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl max-w-md w-full p-8 text-center shadow-xl border border-gray-200">
          <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Access Denied</h2>
          <p className="text-xs text-gray-500 mt-2">{accessState.message}</p>
        </div>
      </div>
    );
  }

  // If PIN prompt required
  if (!accessState.allowed) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl max-w-sm w-full p-8 shadow-2xl border border-slate-700 animate-in fade-in duration-200">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 text-center">Protected Cloud Data Room</h2>
          <p className="text-xs text-gray-500 text-center mt-1">
            This regulatory package requires a PIN issued by the organization.
          </p>

          <form onSubmit={handlePinSubmit} className="mt-6 space-y-4">
            <div>
              <input
                type="password"
                maxLength={6}
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter PIN (e.g. 1234)"
                className="w-full text-center tracking-widest text-lg font-bold border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
              {pinError && <p className="text-xs text-red-600 font-semibold text-center mt-2">{pinError}</p>}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
            >
              Verify & Enter Data Room
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Granted Access View
  const link = accessState.link;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased pb-12">
      {/* Inspector Header */}
      <header className="bg-white border-b border-gray-200 py-4 px-6 md:px-12 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-white text-base">
            S
          </div>
          <div>
            <h1 className="font-extrabold text-gray-900 text-base">SCLIP External Inspector Portal</h1>
            <span className="text-[10px] text-gray-400 block -mt-0.5">Secure Dual-Custody Cloud Data Room</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-full border border-emerald-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Verified Statutory Package
          </span>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto mt-8 px-4 space-y-6">
        {/* Inspection Header Card */}
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded">
            Audit Clearance Package
          </span>
          <h2 className="text-xl font-black text-gray-900 mt-2">{link.title}</h2>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{link.notes}</p>

          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between text-xs text-gray-500 gap-2">
            <span>Prepared by: <strong>{link.created_by_name}</strong></span>
            <span>Valid Until: <strong>{new Date(link.expires_at).toLocaleString()}</strong></span>
          </div>
        </div>

        {/* Exposed Document Registry */}
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="text-sm font-bold text-gray-900">
              Verified Compliance Documents ({documents.length})
            </h3>
            <span className="text-xs text-gray-400">All certificates verified with SHA-256</span>
          </div>

          <div className="divide-y divide-gray-100">
            {documents.map((doc) => (
              <div key={doc.id} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shrink-0 mt-0.5">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">{doc.license_name}</h4>
                    <div className="text-xs text-gray-500 mt-0.5">{doc.file_name}</div>
                    <div className="mt-2 text-[10px] font-mono text-gray-500 bg-gray-50 px-2 py-1 rounded border border-gray-200 inline-block break-all">
                      SHA-256: {doc.sha256_hash}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 self-end sm:self-center">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {doc.status}
                  </span>
                  <button
                    onClick={() => alert(`Simulating cryptographic verification & secure download for ${doc.file_name}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
