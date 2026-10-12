import React from "react";
import { X, Trash2, AlertTriangle, FileText, Loader2 } from "lucide-react";

export default function DeleteDocumentModal({
  isOpen,
  onClose,
  document,
  onDelete,
  isDeleting = false,
}) {
  if (!isOpen || !document) return null;

  const handleDelete = () => {
    onDelete(document.id);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Delete Document</h2>
              <p className="text-xs text-gray-500">Permanent registry purge</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-4">
          <div className="p-3.5 bg-rose-50/70 border border-rose-200/80 rounded-xl flex items-start gap-3 text-rose-800">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">
              Are you sure you want to delete this document? It will be permanently removed from the
              registry, active audit data rooms, and compliance score engines.
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200/80 space-y-2 text-xs text-gray-600">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-500">License / Type:</span>
              <span className="font-bold text-gray-900 text-right truncate max-w-[220px]">
                {document.license_type?.name || "Regulatory Document"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-500">File Name:</span>
              <span className="font-medium text-gray-800 text-right truncate max-w-[220px]">
                {document.file_name}
              </span>
            </div>
            {document.status && (
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-500">Status:</span>
                <span className="font-bold text-[10px] uppercase px-2 py-0.5 bg-gray-200 text-gray-800 rounded-full">
                  {document.status}
                </span>
              </div>
            )}
            {document.sha256_hash && (
              <div className="pt-2 border-t border-gray-200">
                <span className="font-semibold text-gray-500 block mb-1">SHA-256 Hash:</span>
                <span className="font-mono text-[9px] text-gray-600 bg-white p-1.5 rounded border border-gray-200 block truncate">
                  {document.sha256_hash}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
          <button
            onClick={onClose}
            disabled={isDeleting}
            type="button"
            className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            type="button"
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-colors disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                Yes, Delete Document
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
