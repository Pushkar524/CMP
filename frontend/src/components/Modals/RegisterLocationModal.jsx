import React, { useState } from "react";
import { KeyRound, Store, X } from "lucide-react";

export default function RegisterLocationModal({ isOpen, onClose, onAdd }) {
  const [name, setName] = useState("");
  const [managerName, setManagerName] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [managerPassword, setManagerPassword] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await onAdd({ name, managerName, managerEmail, managerPassword });
      setName("");
      setManagerName("");
      setManagerEmail("");
      setManagerPassword("");
      onClose();
    } catch (submitError) {
      setError(submitError.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600"><Store className="h-5 w-5" /></div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Register Store</h2>
              <p className="mt-0.5 text-xs text-gray-400">The manager will complete the store profile after signing in.</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
          <Field label="Store name" required value={name} onChange={setName} placeholder="e.g. Koramangala Hypermart" />
          <Field label="Manager name" required value={managerName} onChange={setManagerName} placeholder="Full name" />
          <Field label="Manager email" required type="email" value={managerEmail} onChange={setManagerEmail} placeholder="manager@example.com" />
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">Manager security key</label>
            <div className="relative mt-1.5">
              <KeyRound className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input required minLength={8} type="password" value={managerPassword} onChange={(event) => setManagerPassword(event.target.value)} placeholder="At least 8 characters" className="w-full rounded-xl border border-gray-300 py-2.5 pl-9 pr-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600">Cancel</button>
            <button type="submit" className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700">Register Store</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, type = "text", value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">{label}{required && " *"}</label>
      <input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-1.5 w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
    </div>
  );
}
