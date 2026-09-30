import React, { useState } from "react";
import { X, CheckCircle2, XCircle, ShieldCheck, FileText, AlertCircle } from "lucide-react";

export default function VerifyDocumentModal({ isOpen, onClose, document, onVerify }) {
  const [rejectReason, setRejectReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  if (!isOpen || !document) return null;

  const handleApprove = () => {
    onVerify(document.id, true);
    onClose();
  };

  const handleReject = (e) => {
    e.preventDefault();
    onVerify(document.id, false, rejectReason || "Regulatory document does not meet compliance standards or issuing seal is missing.");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Document Verification Workflow</h2>
              <p className="text-xs text-gray-500">Dual-custody verification by Org Admin</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {/* Certificate details */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200/80 space-y-2.5 text-xs text-gray-600">
            <div className="flex justify-between">
              <span className="font-semibold text-gray-500">License:</span>
              <span className="font-bold text-gray-900">{document.license_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-gray-500">File Name:</span>
              <span className="font-medium text-gray-800">{document.file_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-gray-500">Uploaded By:</span>
              <span className="font-medium text-gray-800">{document.uploaded_by_name || "Manager"}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-gray-500">Expiry Date:</span>
              <span className="font-medium text-gray-800">{document.expiry_date || "Lifetime Valid"}</span>
            </div>
            <div className="pt-2 border-t border-gray-200">
              <span className="font-semibold text-gray-500 block mb-1">SHA-256 Tamper-Proof Fingerprint:</span>
              <span className="font-mono text-[10px] text-gray-800 bg-white p-1.5 rounded border border-gray-200 block break-all">
                {document.sha256_hash}
              </span>
            </div>
          </div>

          {!isRejecting ? (
            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsRejecting(true)}
                className="flex-1 py-2.5 px-4 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-xl transition-colors flex items-center justify-center gap-1.5 border border-red-200"
              >
                <XCircle className="w-4 h-4" />
                Reject Certificate
              </button>
              <button
                type="button"
                onClick={handleApprove}
                className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                Verify & Confirm
              </button>
            </div>
          ) : (
            <form onSubmit={handleReject} className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-red-700 mb-1">
                  Reason for Rejection (Visible in Audit Trail)
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Issuing authority stamp unclear, wrong business location cited, expired validity period..."
                  rows={3}
                  required
                  className="w-full text-xs border border-red-300 rounded-lg p-2.5 focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRejecting(false)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-red-600 rounded-lg hover:bg-red-700"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
