import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Shield,
  Building2,
  ArrowRight,
  Loader2,
  WifiOff,
  AlertCircle,
  MapPin,
  FileCheck,
  Lock,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const DEMO_PERSONAS = [
  {
    name: "Pushkar Raj Purohit",
    email: "admin@acmeretail.com",
    role: "ORG_ADMIN",
    badge: "Org Admin",
    description: "Multi-location administrator with full compliance & settings access",
  },
  {
    name: "Pavan Kumar",
    email: "manager.blr@acmeretail.com",
    role: "LOCATION_MANAGER",
    badge: "BLR Store Manager",
    description: "Scoped to Bangalore Indiranagar Store",
  },
  {
    name: "Suhas Patel",
    email: "manager.bom@acmeretail.com",
    role: "LOCATION_MANAGER",
    badge: "BOM Logistics Manager",
    description: "Scoped to Mumbai Logistics Hub",
  },
];

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@acmeretail.com");
  const [password, setPassword] = useState("Password@123");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!navigator.onLine) {
      setError("No internet connection. Please connect to the internet to continue.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (loginError) {
      const msg = loginError.message || "";
      if (
        msg.toLowerCase().includes("database") ||
        msg.toLowerCase().includes("reach") ||
        msg.toLowerCase().includes("prisma") ||
        msg.toLowerCase().includes("connection") ||
        msg.toLowerCase().includes("fetch") ||
        msg.toLowerCase().includes("network")
      ) {
        setError("Unable to reach the database or server. Please try again shortly.");
      } else {
        setError(msg);
      }
      setIsSubmitting(false);
    }
  };

  const handleQuickPersona = async (persona) => {
    if (!navigator.onLine) {
      setError("No internet connection. Please connect to the internet to continue.");
      return;
    }
    setError("");
    setEmail(persona.email);
    setPassword("Password@123");
    setIsSubmitting(true);
    try {
      await login(persona.email, "Password@123");
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Sign in failed");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 py-8 sm:px-6 lg:px-10 font-sans antialiased">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left column: Brand & platform overview */}
        <div className="lg:col-span-6 text-left space-y-6">
          <div className="inline-flex items-center gap-3">
            <div className="w-11 h-11 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-blue-300/90 block">
                Multi-Tenant Platform
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Compliance Management Platform
              </h1>
            </div>
          </div>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-md">
            Centralize regulatory licenses, track location-level compliance scores, and share time-bound audit rooms from one workspace.
          </p>

          <div className="hidden sm:grid grid-cols-1 gap-3.5 pt-2 max-w-md">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10">
              <MapPin className="w-4 h-4 text-blue-300 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-xs font-semibold text-white">Location-Scoped Access</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Org Admins oversee every site while Store Managers manage their assigned facilities.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10">
              <FileCheck className="w-4 h-4 text-teal-300 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-xs font-semibold text-white">Automated Compliance Scoring</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real-time expiry alerts, license dependency checks, and historical health trends.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10">
              <Lock className="w-4 h-4 text-blue-300 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-xs font-semibold text-white">External Audit Data Rooms</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Generate PIN-protected, expiring inspection links with full access logging.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Sign-in & demo access */}
        <div className="lg:col-span-6 w-full max-w-md mx-auto lg:ml-auto">
          <div className="bg-white p-6 sm:p-8 shadow-2xl rounded-2xl border border-slate-200/80">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">Sign in to your workspace</h2>
              <p className="text-xs text-gray-500 mt-0.5">Enter your corporate credentials or use a demo persona below.</p>
            </div>

            <form className="space-y-3.5" onSubmit={handleLogin}>
              {error && (
                error.toLowerCase().includes("internet") ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex items-start gap-3">
                    <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg shrink-0 mt-0.5">
                      <WifiOff className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-amber-900">No Internet Connection</h4>
                      <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                        Please connect to the internet to continue.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 flex items-start gap-2.5 text-xs text-red-700">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )
              )}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Corporate Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Register CTA */}
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
              <span className="text-xs text-gray-500">New organization?</span>
              <Link
                to="/register"
                className="inline-flex items-center gap-1.5 py-1.5 px-3 border border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-lg transition-all"
              >
                <Building2 className="w-3.5 h-3.5" />
                Register Your Organization
              </Link>
            </div>

            {/* Quick Persona Switcher for Presentation & Testing */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-2">
                Quick RBAC Persona Sign-In (Demo)
              </span>
              <div className="space-y-1.5">
                {DEMO_PERSONAS.map((p) => (
                  <button
                    key={p.email}
                    type="button"
                    onClick={() => handleQuickPersona(p)}
                    disabled={isSubmitting}
                    className="w-full text-left px-3 py-2 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors flex items-center justify-between text-xs disabled:opacity-60 cursor-pointer"
                  >
                    <div className="truncate">
                      <span className="font-semibold text-gray-900 block truncate">{p.name}</span>
                      <span className="text-[10px] text-gray-400 block truncate">{p.email}</span>
                    </div>
                    <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0 ml-2">
                      {p.badge}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
