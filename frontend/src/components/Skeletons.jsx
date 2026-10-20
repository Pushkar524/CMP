import React from "react";
import { Shield, Loader2 } from "lucide-react";

/**
 * Clean, lightweight buffering animation component.
 * Replaces heavy multi-element skeleton boxes with an elegant, responsive buffering loader.
 */
export function BufferingLoader({
  title = "Loading...",
  message = "Retrieving compliance records...",
  compact = false,
  className = ""
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center transition-opacity duration-200 ${
        compact
          ? "py-8 px-4"
          : "min-h-[380px] bg-white border border-gray-200/80 rounded-2xl shadow-xs p-8"
      } ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="relative flex items-center justify-center mb-4">
        {/* Ambient pulse aura */}
        <div className="w-12 h-12 rounded-full bg-indigo-500/15 animate-ping opacity-75 absolute" />

        {/* Outer static ring */}
        <div className="w-11 h-11 rounded-full border-2 border-indigo-100" />

        {/* Spinning buffering arc */}
        <div className="w-11 h-11 rounded-full border-2 border-transparent border-t-indigo-600 border-r-indigo-600 animate-spin absolute" />

        {/* Center core pulse */}
        <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse absolute" />
      </div>

      <h3 className="text-sm font-semibold text-gray-900 tracking-tight">
        {title}
      </h3>

      {message && (
        <p className="text-xs text-gray-500 mt-1.5 max-w-sm leading-relaxed">
          {message}
        </p>
      )}

      {/* Subtle buffering dots */}
      <div className="flex items-center gap-1.5 mt-3.5" aria-hidden="true">
        <span
          className="w-1.5 h-1.5 rounded-full bg-indigo-600/60 animate-bounce"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-indigo-600/60 animate-bounce"
          style={{ animationDelay: "300ms" }}
        />
      </div>
    </div>
  );
}

/**
 * Minimal inline placeholder if ever needed for small element fallbacks.
 */
export function Skeleton({ className = "" }) {
  return (
    <div
      className={`bg-indigo-50/60 border border-indigo-100/40 rounded-lg animate-pulse flex items-center justify-center ${className}`}
    >
      <div className="w-4 h-4 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
    </div>
  );
}

export function WorkspaceLoader({ message = "Initializing compliance workspace..." }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6 font-sans antialiased">
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
          <Shield className="w-8 h-8 text-indigo-400 animate-pulse" />
        </div>
        <div className="absolute -inset-2 rounded-3xl border-2 border-indigo-500/30 border-t-indigo-400 animate-spin pointer-events-none" />
      </div>
      <h3 className="text-base font-bold text-white tracking-tight">{message}</h3>
      <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1.5">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
        Fetching organization profile & licenses...
      </p>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <BufferingLoader
      title="Loading Dashboard"
      message="Aggregating compliance health, regulatory alerts, and location statistics..."
    />
  );
}

export function LocationsSkeleton() {
  return (
    <BufferingLoader
      title="Loading Locations"
      message="Syncing operational facilities, jurisdictional requirements, and permits..."
    />
  );
}

export function DocumentsSkeleton() {
  return (
    <BufferingLoader
      title="Loading Document Vault"
      message="Fetching compliance filings, regulatory proofs, and verification history..."
    />
  );
}

export function ComplianceScoreSkeleton() {
  return (
    <BufferingLoader
      title="Calculating Compliance Health"
      message="Evaluating penalty vectors, requirement weights, and risk classifications..."
    />
  );
}

export function AuditLinksSkeleton() {
  return (
    <BufferingLoader
      title="Loading Audit Rooms"
      message="Preparing secure external auditor links and session access logs..."
    />
  );
}

export default BufferingLoader;
