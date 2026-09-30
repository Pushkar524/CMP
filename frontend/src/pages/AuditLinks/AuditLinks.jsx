import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Link2,
  Shield,
  Copy,
  ExternalLink,
  Ban,
  Clock,
  KeyRound,
  FileCheck,
  Eye,
  Check
} from "lucide-react";
import { api } from "../../services/api";
import CreateAuditLinkModal from "../../components/Modals/CreateAuditLinkModal";

export default function AuditLinks() {
  const [auditLinks, setAuditLinks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedToken, setCopiedToken] = useState(null);
  const [selectedLogs, setSelectedLogs] = useState(null);

  const loadData = () => {
    setAuditLinks(api.getAuditLinks());
    setDocuments(api.getDocuments());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = (data) => {
    api.createAuditLink(data);
    loadData();
  };

  const handleRevoke = (id) => {
    if (confirm("Are you sure you want to revoke this audit data room? Inspectors will immediately lose access.")) {
      api.revokeAuditLink(id);
      loadData();
    }
  };

  const handleCopyLink = (token) => {
    const url = `${window.location.origin}/audit/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Secure Cloud Data Rooms (Audit Links)</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Generate time-bound, revocable, and PIN-protected data rooms for external regulatory inspectors
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
        >
          <Link2 className="w-4 h-4" />
          Create New Audit Link
        </button>
      </div>

      {/* Audit Links List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {auditLinks.map((link) => {
          const isExpired = new Date(link.expires_at) < new Date();
          const exposedDocs = documents.filter((d) => (link.document_ids || []).includes(d.id));

          return (
            <div
              key={link.id}
              className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-all ${
                link.is_active && !isExpired ? "border-gray-200/90" : "border-gray-200 bg-gray-50/50 opacity-80"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                          link.is_active && !isExpired
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {link.is_active && !isExpired ? "Active Data Room" : "Revoked / Expired"}
                      </span>
                      {link.pin_hash && (
                        <span className="flex items-center gap-1 text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                          <KeyRound className="w-3 h-3" />
                          PIN Protected ({link.pin_hash})
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-gray-900 mt-2">{link.title}</h3>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mt-2 leading-relaxed">{link.notes}</p>

                {/* Expiration and Scoped Docs Count */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span>Expires: {new Date(link.expires_at).toLocaleDateString()}</span>
                  </div>
                  <div className="font-semibold text-indigo-600">
                    {exposedDocs.length} Documents Shared
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyLink(link.token)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors"
                  >
                    {copiedToken === link.token ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        Copied Link!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy Link
                      </>
                    )}
                  </button>

                  <Link
                    to={`/audit/${link.token}`}
                    target="_blank"
                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Open Inspector View"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedLogs(link)}
                    className="px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                  >
                    Access Logs ({link.access_logs?.length || 0})
                  </button>
                  {link.is_active && !isExpired && (
                    <button
                      onClick={() => handleRevoke(link.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Revoke Data Room Access"
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Access Logs Modal */}
      {selectedLogs && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">Inspector Access Audit Logs</h3>
                <p className="text-xs text-gray-500">{selectedLogs.title}</p>
              </div>
              <button
                onClick={() => setSelectedLogs(null)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                Close
              </button>
            </div>

            <div className="my-4 space-y-2.5 max-h-60 overflow-y-auto">
              {!selectedLogs.access_logs || selectedLogs.access_logs.length === 0 ? (
                <p className="text-xs text-gray-500 py-4 text-center">No inspector access recorded yet.</p>
              ) : (
                selectedLogs.access_logs.map((log, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-800">IP: {log.ip_address}</span>
                      <span
                        className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          log.success ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                        }`}
                      >
                        {log.success ? "Passed Verification" : "PIN Failed"}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1">
                      Accessed at: {new Date(log.accessed_at).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setSelectedLogs(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Audit Link Modal */}
      <CreateAuditLinkModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreate}
        documents={documents}
      />
    </div>
  );
}
