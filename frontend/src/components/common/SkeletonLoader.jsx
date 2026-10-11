import React from 'react';

export const CardSkeleton = () => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 animate-pulse">
    <div className="flex items-center justify-between mb-4">
      <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
      <div className="h-8 w-8 bg-slate-200 dark:bg-slate-800 rounded-lg" />
    </div>
    <div className="h-8 w-36 bg-slate-200 dark:bg-slate-800 rounded mb-2" />
    <div className="h-3 w-48 bg-slate-100 dark:bg-slate-800/60 rounded" />
  </div>
);

export const TableSkeleton = ({ rows = 5 }) => (
  <div className="w-full rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden animate-pulse">
    <div className="h-12 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40" />
    <div className="divide-y divide-slate-100 dark:divide-slate-800">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            <div>
              <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded mb-1.5" />
              <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800/60 rounded" />
            </div>
          </div>
          <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-4 w-12 bg-slate-200 dark:bg-slate-800 rounded" />
        </div>
      ))}
    </div>
  </div>
);
