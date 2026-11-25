import React from "react";

/**
 * Clean, lightweight buffering animation component.
 * Replaces heavy multi-element skeleton boxes with an elegant, responsive buffering loader.
 */
export function BufferingLoader({
  title = "Loading...",
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
      </div>

      <h3 className="text-sm font-semibold text-gray-900 tracking-tight">
        {title}
      </h3>
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

export function WorkspaceLoader({ message = "Loading workspace..." }) {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6 font-sans antialiased"
      role="status"
      aria-live="polite"
    >
      <div className="ms-loader text-white mb-5" aria-hidden="true">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <span
            key={index}
            className="ms-loader-dot"
            style={{ animationDelay: `${index * 110}ms` }}
          />
        ))}
      </div>
      <p className="text-sm font-medium text-white/90 tracking-tight">{message}</p>
    </div>
  );
}

export function DashboardSkeleton() {
  return <BufferingLoader title="Loading Dashboard" />;
}

export function LocationsSkeleton() {
  return <BufferingLoader title="Loading Locations" />;
}

export function DocumentsSkeleton() {
  return <BufferingLoader title="Loading Document Vault" />;
}

export function ComplianceScoreSkeleton() {
  return <BufferingLoader title="Calculating Compliance Health" />;
}

export function AuditLinksSkeleton() {
  return <BufferingLoader title="Loading Audit Rooms" />;
}

export default BufferingLoader;
