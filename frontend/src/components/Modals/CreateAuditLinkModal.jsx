import React, { useState } from "react";
import { X, Link2, ShieldAlert, KeyRound, Clock, CheckSquare, Square } from "lucide-react";

export default function CreateAuditLinkModal({ isOpen, onClose, onCreate, documents = [] }) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [pin, setPin] = useState("");
  const [hasPin, setHasPin] = useState(false);
  const [validityDays, setValidityDays] = useState(7);
  const [selectedDocs, setSelectedDocs] = useState([]);

  if (!isOpen) return null;

  const toggleDoc = (id) => {
    if (selectedDocs.includes(id)) {
      setSelectedDocs(selectedDocs.filter(d => d !== id));
    } else {
      setSelectedDocs([...selectedDocs, id]);
    }
  };

  const selectAll = () => {
    if (selectedDocs.length === documents.length) {
      setSelectedDocs([]);
    } else {
      setSelectedDocs(documents.map(d => d.id));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedDocs.length === 0) {
      alert("Please select at least one document to include in this audit data room.");
      return;
    }

    const expiresAt = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toISOString();

    onCreate({
      title: title || "External Regulatory Audit Link",
      notes: notes || "Scoped inspector clearance package",
      pin_hash: hasPin && pin ? pin : null,
      expires_at: expiresAt,
      document_ids: selectedDocs
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Create Secure Audit Data Room</h2>
              <p className="text-xs text-gray-500">Scoped, time-bound inspector access</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Audit Data Room Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. BBMP Annual Fire & Trade License Audit"
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Internal Reference Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Generated for Inspector V. Sharma"
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Link Expiry Window
              </label>
              <select
                value={validityDays}
                onChange={(e) => setValidityDays(Number(e.target.value))}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value={1}>24 Hours</option>
                <option value={3}>3 Days</option>
                <option value={7}>7 Days (Recommended)</option>
                <option value={14}>14 Days</option>
                <option value={30}>30 Days</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  PIN Protection
                </label>
                <label className="flex items-center gap-1 text-[11px] text-indigo-600 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasPin}
                    onChange={(e) => setHasPin(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  Require PIN
                </label>
              </div>
              <input
                type="text"
                disabled={!hasPin}
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder={hasPin ? "Enter 4-6 digit PIN" : "No PIN required"}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden disabled:bg-gray-100 disabled:text-gray-400"
                required={hasPin}
              />
            </div>
          </div>

          {/* Select Documents */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Expose Specific Documents ({selectedDocs.length}/{documents.length})
              </label>
              <button
                type="button"
                onClick={selectAll}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold"
              >
                {selectedDocs.length === documents.length ? "Deselect All" : "Select All"}
              </button>
            </div>
            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100 bg-gray-50/50 p-1">
              {documents.map((doc) => {
                const isSelected = selectedDocs.includes(doc.id);
                return (
                  <div
                    key={doc.id}
                    onClick={() => toggleDoc(doc.id)}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs ${
                      isSelected ? "bg-indigo-50/80 text-indigo-950 font-semibold" : "hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400 shrink-0" />
                      )}
                      <span className="truncate">{doc.license_name} ({doc.file_name})</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-gray-500 ml-2 shrink-0">
                      {doc.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Link2 className="w-4 h-4" />
              Generate Audit Room Link
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
