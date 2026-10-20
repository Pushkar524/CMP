import React, { useState } from "react";
import { MapPin, X } from "lucide-react";

const FACILITY_TYPES = ["STORE", "WAREHOUSE", "OFFICE", "FACTORY"];
const STATES = ["Karnataka", "Maharashtra", "Tamil Nadu", "Telangana", "Delhi (NCR)", "Gujarat", "Other"];

export default function CompleteLocationModal({ location, onSave }) {
  const [form, setForm] = useState({
    code: location.code || "",
    type: location.type || "STORE",
    state: location.state || "Karnataka",
    address: location.address || "",
    city: location.city || "",
    pincode: location.pincode || "",
    phone: location.phone || "",
    gstin: location.gstin || "",
    employee_count: location.employee_count || "",
    operating_hours: location.operating_hours || "9:00 AM - 9:00 PM",
  });
  const [error, setError] = useState("");

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await onSave(form);
    } catch (submitError) {
      setError(submitError.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-gray-100 bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-gray-100 p-6">
          <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600"><MapPin className="h-5 w-5" /></div>
          <div className="flex-1"><h2 className="text-base font-bold text-gray-900">Complete {location.name}</h2><p className="mt-0.5 text-xs text-gray-400">Add the store details once to activate compliance tracking.</p></div>
        </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 overflow-y-auto p-6 sm:grid-cols-2">
          {error && <div className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
          <Field label="Store code" value={form.code} onChange={(value) => update("code", value.toUpperCase())} placeholder="BLR-STR-05" />
          <SelectField label="Facility type" value={form.type} options={FACILITY_TYPES} onChange={(value) => update("type", value)} />
          <SelectField label="State / UT" value={form.state} options={STATES} onChange={(value) => update("state", value)} />
          <Field label="City" value={form.city} onChange={(value) => update("city", value)} placeholder="Bengaluru" />
          <Field label="GSTIN" value={form.gstin} onChange={(value) => update("gstin", value.toUpperCase())} placeholder="29AABCA1234F1Z8" />
          <Field label="PIN code" inputMode="numeric" maxLength={6} value={form.pincode} onChange={(value) => update("pincode", value.replace(/\D/g, ""))} placeholder="560034" />
          <Field label="Contact phone" type="tel" inputMode="numeric" maxLength={15} value={form.phone} onChange={(value) => update("phone", value.replace(/\D/g, ""))} placeholder="9876543210" />
          <Field label="Employee count" type="number" value={form.employee_count} onChange={(value) => update("employee_count", value)} placeholder="45" />
          <Field label="Operating hours" value={form.operating_hours} onChange={(value) => update("operating_hours", value)} placeholder="9:00 AM - 9:00 PM" />
          <div className="sm:col-span-2"><label className="block text-xs font-bold uppercase tracking-wider text-gray-700">Full address *</label><textarea required rows={3} value={form.address} onChange={(event) => update("address", event.target.value)} className="mt-1.5 w-full resize-none rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Door number, street, area" /></div>
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4 sm:col-span-2"><button type="submit" className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700">Save Store Details</button></div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, type = "text", inputMode, maxLength, value, onChange, placeholder }) {
  return <div><label className="block text-xs font-bold uppercase tracking-wider text-gray-700">{label}</label><input type={type} inputMode={inputMode} maxLength={maxLength} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-1.5 w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>;
}

function SelectField({ label, value, options, onChange }) {
  return <div><label className="block text-xs font-bold uppercase tracking-wider text-gray-700">{label}</label><select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>;
}
