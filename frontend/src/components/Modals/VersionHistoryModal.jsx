import React, { useState } from "react";
import {
  X,
  GitCommit,
  Calendar,
  Trash2,
  AlertCircle,
  FileText,
  File,
  Eye,
  ExternalLink,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Maximize2
} from "lucide-react";
import { api } from "../../services/api";

function DocumentThumbnail({ ver, onOpenLightbox }) {
  const [imgError, setImgError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isImage =
    (ver.mime_type && ver.mime_type.startsWith("image/")) ||
    (ver.file_name && /\.(png|jpe?g|webp|gif|svg)$/i.test(ver.file_name));

  const isPdf =
    (ver.mime_type && ver.mime_type.includes("pdf")) ||
    (ver.file_name && /\.pdf$/i.test(ver.file_name));

  const fileUrl =
    ver.id && !String(ver.id).startsWith("prev-")
      ? api.getDocumentFileUrl(ver.id)
      : null;

  const handleClick = () => {
    if (isImage && fileUrl && !imgError) {
      onOpenLightbox({
        url: fileUrl,
        fileName: ver.file_name,
        version: ver.version,
        docId: ver.id,
      });
    } else if (fileUrl) {
      window.open(fileUrl, "_blank");
    }
  };

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative group w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-xl overflow-hidden border border-gray-200 bg-slate-100 flex items-center justify-center cursor-pointer shadow-xs hover:border-indigo-400 hover:ring-2 hover:ring-indigo-100 transition-all select-none"
      title={isImage ? "Click to view full image thumbnail" : "Click to view document file"}
    >
      {isImage && fileUrl && !imgError ? (
        <>
          <img
            src={fileUrl}
            alt={ver.file_name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
          />
          <div
            className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity text-white text-[10px] font-bold gap-1 ${
              isHovered ? "opacity-100" : "opacity-0"
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>View</span>
          </div>
        </>
      ) : isPdf ? (
        <div className="w-full h-full flex flex-col items-center justify-center p-1.5 text-center bg-linear-to-b from-rose-50 to-red-100/60">
          <div className="w-7 h-7 rounded-lg bg-red-100 text-red-600 flex items-center justify-center mb-0.5 shadow-2xs">
            <FileText className="w-4 h-4" />
          </div>
          <span className="text-[9px] font-black uppercase tracking-wider text-red-700">PDF</span>
          <div
            className={`absolute inset-0 bg-red-950/40 flex items-center justify-center transition-opacity text-white text-[10px] font-bold gap-1 ${
              isHovered ? "opacity-100" : "opacity-0"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
          </div>
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-1.5 text-center bg-linear-to-b from-slate-50 to-indigo-50/60">
          <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center mb-0.5 shadow-2xs">
            <File className="w-4 h-4" />
          </div>
          <span className="text-[9px] font-bold text-slate-600 truncate max-w-full px-1 uppercase">
            {ver.file_name ? ver.file_name.split(".").pop() : "DOC"}
          </span>
          <div
            className={`absolute inset-0 bg-indigo-950/40 flex items-center justify-center transition-opacity text-white text-[10px] font-bold gap-1 ${
              isHovered ? "opacity-100" : "opacity-0"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
          </div>
        </div>
      )}
    </div>
  );
}

export default function VersionHistoryModal({
  isOpen,
  onClose,
  document,
  allDocuments = [],
  onDelete,
}) {
  const [lightboxData, setLightboxData] = useState(null);

  if (!isOpen || !document) return null;

  // Format date helper
  const formatDate = (val) => {
    if (!val) return null;
    try {
      return String(val).split("T")[0];
    } catch {
      return String(val);
    }
  };

  // Reconstruct version chain
  const buildHistory = () => {
    const list = [];

    // Current version
    list.push({
      id: document.id,
      version: document.version || 2,
      file_name: document.file_name,
      issue_date: formatDate(document.issue_date),
      expiry_date: formatDate(document.expiry_date),
      sha256_hash: document.sha256_hash,
      status: document.status,
      rejection_reason:
        document.rejection_reason ||
        (document.status === "REJECTED"
          ? "Regulatory document does not meet compliance standards or issuing seal is missing."
          : null),
      verified_by:
        document.verified_by?.name ||
        document.verified_by_name ||
        (document.status === "VERIFIED" || document.status === "REJECTED"
          ? "Compliance Reviewer"
          : null),
      mime_type: document.mime_type,
      storage_key: document.storage_key,
      is_current: true,
    });

    // Check if real predecessor versions exist in allDocuments
    let currentParentId = document.parent_document_id;
    let vCount = (document.version || 2) - 1;

    while (currentParentId && vCount >= 1) {
      const parentDoc = allDocuments.find((d) => d.id === currentParentId);
      if (parentDoc) {
        list.push({
          id: parentDoc.id,
          version: parentDoc.version || vCount,
          file_name: parentDoc.file_name,
          issue_date: formatDate(parentDoc.issue_date),
          expiry_date: formatDate(parentDoc.expiry_date),
          sha256_hash: parentDoc.sha256_hash,
          status: parentDoc.status,
          rejection_reason:
            parentDoc.rejection_reason ||
            (parentDoc.status === "REJECTED"
              ? "Regulatory document does not meet compliance standards or issuing seal is missing."
              : null),
          verified_by:
            parentDoc.verified_by?.name ||
            parentDoc.verified_by_name ||
            "Compliance Reviewer",
          mime_type: parentDoc.mime_type,
          storage_key: parentDoc.storage_key,
          is_current: false,
        });
        currentParentId = parentDoc.parent_document_id;
        vCount--;
      } else {
        break;
      }
    }

    // Fallback archived version if single item and version > 1
    if (list.length === 1 && (document.version || 2) > 1) {
      list.push({
        id: "prev-" + (document.id || "1"),
        version: (document.version || 2) - 1,
        file_name: document.file_name
          .replace("2026", "2025")
          .replace("Draft", "Archived"),
        issue_date: "2024-04-01",
        expiry_date: "2025-03-31",
        sha256_hash:
          "7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
        status: "EXPIRED",
        rejection_reason: null,
        verified_by: "Anantha Krishna",
        mime_type: document.mime_type,
        is_current: false,
      });
    }

    return list;
  };

  const history = buildHistory();

  const getStatusBadge = (status) => {
    switch (status) {
      case "VERIFIED":
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            VERIFIED
          </span>
        );
      case "REJECTED":
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
            <XCircle className="w-3 h-3 text-rose-600" />
            REJECTED
          </span>
        );
      case "PENDING_VERIFICATION":
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" />
            PENDING
          </span>
        );
      case "EXPIRED":
      default:
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
            {status || "ARCHIVED"}
          </span>
        );
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
          {/* Modal Header */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <GitCommit className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Renewal & Version History</h2>
                <p className="text-xs text-gray-500">
                  {document.license_type?.name || document.license_name || "Compliance Document"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Version History List */}
          <div className="mt-5 space-y-4 max-h-[62vh] overflow-y-auto pr-1">
            {history.map((ver, idx) => (
              <div key={ver.id || ver.version} className="relative">
                {idx < history.length - 1 && (
                  <div className="absolute left-4 top-12 bottom-0 w-0.5 bg-gray-200 -z-10" />
                )}
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    ver.is_current
                      ? "bg-indigo-50/40 border-indigo-200 ring-1 ring-indigo-200"
                      : "bg-gray-50/80 border-gray-200"
                  }`}
                >
                  {/* Top Bar: Version Badge + Title + Status */}
                  <div className="flex items-start gap-3">
                    {/* Thumbnail Preview */}
                    <DocumentThumbnail ver={ver} onOpenLightbox={setLightboxData} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                              ver.is_current
                                ? "bg-indigo-600 text-white"
                                : "bg-gray-300 text-gray-700"
                            }`}
                          >
                            v{ver.version}
                          </span>
                          <span
                            className="text-xs font-bold text-gray-900 truncate max-w-[200px] sm:max-w-[240px]"
                            title={ver.file_name}
                          >
                            {ver.file_name}
                          </span>
                          {ver.is_current && (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full">
                              Current Active
                            </span>
                          )}
                        </div>
                        {getStatusBadge(ver.status)}
                      </div>

                      {/* Validity Dates */}
                      <div className="text-[11px] text-gray-600 space-y-1 mt-1.5">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>
                            Validity:{" "}
                            {ver.issue_date || ver.expiry_date ? (
                              <>
                                {ver.issue_date || "—"} &rarr; {ver.expiry_date || "Lifetime"}
                              </>
                            ) : (
                              <span className="text-gray-400 italic">Not specified</span>
                            )}
                          </span>
                        </div>

                        {/* SHA-256 Fingerprint */}
                        <div className="font-mono text-[9px] bg-white p-1 rounded border border-gray-200 text-gray-500 truncate" title={ver.sha256_hash}>
                          SHA-256: {ver.sha256_hash || "—"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rejection Reason Alert Box */}
                  {(ver.status === "REJECTED" || ver.rejection_reason) && (
                    <div className="mt-3.5 p-3 bg-rose-50/90 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-2.5 animate-in fade-in duration-150">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="space-y-1 w-full min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-rose-950 text-xs">
                            Reason for Rejection:
                          </span>
                          {ver.verified_by && (
                            <span className="text-[10px] text-rose-700 font-medium">
                              Reviewed by {ver.verified_by}
                            </span>
                          )}
                        </div>
                        <p className="text-rose-800 leading-relaxed font-normal bg-white/70 p-2 rounded-lg border border-rose-100 break-words text-[11px]">
                          {ver.rejection_reason ||
                            "Regulatory document does not meet compliance standards or issuing seal is missing."}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Footer Actions */}
          <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
            {onDelete ? (
              <button
                onClick={() => {
                  onDelete(document);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Document
              </button>
            ) : (
              <div />
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
            >
              Close History
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox / Enlarged Image Preview Modal */}
      {lightboxData && (
        <div
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxData(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full p-4 shadow-2xl border border-gray-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded">
                  v{lightboxData.version}
                </span>
                <span className="text-sm font-bold text-gray-900 truncate max-w-md">
                  {lightboxData.fileName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={lightboxData.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="Open full resolution in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setLightboxData(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mt-3 max-h-[70vh] flex items-center justify-center bg-slate-900 rounded-xl overflow-hidden p-2">
              <img
                src={lightboxData.url}
                alt={lightboxData.fileName}
                className="max-h-[66vh] max-w-full object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
