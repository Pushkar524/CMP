import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Shield, Building2, UserCheck, ArrowRight, Lock } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { allUsers, switchUser } = useAuth();
  const [email, setEmail] = useState("anantha@apexretail.in");
  const [password, setPassword] = useState("password123");

  const handleLogin = (e) => {
    e.preventDefault();
    const found = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (found) {
      switchUser(found.id);
    }
    navigate("/dashboard");
  };

  const handleQuickPersona = (user) => {
    switchUser(user.id);
    setEmail(user.email);
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans antialiased">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <h2 className="mt-4 text-2xl font-black text-white tracking-tight">SCLIP Compliance Cloud</h2>
        <p className="mt-1 text-xs text-slate-400">
          Cloud-based, multi-tenant license & compliance management system
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-3xl sm:px-10 border border-slate-800">
          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Corporate Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              Sign In to Platform
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Register CTA */}
          <div className="mt-5 pt-5 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500 mb-2.5">New to SCLIP? Set up your compliance workspace.</p>
            <Link
              to="/register"
              className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 border-2 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 text-indigo-700 text-xs font-bold rounded-xl transition-all"
            >
              <Building2 className="w-4 h-4" />
              Register Your Organization
            </Link>
          </div>

          {/* Quick Persona Switcher for Presentation & Testing */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-2.5 text-center">
              Quick RBAC Persona Sign-In (Demo)
            </span>
            <div className="space-y-2">
              {allUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleQuickPersona(u)}
                  className="w-full text-left p-2.5 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors flex items-center justify-between text-xs"
                >
                  <div className="truncate">
                    <span className="font-bold text-gray-900 block truncate">{u.name}</span>
                    <span className="text-[10px] text-gray-400 block truncate">{u.email}</span>
                  </div>
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 shrink-0 ml-2">
                    {u.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
