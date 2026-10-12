import React from "react";
import { Shield, Loader2 } from "lucide-react";

export function Skeleton({ className = "" }) {
  return <div className={`skeleton-shimmer rounded-lg ${className}`} />;
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
    <div className="space-y-6 animate-pulse">
      {/* Top Banner Skeleton */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="w-48 h-4" />
            <Skeleton className="w-72 h-3" />
          </div>
        </div>
        <Skeleton className="w-32 h-9 rounded-xl" />
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-gray-200/80 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="w-24 h-3.5" />
              <Skeleton className="w-8 h-8 rounded-lg" />
            </div>
            <Skeleton className="w-16 h-8 rounded-md" />
            <Skeleton className="w-32 h-3" />
          </div>
        ))}
      </div>

      {/* Middle Section: Overall Score + Locations Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white border border-gray-200/80 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <Skeleton className="w-36 h-4" />
            <Skeleton className="w-16 h-6 rounded-md" />
          </div>
          <div className="flex justify-center py-4">
            <Skeleton className="w-40 h-40 rounded-full" />
          </div>
          <div className="space-y-2 pt-2">
            <Skeleton className="w-full h-3" />
            <Skeleton className="w-3/4 h-3" />
          </div>
        </div>

        <div className="lg:col-span-2 bg-white border border-gray-200/80 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <Skeleton className="w-44 h-4" />
            <Skeleton className="w-28 h-8 rounded-lg" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 border border-gray-100 rounded-xl flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="w-32 h-4" />
                  <Skeleton className="w-48 h-3" />
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="w-16 h-6 rounded-full" />
                  <Skeleton className="w-8 h-8 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Documents Table Skeleton */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <Skeleton className="w-40 h-4" />
          <Skeleton className="w-24 h-4" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-lg" />
                <div className="space-y-1.5">
                  <Skeleton className="w-36 h-3.5" />
                  <Skeleton className="w-24 h-2.5" />
                </div>
              </div>
              <Skeleton className="w-20 h-6 rounded-full" />
              <Skeleton className="w-24 h-3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LocationsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Search and action bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200/80">
        <Skeleton className="w-full sm:w-72 h-10 rounded-xl" />
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <Skeleton className="w-28 h-10 rounded-xl" />
          <Skeleton className="w-36 h-10 rounded-xl" />
        </div>
      </div>

      {/* Location Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white border border-gray-200/80 rounded-2xl p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton className="w-32 h-4" />
                <Skeleton className="w-20 h-3" />
              </div>
              <Skeleton className="w-12 h-6 rounded-full" />
            </div>
            <div className="py-2 flex items-center justify-center">
              <Skeleton className="w-24 h-24 rounded-full" />
            </div>
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <div className="flex justify-between">
                <Skeleton className="w-20 h-3" />
                <Skeleton className="w-16 h-3" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="w-24 h-3" />
                <Skeleton className="w-12 h-3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DocumentsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Top Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-gray-200/80 rounded-2xl p-4 space-y-2">
            <Skeleton className="w-16 h-3" />
            <Skeleton className="w-10 h-7" />
          </div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200/80">
        <Skeleton className="w-full sm:w-64 h-10 rounded-xl" />
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Skeleton className="w-24 h-10 rounded-xl" />
          <Skeleton className="w-24 h-10 rounded-xl" />
          <Skeleton className="w-36 h-10 rounded-xl" />
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="bg-white border border-gray-200/80 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <Skeleton className="w-36 h-4" />
          <Skeleton className="w-20 h-4" />
        </div>
        <div className="divide-y divide-gray-100">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-[200px]">
                <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
                <div className="space-y-1.5">
                  <Skeleton className="w-36 h-3.5" />
                  <Skeleton className="w-48 h-2.5" />
                </div>
              </div>
              <Skeleton className="w-24 h-3 hidden md:block" />
              <Skeleton className="w-20 h-6 rounded-full shrink-0" />
              <Skeleton className="w-28 h-3 hidden sm:block" />
              <div className="flex items-center gap-2">
                <Skeleton className="w-8 h-8 rounded-lg" />
                <Skeleton className="w-8 h-8 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ComplianceScoreSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Location Selector Bar */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <Skeleton className="w-48 h-5" />
        </div>
        <Skeleton className="w-full sm:w-64 h-10 rounded-xl" />
      </div>

      {/* Gauge and Factors Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white border border-gray-200/80 rounded-2xl p-6 flex flex-col items-center justify-center space-y-4">
          <Skeleton className="w-32 h-4" />
          <Skeleton className="w-44 h-44 rounded-full" />
          <Skeleton className="w-28 h-6 rounded-md" />
        </div>
        <div className="lg:col-span-2 bg-white border border-gray-200/80 rounded-2xl p-6 space-y-4">
          <Skeleton className="w-48 h-5 pb-2" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 border border-gray-100 rounded-xl space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="w-36 h-4" />
                  <Skeleton className="w-16 h-4" />
                </div>
                <Skeleton className="w-full h-2 rounded-full" />
                <Skeleton className="w-56 h-3" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dependency Graph Box */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-6 space-y-4">
        <Skeleton className="w-52 h-5" />
        <Skeleton className="w-full h-48 rounded-xl" />
      </div>
    </div>
  );
}

export function AuditLinksSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header and Add button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200/80">
        <div className="space-y-1 w-full sm:w-auto">
          <Skeleton className="w-44 h-5" />
          <Skeleton className="w-64 h-3" />
        </div>
        <Skeleton className="w-44 h-10 rounded-xl" />
      </div>

      {/* Cards list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-gray-200/80 rounded-2xl p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton className="w-40 h-4" />
                <Skeleton className="w-24 h-3" />
              </div>
              <Skeleton className="w-16 h-6 rounded-full" />
            </div>
            <div className="space-y-2 py-2">
              <Skeleton className="w-full h-3" />
              <Skeleton className="w-3/4 h-3" />
            </div>
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
              <Skeleton className="w-32 h-4" />
              <div className="flex items-center gap-2">
                <Skeleton className="w-8 h-8 rounded-lg" />
                <Skeleton className="w-8 h-8 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
