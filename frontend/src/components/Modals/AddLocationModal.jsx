import React, { useState } from "react";
import { X, MapPin, Store, Warehouse, Briefcase, Factory, ChevronDown } from "lucide-react";

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh",
  "Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka",
  "Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram",
  "Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana",
  "Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi (NCR)",
  "Jammu & Kashmir","Ladakh","Chandigarh","Puducherry"
];

const FACILITY_TYPES = [
  { value: "STORE",     label: "Retail Store",         icon: Store,     bg: "bg-indigo-50",  ring: "ring-indigo-400",  text: "text-indigo-600"  },
  { value: "WAREHOUSE", label: "Warehouse / Hub",       icon: Warehouse, bg: "bg-violet-50",  ring: "ring-violet-400",  text: "text-violet-600"  },
  { value: "OFFICE",    label: "Corporate Office",      icon: Briefcase, bg: "bg-sky-50",     ring: "ring-sky-400",     text: "text-sky-600"     },
  { value: "FACTORY",   label: "Factory",               icon: Factory,   bg: "bg-amber-50",   ring: "ring-amber-400",   text: "text-amber-600"   },
];

export default function AddLocationModal({ isOpen, onClose, onAdd }) {
  const [name, setName]               = useState("");
  const [code, setCode]               = useState("");
  const [type, setType]               = useState("STORE");
  const [state, setState]             = useState("Karnataka");
  const [city, setCity]               = useState("");
  const [pincode, setPincode]         = useState("");
  const [address, setAddress]         = useState("");
  const [phone, setPhone]             = useState("");
  const [managerName, setManagerName] = useState("");
  const [gstin, setGstin]             = useState("");
  const [employeeCount, setEmployeeCount] = useState("");
  const [operatingHours, setOperatingHours] = useState("9:00 AM – 9:00 PM");

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd({
      name,
      code: code.toUpperCase(),
      type,
      state,
      city,
      pincode,
      address,
      phone,
      managerName,
      gstin,
      employeeCount: employeeCount ? Number(employeeCount) : null,
      operatingHours,
      org_id: "org-1",
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Add Store / Branch</h2>
              <p className="text-xs text-gray-400 mt-0.5">Fill in the operating location details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Facility Type */}
          <div>
            <Label>Facility Type</Label>
            <div className="grid grid-cols-4 gap-2 mt-1.5">
              {FACILITY_TYPES.map(ft => {
                const Icon = ft.icon;
                const selected = type === ft.value;
                return (
                  <button
                    key={ft.value}
                    type="button"
                    onClick={() => setType(ft.value)}
                    className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 text-xs font-semibold transition-all ${
                      selected
                        ? `${ft.bg} ${ft.ring} ring-2 border-transparent ${ft.text}`
                        : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${selected ? ft.text : "text-gray-400"}`} />
                    <span className="text-[10px] text-center leading-tight">{ft.label.split(" / ")[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name + Code */}
          <div className="grid grid-cols-5 gap-3">
            <div className="col-span-3">
              <Label required>Branch / Store Name</Label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Koramangala Hypermart"
                className="mt-1.5 w-full text-sm border border-gray-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div className="col-span-2">
              <Label required>Branch Code</Label>
              <input
                type="text"
                required
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="BLR-STR-05"
                className="mt-1.5 w-full text-sm border border-gray-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none uppercase"
              />
            </div>
          </div>

          {/* State + City */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label required>State / UT</Label>
              <div className="relative mt-1.5">
                <select
                  value={state}
                  onChange={e => setState(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-xl px-3.5 py-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none appearance-none"
                >
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
            <div>
              <Label>City</Label>
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="Bengaluru"
                className="mt-1.5 w-full text-sm border border-gray-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* PIN + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>PIN Code</Label>
              <input
                type="text"
                value={pincode}
                onChange={e => setPincode(e.target.value)}
                placeholder="560034"
                maxLength={6}
                className="mt-1.5 w-full text-sm border border-gray-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <Label>Contact Phone</Label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+91 80 1234 5678"
                className="mt-1.5 w-full text-sm border border-gray-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Manager + GSTIN */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Branch Manager</Label>
              <input
                type="text"
                value={managerName}
                onChange={e => setManagerName(e.target.value)}
                placeholder="Manager full name"
                className="mt-1.5 w-full text-sm border border-gray-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <Label>Branch GSTIN</Label>
              <input
                type="text"
                value={gstin}
                onChange={e => setGstin(e.target.value.toUpperCase())}
                placeholder="29AABCA1234F1Z8"
                className="mt-1.5 w-full text-sm border border-gray-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none uppercase"
              />
            </div>
          </div>

          {/* Employee Count + Operating Hours */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Employee Count</Label>
              <input
                type="number"
                min="0"
                value={employeeCount}
                onChange={e => setEmployeeCount(e.target.value)}
                placeholder="e.g. 45"
                className="mt-1.5 w-full text-sm border border-gray-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <Label>Operating Hours</Label>
              <input
                type="text"
                value={operatingHours}
                onChange={e => setOperatingHours(e.target.value)}
                placeholder="9:00 AM – 9:00 PM"
                className="mt-1.5 w-full text-sm border border-gray-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <Label>Full Street Address</Label>
            <textarea
              rows={2}
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Door No., Street, Area, City, State – PIN"
              className="mt-1.5 w-full text-sm border border-gray-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0 bg-gray-50/60 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="px-6 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
          >
            <MapPin className="w-3.5 h-3.5" />
            Save Location
          </button>
        </div>
      </div>
    </div>
  );
}

function Label({ children, required }) {
  return (
    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">
      {children} {required && <span className="text-indigo-500">*</span>}
    </label>
  );
}
