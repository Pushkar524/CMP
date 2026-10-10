import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Shield, Building2, User, Mail, Lock, Phone, MapPin,
  Plus, Trash2, ArrowRight, ArrowLeft, CheckCircle2,
  Store, Warehouse, Briefcase, Factory, ChevronDown,
  Hash, FileText, Globe, Users, Clock
} from "lucide-react";

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh",
  "Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka",
  "Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram",
  "Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana",
  "Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi (NCR)",
  "Jammu & Kashmir","Ladakh","Chandigarh","Puducherry"
];

const FACILITY_TYPES = [
  { value: "STORE",     label: "Retail Store",           icon: Store,     color: "indigo"  },
  { value: "WAREHOUSE", label: "Warehouse / Hub",         icon: Warehouse, color: "violet"  },
  { value: "OFFICE",    label: "Corporate Office",        icon: Briefcase, color: "sky"     },
  { value: "FACTORY",   label: "Manufacturing Factory",   icon: Factory,   color: "amber"   },
];

const emptyBranch = () => ({
  id: crypto.randomUUID(),
  name: "",
  code: "",
  type: "STORE",
  state: "Karnataka",
  address: "",
  city: "",
  pincode: "",
  phone: "",
  managerName: "",
  gstin: "",
  employeeCount: "",
  operatingHours: "9:00 AM – 9:00 PM",
});

const STEPS = ["Organization", "Admin Account", "Stores & Branches", "Review"];

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Step 1 — Org
  const [org, setOrg] = useState({
    name: "", taxId: "", industry: "Retail", website: "", phone: "", address: ""
  });

  // Step 2 — Admin
  const [admin, setAdmin] = useState({
    name: "", email: "", password: "", confirm: ""
  });

  // Step 3 — Branches
  const [branches, setBranches] = useState([emptyBranch()]);

  // ── Helpers ──────────────────────────────────────────────
  const updateOrg = (k, v) => setOrg(o => ({ ...o, [k]: v }));
  const updateAdmin = (k, v) => setAdmin(a => ({ ...a, [k]: v }));
  const updateBranch = (id, k, v) =>
    setBranches(bs => bs.map(b => b.id === id ? { ...b, [k]: v } : b));
  const addBranch = () => setBranches(bs => [...bs, emptyBranch()]);
  const removeBranch = (id) => setBranches(bs => bs.filter(b => b.id !== id));

  const canNext = () => {
    if (step === 0) return org.name && org.taxId;
    if (step === 1) return admin.name && admin.email && admin.password.length >= 8 && admin.password === admin.confirm;
    if (step === 2) return branches.every(b => b.name && b.code && b.state);
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1800)); // Simulate API call
    setSubmitting(false);
    setDone(true);
    setTimeout(() => navigate("/login"), 2500);
  };

  // ── Done screen ───────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-5 animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto ring-4 ring-emerald-500/30">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-black text-white">Organization Registered!</h2>
          <p className="text-slate-400 text-sm">Redirecting you to sign in…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Top Bar */}
      <div className="border-b border-slate-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/40">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-black text-sm tracking-tight">SCLIP Compliance Cloud</span>
        </div>
        <Link to="/login" className="text-xs text-slate-400 hover:text-white transition-colors">
          Already registered? <span className="text-indigo-400 font-semibold">Sign in →</span>
        </Link>
      </div>

      <div className="flex-1 flex flex-col items-center justify-start py-10 px-4">
        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white tracking-tight">Register Your Organization</h1>
          <p className="text-slate-400 text-sm mt-2">Set up your compliance workspace in minutes</p>
        </div>

        {/* Step Progress */}
        <div className="flex items-center gap-0 mb-10">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <button
                onClick={() => i < step && setStep(i)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                  i === step
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                    : i < step
                    ? "bg-emerald-600/20 text-emerald-400 cursor-pointer hover:bg-emerald-600/30"
                    : "bg-slate-800/60 text-slate-500 cursor-default"
                }`}
              >
                {i < step ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="w-4 h-4 text-center leading-none">{i + 1}</span>}
                {s}
              </button>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-0.5 mx-1 ${i < step ? "bg-emerald-600/50" : "bg-slate-800"}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Card */}
        <div className="w-full max-w-2xl">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">

            {/* ── STEP 0: Organization Details ───────────────────── */}
            {step === 0 && (
              <div className="p-8 space-y-5">
                <SectionHeader icon={Building2} title="Organization Details" subtitle="Your registered business information" />

                <Field label="Legal Organization Name" required>
                  <Input
                    id="org-name"
                    placeholder="e.g. Apex Retail Group India Ltd."
                    value={org.name}
                    onChange={v => updateOrg("name", v)}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="GSTIN / Tax ID" required>
                    <Input
                      id="org-tax-id"
                      placeholder="29AABCA1234F1Z8"
                      value={org.taxId}
                      onChange={v => updateOrg("taxId", v)}
                    />
                  </Field>
                  <Field label="Industry Sector">
                    <Select
                      id="org-industry"
                      value={org.industry}
                      onChange={v => updateOrg("industry", v)}
                      options={["Retail","FMCG","Pharma","Manufacturing","Hospitality","Logistics","Healthcare","Technology","Finance","Other"]}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Business Phone">
                    <Input id="org-phone" placeholder="+91 98765 43210" value={org.phone} onChange={v => updateOrg("phone", v)} icon={Phone} />
                  </Field>
                  <Field label="Website">
                    <Input id="org-website" placeholder="https://yourcompany.com" value={org.website} onChange={v => updateOrg("website", v)} icon={Globe} />
                  </Field>
                </div>

                <Field label="Registered Office Address">
                  <textarea
                    id="org-address"
                    rows={2}
                    value={org.address}
                    onChange={e => updateOrg("address", e.target.value)}
                    placeholder="Full corporate address..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                  />
                </Field>
              </div>
            )}

            {/* ── STEP 1: Admin Account ──────────────────────────── */}
            {step === 1 && (
              <div className="p-8 space-y-5">
                <SectionHeader icon={User} title="Admin Account" subtitle="This person will be the Organization Owner" />

                <Field label="Full Name" required>
                  <Input id="admin-name" placeholder="e.g. Anantha Krishna" value={admin.name} onChange={v => updateAdmin("name", v)} icon={User} />
                </Field>

                <Field label="Work Email Address" required>
                  <Input id="admin-email" type="email" placeholder="admin@yourcompany.com" value={admin.email} onChange={v => updateAdmin("email", v)} icon={Mail} />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Password" required hint="Min. 8 characters">
                    <Input id="admin-password" type="password" placeholder="••••••••" value={admin.password} onChange={v => updateAdmin("password", v)} icon={Lock} />
                  </Field>
                  <Field label="Confirm Password" required>
                    <Input id="admin-confirm" type="password" placeholder="••••••••" value={admin.confirm} onChange={v => updateAdmin("confirm", v)} icon={Lock}
                      error={admin.confirm && admin.password !== admin.confirm ? "Passwords do not match" : ""}
                    />
                  </Field>
                </div>

                <div className="bg-indigo-950/40 border border-indigo-800/50 rounded-xl p-4 text-xs text-indigo-300 leading-relaxed">
                  <strong className="text-indigo-200 block mb-1">🔐 Admin Privileges</strong>
                  As Organization Owner, you can manage all locations, invite team members, upload compliance documents, and generate audit links.
                </div>
              </div>
            )}

            {/* ── STEP 2: Stores & Branches ─────────────────────── */}
            {step === 2 && (
              <div className="p-8 space-y-6">
                <div className="flex items-start justify-between">
                  <SectionHeader icon={Store} title="Stores & Branches" subtitle={`Add your operating locations (${branches.length} added)`} />
                  <button
                    type="button"
                    onClick={addBranch}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Branch
                  </button>
                </div>

                <div className="space-y-5 max-h-[520px] overflow-y-auto pr-1 custom-scroll">
                  {branches.map((branch, idx) => (
                    <BranchCard
                      key={branch.id}
                      branch={branch}
                      index={idx}
                      canRemove={branches.length > 1}
                      onChange={(k, v) => updateBranch(branch.id, k, v)}
                      onRemove={() => removeBranch(branch.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── STEP 3: Review ────────────────────────────────── */}
            {step === 3 && (
              <div className="p-8 space-y-6">
                <SectionHeader icon={CheckCircle2} title="Review & Confirm" subtitle="Everything looks good? Submit to activate your workspace." />

                <ReviewSection title="Organization">
                  <ReviewRow label="Name" value={org.name} />
                  <ReviewRow label="GSTIN / Tax ID" value={org.taxId} />
                  <ReviewRow label="Industry" value={org.industry} />
                  {org.phone && <ReviewRow label="Phone" value={org.phone} />}
                  {org.website && <ReviewRow label="Website" value={org.website} />}
                </ReviewSection>

                <ReviewSection title="Admin Account">
                  <ReviewRow label="Name" value={admin.name} />
                  <ReviewRow label="Email" value={admin.email} />
                  <ReviewRow label="Role" value="Organization Owner (ORG_ADMIN)" />
                </ReviewSection>

                <ReviewSection title={`Locations (${branches.length})`}>
                  {branches.map((b, i) => (
                    <div key={b.id} className="py-2.5 border-b border-slate-800 last:border-0">
                      <div className="text-slate-200 text-xs font-bold mb-1">{i + 1}. {b.name || `Branch ${i + 1}`}</div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                        <span>Code: <span className="text-slate-300">{b.code || "—"}</span></span>
                        <span>Type: <span className="text-slate-300">{b.type}</span></span>
                        <span>State: <span className="text-slate-300">{b.state}</span></span>
                        {b.city && <span>City: <span className="text-slate-300">{b.city}</span></span>}
                        {b.gstin && <span>GSTIN: <span className="text-slate-300">{b.gstin}</span></span>}
                      </div>
                    </div>
                  ))}
                </ReviewSection>
              </div>
            )}

            {/* Footer Nav */}
            <div className="px-8 pb-8 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(s => s - 1)}
                disabled={step === 0}
                className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>

              {step < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(s => s + 1)}
                  disabled={!canNext()}
                  className="flex items-center gap-1.5 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/30"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex items-center gap-2 px-8 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/30"
                >
                  {submitting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      Creating Workspace…
                    </>
                  ) : (
                    <><CheckCircle2 className="w-4 h-4" /> Activate Workspace</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── BranchCard ────────────────────────────────────────────────
function BranchCard({ branch, index, canRemove, onChange, onRemove }) {
  const [expanded, setExpanded] = useState(index === 0);
  const typeInfo = FACILITY_TYPES.find(f => f.value === branch.type) || FACILITY_TYPES[0];
  const Icon = typeInfo.icon;

  const colorMap = {
    indigo: "bg-indigo-600/20 text-indigo-400 border-indigo-600/30",
    violet: "bg-violet-600/20 text-violet-400 border-violet-600/30",
    sky:    "bg-sky-600/20 text-sky-400 border-sky-600/30",
    amber:  "bg-amber-600/20 text-amber-400 border-amber-600/30",
  };

  return (
    <div className="border border-slate-700/80 rounded-2xl overflow-hidden bg-slate-800/40">
      {/* Branch Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-800/60 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl border ${colorMap[typeInfo.color]}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">
              {branch.name || <span className="text-slate-500">Branch {index + 1} — Untitled</span>}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {typeInfo.label} {branch.code && `• ${branch.code.toUpperCase()}`} {branch.state && `• ${branch.state}`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canRemove && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onRemove(); }}
              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>
      </div>

      {/* Branch Form */}
      {expanded && (
        <div className="px-4 pb-5 pt-1 space-y-4 border-t border-slate-700/60">

          {/* Facility Type Selector */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Facility Type</label>
            <div className="grid grid-cols-4 gap-2">
              {FACILITY_TYPES.map(ft => {
                const FIcon = ft.icon;
                const selected = branch.type === ft.value;
                return (
                  <button
                    key={ft.value}
                    type="button"
                    onClick={() => onChange("type", ft.value)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition-all ${
                      selected
                        ? `border-${ft.color}-500/60 bg-${ft.color}-600/20 text-${ft.color}-300`
                        : "border-slate-700 bg-slate-800/40 text-slate-500 hover:border-slate-600"
                    }`}
                  >
                    <FIcon className="w-4 h-4" />
                    <span className="text-[10px] text-center leading-tight">{ft.label.split(" / ")[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <BField label="Branch / Store Name" required>
              <BInput id={`branch-name-${index}`} placeholder="e.g. Koramangala Hypermart" value={branch.name} onChange={v => onChange("name", v)} />
            </BField>
            <BField label="Branch Code" required>
              <BInput id={`branch-code-${index}`} placeholder="BLR-STR-05" value={branch.code} onChange={v => onChange("code", v.toUpperCase())} />
            </BField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <BField label="State / UT" required>
              <BSelect id={`branch-state-${index}`} value={branch.state} onChange={v => onChange("state", v)} options={INDIAN_STATES} />
            </BField>
            <BField label="City">
              <BInput id={`branch-city-${index}`} placeholder="Bengaluru" value={branch.city} onChange={v => onChange("city", v)} />
            </BField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <BField label="PIN Code">
              <BInput id={`branch-pin-${index}`} placeholder="560034" value={branch.pincode} onChange={v => onChange("pincode", v)} />
            </BField>
            <BField label="Contact Phone">
              <BInput id={`branch-phone-${index}`} placeholder="+91 80 1234 5678" value={branch.phone} onChange={v => onChange("phone", v)} />
            </BField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <BField label="Branch Manager Name">
              <BInput id={`branch-mgr-${index}`} placeholder="Manager full name" value={branch.managerName} onChange={v => onChange("managerName", v)} />
            </BField>
            <BField label="Branch GSTIN">
              <BInput id={`branch-gstin-${index}`} placeholder="29AABCA1234F1Z8" value={branch.gstin} onChange={v => onChange("gstin", v)} />
            </BField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <BField label="Employee Count">
              <BInput id={`branch-emp-${index}`} placeholder="e.g. 45" type="number" value={branch.employeeCount} onChange={v => onChange("employeeCount", v)} />
            </BField>
            <BField label="Operating Hours">
              <BInput id={`branch-hours-${index}`} placeholder="9:00 AM – 9:00 PM" value={branch.operatingHours} onChange={v => onChange("operatingHours", v)} />
            </BField>
          </div>

          <BField label="Full Street Address">
            <textarea
              id={`branch-addr-${index}`}
              rows={2}
              value={branch.address}
              onChange={e => onChange("address", e.target.value)}
              placeholder="Door No., Street, Area, City, State – PIN"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
            />
          </BField>
        </div>
      )}
    </div>
  );
}

// ── Shared UI Primitives ──────────────────────────────────────
function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-3 pb-2">
      <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-600/30">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h2 className="text-lg font-black text-white">{title}</h2>
        <p className="text-xs text-slate-400">{subtitle}</p>
      </div>
    </div>
  );
}

function Field({ label, children, required, hint }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
        {label} {required && <span className="text-indigo-400">*</span>}
        {hint && <span className="normal-case text-slate-500 ml-1">({hint})</span>}
      </label>
      {children}
    </div>
  );
}

function BField({ label, children, required }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
        {label} {required && <span className="text-indigo-400">*</span>}
      </label>
      {children}
    </div>
  );
}

function Input({ id, value, onChange, placeholder, type = "text", icon: Icon, error }) {
  return (
    <div className="relative">
      {Icon && <Icon className="w-3.5 h-3.5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />}
      <input
        id={id}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-slate-800 border rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all ${
          error ? "border-red-500/60" : "border-slate-700 hover:border-slate-600"
        } ${Icon ? "pl-9" : ""}`}
      />
      {error && <p className="mt-1 text-[10px] text-red-400">{error}</p>}
    </div>
  );
}

function Select({ id, value, onChange, options }) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl px-3.5 py-2.5 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none appearance-none"
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );
}

function BInput({ id, value, onChange, placeholder, type = "text" }) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
    />
  );
}

function BSelect({ id, value, onChange, options }) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-lg px-3 py-2 text-xs text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none appearance-none"
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );
}

function ReviewSection({ title, children }) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-5">
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-800 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-xs font-semibold text-slate-200">{value || "—"}</span>
    </div>
  );
}
