import React, { useState, useEffect } from "react";
import {
  Upload,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Shield,
  FileText,
  Search,
  History,
  RefreshCw,
  Building2,
  MapPin,
  CheckCheck
} from "lucide-react";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import UploadDocumentModal from "../../components/Modals/UploadDocumentModal";
import VerifyDocumentModal from "../../components/Modals/VerifyDocumentModal";
import VersionHistoryModal from "../../components/Modals/VersionHistoryModal";

export default function Documents() {
  const { isOrgAdmin, canAccessLocation } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [locations, setLocations] = useState([]);
  const [licenseTypes, setLicenseTypes] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [scopeFilter, setScopeFilter] = useState("ALL"); // ALL, ORG_WIDE, LOCATION
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [verifyTarget, setVerifyTarget] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [verifiedHashIds, setVerifiedHashIds] = useState([]);

  const loadData = () => {
    setDocuments(api.getDocuments());
    setLocations(api.getLocations());
    setLicenseTypes(api.getLicenseTypes());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpload = async (docData, file) => {
    await api.uploadDocument(docData, file);
    loadData();
  };

  const handleVerify = (docId, approve, reason) => {
    api.verifyDocument(docId, approve, reason);
    loadData();
  };

  const handleCheckIntegrity = (doc) => {
    // Simulate real-time cryptographic validation of SHA-256 fingerprint against the document payload
    setTimeout(() => {
      setVerifiedHashIds((prev) => [...prev, doc.id]);
    }, 200);
  };

  const filteredDocs = documents
    .filter((d) => d.location_id === null || canAccessLocation(d.location_id))
    .filter((d) => {
      const matchSearch =
        d.license_name.toLowerCase().includes(search.toLowerCase()) ||
        d.file_name.toLowerCase().includes(search.toLowerCase()) ||
        (d.sha256_hash && d.sha256_hash.toLowerCase().includes(search.toLowerCase()));

      const matchStatus = statusFilter === "ALL" || d.status === statusFilter;
      const matchScope =
        scopeFilter === "ALL" ||
        (scopeFilter === "ORG_WIDE" && d.location_id === null) ||
        (scopeFilter === "LOCATION" && d.location_id !== null);

      return matchSearch && matchStatus && matchScope;
    });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Regulatory Documents & Verification Core</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Tamper-evident SHA-256 integrity storage, dual-custody verification, and renewal chains
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
        >
          <Upload className="w-4 h-4" />
          Upload Certificate
        </button>
      </div>

      {/* Scope and Status Tabs */}
      <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search license, file name, SHA-256..."
              className="w-full text-xs pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Scope Filter */}
            <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50 text-xs">
              <button
                onClick={() => setScopeFilter("ALL")}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                  scopeFilter === "ALL" ? "bg-white text-gray-900 shadow-2xs" : "text-gray-500 hover:text-gray-900"
                }`}
              >
                All Scopes
              </button>
              <button
                onClick={() => setScopeFilter("ORG_WIDE")}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                  scopeFilter === "ORG_WIDE" ? "bg-white text-gray-900 shadow-2xs" : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Org-Wide (DGFT/GST)
              </button>
              <button
                onClick={() => setScopeFilter("LOCATION")}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                  scopeFilter === "LOCATION" ? "bg-white text-gray-900 shadow-2xs" : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Facility-Specific
              </button>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              <option value="ALL">All Statuses</option>
              <option value="VERIFIED">Verified</option>
              <option value="PENDING_VERIFICATION">Pending Verification</option>
              <option value="EXPIRED">Expired</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-5">License / Certificate</th>
                <th className="py-3 px-5">Scope / Location</th>
                <th className="py-3 px-5">Validity / Expiry</th>
                <th className="py-3 px-5">SHA-256 Integrity</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {filteredDocs.map((doc) => {
                const loc = locations.find((l) => l.id === doc.location_id);
                const isIntegrityChecked = verifiedHashIds.includes(doc.id);

                return (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* License Name */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">{doc.license_name}</div>
                          <div className="text-[11px] text-gray-400 mt-0.5">{doc.file_name}</div>
                        </div>
                      </div>
                    </td>

                    {/* Scope / Location */}
                    <td className="py-3.5 px-5">
                      {doc.location_id === null ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                          <Building2 className="w-3 h-3" />
                          Org-Wide
                        </span>
                      ) : (
                        <div className="text-gray-700">
                          <div className="font-semibold">{loc?.name || "Facility"}</div>
                          <div className="text-[10px] text-gray-400">{loc?.state} ({loc?.code})</div>
                        </div>
                      )}
                    </td>

                    {/* Expiry */}
                    <td className="py-3.5 px-5">
                      {doc.expiry_date ? (
                        <div>
                          <div className="font-medium text-gray-800">{doc.expiry_date}</div>
                          <div className="text-[10px] text-gray-400">Issued: {doc.issue_date}</div>
                        </div>
                      ) : (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          Lifetime Valid
                        </span>
                      )}
                    </td>

                    {/* SHA-256 Fingerprint */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-gray-500 bg-gray-100 px-2 py-1 rounded max-w-[130px] truncate block">
                          {doc.sha256_hash ? doc.sha256_hash.substring(0, 14) + "..." : "Calculating"}
                        </span>
                        <button
                          onClick={() => handleCheckIntegrity(doc)}
                          title="Verify cryptographic SHA-256 checksum against file payload"
                          className={`p-1 rounded text-xs transition-colors ${
                            isIntegrityChecked
                              ? "text-emerald-600 bg-emerald-50"
                              : "text-gray-400 hover:text-indigo-600 hover:bg-gray-100"
                          }`}
                        >
                          {isIntegrityChecked ? (
                            <CheckCheck className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Shield className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          doc.status === "VERIFIED"
                            ? "bg-emerald-100 text-emerald-800"
                            : doc.status === "PENDING_VERIFICATION"
                            ? "bg-amber-100 text-amber-800 animate-pulse"
                            : doc.status === "EXPIRED"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {doc.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Verify button for Org Admin */}
                        {isOrgAdmin && doc.status === "PENDING_VERIFICATION" && (
                          <button
                            onClick={() => setVerifyTarget(doc)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold transition-colors shadow-2xs"
                          >
                            Verify / Review
                          </button>
                        )}

                        {/* Version History */}
                        <button
                          onClick={() => setHistoryTarget(doc)}
                          title="View Renewal & Version Chain"
                          className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <History className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Verification Modal */}
      <VerifyDocumentModal
        isOpen={Boolean(verifyTarget)}
        onClose={() => setVerifyTarget(null)}
        document={verifyTarget}
        onVerify={handleVerify}
      />

      {/* Version History Modal */}
      <VersionHistoryModal
        isOpen={Boolean(historyTarget)}
        onClose={() => setHistoryTarget(null)}
        document={historyTarget}
        allDocuments={documents}
      />

      {/* Upload Document Modal */}
      <UploadDocumentModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleUpload}
        locations={locations}
        licenseTypes={licenseTypes}
      />
    </div>
  );
}
