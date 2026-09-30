import React, { useState } from "react";
import { X, UploadCloud, Shield, Check, FileText } from "lucide-react";
import { computeSHA256 } from "../../services/api";

export default function UploadDocumentModal({ isOpen, onClose, onUpload, locations = [], licenseTypes = [] }) {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [licenseTypeId, setLicenseTypeId] = useState(licenseTypes[0]?.id || "");
  const [locationId, setLocationId] = useState("");
  const [isOrgWide, setIsOrgWide] = useState(false);
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [isLifetimeValid, setIsLifetimeValid] = useState(false);
  const [shaHash, setShaHash] = useState("");
  const [isHashing, setIsHashing] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = async (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setFileName(selected.name);
      setIsHashing(true);
      try {
        const buffer = await selected.arrayBuffer();
        const hash = await computeSHA256(buffer);
        setShaHash(hash);
      } catch (err) {
        console.error("Hash calculation failed", err);
      } finally {
        setIsHashing(false);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const lt = licenseTypes.find(t => t.id === licenseTypeId);
    onUpload({
      license_type_id: licenseTypeId,
      license_code: lt?.code || "CUSTOM",
      license_name: lt?.name || "Regulatory License",
      location_id: isOrgWide ? null : locationId,
      file_name: fileName || "document.pdf",
      issue_date: issueDate || new Date().toISOString().split("T")[0],
      expiry_date: isLifetimeValid ? null : expiryDate,
      is_lifetime_valid: isLifetimeValid
    }, file);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Upload Regulatory Document</h2>
              <p className="text-xs text-gray-500">SHA-256 fingerprint generated upon upload</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* File Picker */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Select Document (PDF, JPEG, PNG)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-indigo-400 hover:bg-indigo-50/20 transition-all cursor-pointer relative">
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.png,.jpg,.jpeg"
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <FileText className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
              {fileName ? (
                <div className="text-sm font-semibold text-gray-900">{fileName}</div>
              ) : (
                <div className="text-sm text-gray-500">
                  <span className="font-semibold text-indigo-600">Click to upload</span> or drag and drop
                </div>
              )}
            </div>
          </div>

          {/* Live SHA-256 Fingerprint */}
          {shaHash && (
            <div className="p-3 bg-slate-900 text-emerald-400 rounded-lg text-[11px] font-mono break-all flex items-start gap-2">
              <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-gray-400 block font-sans font-bold text-[10px] uppercase">
                  SHA-256 Integrity Fingerprint:
                </span>
                {shaHash}
              </div>
            </div>
          )}

          {/* License Type */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              License / Clearance Type
            </label>
            <select
              value={licenseTypeId}
              onChange={(e) => {
                setLicenseTypeId(e.target.value);
                const selected = licenseTypes.find(t => t.id === e.target.value);
                if (selected?.is_lifetime_valid) setIsLifetimeValid(true);
              }}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              required
            >
              {licenseTypes.map((lt) => (
                <option key={lt.id} value={lt.id}>
                  {lt.name} ({lt.issuing_authority})
                </option>
              ))}
            </select>
          </div>

          {/* Scope: Org Wide or Location Specific */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Jurisdiction / Scope
              </label>
              <label className="flex items-center gap-1.5 text-xs text-indigo-600 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={isOrgWide}
                  onChange={(e) => setIsOrgWide(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                Organization-Wide (e.g. DGFT, GST)
              </label>
            </div>
            {!isOrgWide && (
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                required={!isOrgWide}
              >
                <option value="">Select Location / Facility</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.code} - {loc.state})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Validity & Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Issue Date
              </label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Expiry Date
                </label>
                <label className="flex items-center gap-1 text-[11px] text-gray-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isLifetimeValid}
                    onChange={(e) => setIsLifetimeValid(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  Lifetime
                </label>
              </div>
              <input
                type="date"
                disabled={isLifetimeValid}
                value={isLifetimeValid ? "" : expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden disabled:bg-gray-100 disabled:text-gray-400"
                required={!isLifetimeValid}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isHashing}
              className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <UploadCloud className="w-4 h-4" />
              Upload & Hash Certificate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
