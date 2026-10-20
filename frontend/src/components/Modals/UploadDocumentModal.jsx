import React, { useState, useEffect } from "react";
import { X, UploadCloud, Shield, Check, FileText, Loader2, Clock, Calendar, FilePlus } from "lucide-react";
import { computeSHA256 } from "../../services/api";

export default function UploadDocumentModal({ isOpen, onClose, onUpload, locations = [], licenseTypes = [] }) {
  const todayStr = new Date().toISOString().split("T")[0];
  const currentYear = new Date().getFullYear();
  const minIssueYear = currentYear - 60; // 50 to 60 years ago (e.g. 1966)
  const maxIssueYear = currentYear + 10;
  const maxExpiryYear = currentYear + 60; // 50 to 60 years ahead (e.g. 2086)

  const minIssueDate = `${minIssueYear}-01-01`;
  const maxIssueDate = `${maxIssueYear}-12-31`;

  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [licenseTypeId, setLicenseTypeId] = useState(licenseTypes[0]?.id || "");
  const [locationId, setLocationId] = useState("");
  const [isOrgWide, setIsOrgWide] = useState(false);
  const [issueDate, setIssueDate] = useState(todayStr);
  const [expiryDate, setExpiryDate] = useState("");
  const [validityYears, setValidityYears] = useState("1");
  const [validityMonths, setValidityMonths] = useState("0");
  const [isLifetimeValid, setIsLifetimeValid] = useState(false);
  const [shaHash, setShaHash] = useState("");
  const [isHashing, setIsHashing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [customDocName, setCustomDocName] = useState("");
  const [customAuthority, setCustomAuthority] = useState("");
  const [error, setError] = useState("");

  const minExpiryDate = issueDate || minIssueDate;
  const maxExpiryDate = `${maxExpiryYear}-12-31`;

  const yearOptions = Array.from({ length: 61 }, (_, i) => i); // 0 to 60 years
  const monthOptions = Array.from({ length: 12 }, (_, i) => i); // 0 to 11 months

  // Calculate expiry date string given a base issue date and a number of months
  const addMonthsToDate = (startStr, months) => {
    if (!startStr || !months) return "";
    const numMonths = Number(months);
    if (isNaN(numMonths) || numMonths <= 0) return "";
    const parts = startStr.split("-").map(Number);
    if (parts.length !== 3) return "";
    const [y, m, d] = parts;
    const targetDate = new Date(y, m - 1 + numMonths, d);
    const resY = targetDate.getFullYear();
    const resM = String(targetDate.getMonth() + 1).padStart(2, "0");
    const resD = String(targetDate.getDate()).padStart(2, "0");
    return `${resY}-${resM}-${resD}`;
  };

  // Sync default validity or lifetime flag whenever license type changes
  useEffect(() => {
    if (licenseTypeId && licenseTypeId !== "__other__" && licenseTypes.length > 0) {
      const selected = licenseTypes.find((t) => t.id === licenseTypeId);
      if (selected?.is_lifetime_valid) {
        setIsLifetimeValid(true);
        setExpiryDate("");
        setValidityYears("0");
        setValidityMonths("0");
      } else if (selected?.default_validity_months) {
        const defMonths = selected.default_validity_months;
        const base = issueDate || todayStr;
        if (!issueDate) setIssueDate(base);
        const y = Math.floor(defMonths / 12);
        const m = defMonths % 12;
        setValidityYears(String(y));
        setValidityMonths(String(m));
        const calculated = addMonthsToDate(base, defMonths);
        if (calculated) setExpiryDate(calculated);
      } else {
        setIsLifetimeValid(false);
      }
    }
  }, [licenseTypeId]);

  const handleIssueDateChange = (newIssueDate) => {
    setIssueDate(newIssueDate);
    if (newIssueDate && !isLifetimeValid) {
      const totalMonths = (Number(validityYears) || 0) * 12 + (Number(validityMonths) || 0);
      if (totalMonths > 0) {
        const calculated = addMonthsToDate(newIssueDate, totalMonths);
        if (calculated) setExpiryDate(calculated);
      }
    }
  };

  const handleDurationChange = (newYears, newMonths) => {
    const y = Number(newYears) || 0;
    const m = Number(newMonths) || 0;
    setValidityYears(String(y));
    setValidityMonths(String(m));
    const totalMonths = (y * 12) + m;
    const baseIssue = issueDate || todayStr;
    if (!issueDate) setIssueDate(baseIssue);
    if (totalMonths > 0) {
      const calculated = addMonthsToDate(baseIssue, totalMonths);
      if (calculated) setExpiryDate(calculated);
    }
  };

  const handleExpiryDateChange = (newExpiryDate) => {
    setExpiryDate(newExpiryDate);
    if (issueDate && newExpiryDate) {
      const start = new Date(issueDate);
      const end = new Date(newExpiryDate);
      const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        const totalMonths = Math.round(diffDays / 30.4375);
        const y = Math.floor(totalMonths / 12);
        const m = totalMonths % 12;
        setValidityYears(String(y));
        setValidityMonths(String(m));
      }
    }
  };

  const getValiditySummary = () => {
    if (isLifetimeValid) {
      return { text: "Permanent registration (No expiration required)", color: "text-emerald-700 bg-emerald-50 border border-emerald-200" };
    }
    if (!issueDate || !expiryDate) return null;
    const start = new Date(issueDate);
    const end = new Date(expiryDate);
    const now = new Date();
    if (end < start) {
      return { text: "Expiry date cannot be before issue date", color: "text-red-700 bg-red-50 border border-red-200", isError: true };
    }
    const totalDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
    const totalMonths = Math.max(1, Math.round(totalDays / 30.4375));
    const totalYears = +(totalDays / 365.25).toFixed(1);

    let durationLabel = "";
    if (totalMonths < 12) {
      durationLabel = `${totalMonths} ${totalMonths === 1 ? 'Month' : 'Months'}`;
    } else if (totalMonths % 12 === 0) {
      const y = totalMonths / 12;
      durationLabel = `${y} ${y === 1 ? 'Year' : 'Years'}`;
    } else {
      durationLabel = `${totalYears} Years (${totalMonths} Months)`;
    }

    const remainingDays = Math.round((end - now) / (1000 * 60 * 60 * 24));
    let remainingLabel = "";
    if (remainingDays < 0) {
      remainingLabel = `Expired ${Math.abs(remainingDays)} days ago`;
    } else if (remainingDays === 0) {
      remainingLabel = "Expires today";
    } else if (remainingDays <= 30) {
      remainingLabel = `Expires in ${remainingDays} days`;
    } else if (remainingDays < 365) {
      const remMos = Math.max(1, Math.round(remainingDays / 30.4375));
      remainingLabel = `~${remMos} ${remMos === 1 ? 'month' : 'months'} remaining till expiry`;
    } else {
      const remYears = +(remainingDays / 365.25).toFixed(1);
      remainingLabel = `~${remYears} years remaining till expiry`;
    }

    return {
      text: `Validity: ${durationLabel} (${remainingLabel})`,
      color: remainingDays < 0 ? "text-amber-800 bg-amber-50 border border-amber-200" : "text-indigo-800 bg-indigo-50 border border-indigo-200",
    };
  };

  const validitySummary = getValiditySummary();

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsUploading(true);

    if (licenseTypeId === "__other__") {
      if (!customDocName.trim()) {
        setError("Please enter the document or license name for your custom document.");
        setIsUploading(false);
        return;
      }
    }

    const lt = licenseTypes.find(t => t.id === licenseTypeId);

    if (issueDate) {
      const issueYear = parseInt(issueDate.split("-")[0], 10);
      if (isNaN(issueYear) || issueYear < minIssueYear || issueYear > maxIssueYear) {
        setError(`Please enter a valid issue date (year must be between ${minIssueYear} and ${maxIssueYear}).`);
        setIsUploading(false);
        return;
      }
    }

    if (!isLifetimeValid) {
      if (!expiryDate) {
        setError("Please specify an expiry date or check 'Lifetime'.");
        setIsUploading(false);
        return;
      }
      const expiryYear = parseInt(expiryDate.split("-")[0], 10);
      if (isNaN(expiryYear) || expiryYear < minIssueYear || expiryYear > maxExpiryYear) {
        setError(`Expiry date year must be between ${minIssueYear} and ${maxExpiryYear}.`);
        setIsUploading(false);
        return;
      }
      if (issueDate && expiryDate < issueDate) {
        setError("Expiry date cannot be earlier than the issue date.");
        setIsUploading(false);
        return;
      }
    }

    try {
      const isOther = licenseTypeId === "__other__";
      await onUpload({
        license_type_id: isOther ? "__other__" : licenseTypeId,
        custom_license_name: isOther ? customDocName.trim() : "",
        custom_issuing_authority: isOther ? customAuthority.trim() : "",
        license_code: isOther ? "CUSTOM" : (lt?.code || "CUSTOM"),
        license_name: isOther ? customDocName.trim() : (lt?.name || "Regulatory License"),
        location_id: isOrgWide ? null : locationId,
        file_name: fileName || "document.pdf",
        issue_date: issueDate || todayStr,
        expiry_date: isLifetimeValid ? null : expiryDate,
        is_lifetime_valid: isLifetimeValid
      }, file);
      setCustomDocName("");
      setCustomAuthority("");
      onClose();
    } catch (uploadError) {
      setError(uploadError.message || "Document upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
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
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}
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
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                License / Clearance Type
              </label>
              {licenseTypeId === "__other__" && (
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md">
                  Custom Mode
                </span>
              )}
            </div>
            <select
              value={licenseTypeId}
              onChange={(e) => {
                const val = e.target.value;
                setLicenseTypeId(val);
                if (val !== "__other__") {
                  const selected = licenseTypes.find(t => t.id === val);
                  if (selected?.is_lifetime_valid) setIsLifetimeValid(true);
                  else setIsLifetimeValid(false);
                }
              }}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              required
            >
              <optgroup label="Standard Regulatory & Statutory Documents">
                {licenseTypes.map((lt) => (
                  <option key={lt.id} value={lt.id}>
                    {lt.name} {lt.issuing_authority ? `(${lt.issuing_authority})` : ""}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Custom / Other Documents">
                <option value="__other__">➕ Other (Enter Custom Document Name...)</option>
              </optgroup>
            </select>
          </div>

          {/* Custom Document Details (shown when "Other" is selected) */}
          {licenseTypeId === "__other__" && (
            <div className="bg-amber-50/70 border border-amber-200/90 rounded-xl p-3.5 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-950 uppercase tracking-wider">
                <FilePlus className="w-4 h-4 text-amber-600" />
                <span>Specify Custom Document</span>
              </div>
              <div className="space-y-2.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Document / License Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customDocName}
                    onChange={(e) => setCustomDocName(e.target.value)}
                    placeholder="e.g. ISO 9001 Quality Certificate, Factory Lease Deed, Health NOC"
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden placeholder:text-gray-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Issuing Authority / Agency <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={customAuthority}
                    onChange={(e) => setCustomAuthority(e.target.value)}
                    placeholder="e.g. Bureau Veritas, Municipal Ward Office, Internal Auditor"
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden placeholder:text-gray-400"
                  />
                </div>
              </div>
              <p className="text-[11px] text-amber-800/90 leading-snug">
                💡 This custom document will be cataloged and tracked with SHA-256 integrity verification.
              </p>
            </div>
          )}

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
          <div className="bg-slate-50/70 border border-gray-200/90 rounded-xl p-3.5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Issue Date
                </label>
                <input
                  type="date"
                  value={issueDate}
                  min={minIssueDate}
                  max={maxIssueDate}
                  onChange={(e) => handleIssueDateChange(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Valid Range: {minIssueYear} – {maxIssueYear}
                </span>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Expiry Date
                  </label>
                  <label className="flex items-center gap-1 text-[11px] text-gray-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isLifetimeValid}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setIsLifetimeValid(checked);
                        if (checked) {
                          setExpiryDate("");
                          setValidityYears("0");
                          setValidityMonths("0");
                        }
                      }}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    Lifetime
                  </label>
                </div>
                <input
                  type="date"
                  disabled={isLifetimeValid}
                  value={isLifetimeValid ? "" : expiryDate}
                  min={minExpiryDate}
                  max={maxExpiryDate}
                  onChange={(e) => handleExpiryDateChange(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden disabled:bg-gray-100 disabled:text-gray-400"
                  required={!isLifetimeValid}
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  {isLifetimeValid ? "No expiry needed (Permanent)" : `Valid Range: ${issueDate || minIssueDate} – ${maxExpiryYear}`}
                </span>
              </div>
            </div>

            {/* Validity Duration: 2 Lists for Years and Months */}
            {!isLifetimeValid && (
              <div className="pt-2 border-t border-gray-200/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-gray-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    Validity Period (Select Years & Months):
                  </span>
                  <span className="text-[10px] text-gray-400">
                    Auto-calculates expiry date
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Years List */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                      Years
                    </label>
                    <select
                      value={validityYears}
                      onChange={(e) => handleDurationChange(e.target.value, validityMonths)}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium text-gray-800"
                    >
                      {yearOptions.map((y) => (
                        <option key={y} value={y}>
                          {y === 0 ? "0 Years" : y === 1 ? "1 Year" : `${y} Years`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Months List */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                      Months
                    </label>
                    <select
                      value={validityMonths}
                      onChange={(e) => handleDurationChange(validityYears, e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium text-gray-800"
                    >
                      {monthOptions.map((m) => (
                        <option key={m} value={m}>
                          {m === 0 ? "0 Months" : m === 1 ? "1 Month" : `${m} Months`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Live Validity Summary badge */}
                {validitySummary && (
                  <div className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between ${validitySummary.color}`}>
                    <span>{validitySummary.text}</span>
                    <span className="text-[10px] opacity-80">Auto-synced</span>
                  </div>
                )}
              </div>
            )}
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
              disabled={isHashing || isUploading}
              className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Uploading Certificate...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload & Hash Certificate</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
