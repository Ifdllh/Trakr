import React from 'react';

export function TransactionSkeleton() {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-xs mb-4">
      {/* Date Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 px-5 py-3.5 border-b border-gray-200 sticky top-0 z-10 w-full animate-pulse">
        <div className="h-4 w-32 bg-gray-200 rounded-md"></div>
        <div className="flex items-center gap-3">
          <div className="h-6 w-24 bg-gray-200 rounded-md"></div>
        </div>
      </div>

      {/* Transaction Items Skeleton */}
      <div className="divide-y divide-gray-100 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 bg-white">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gray-200 shrink-0"></div>
              <div className="space-y-2">
                <div className="h-4 w-40 bg-gray-200 rounded-md"></div>
                <div className="h-3 w-24 bg-gray-100 rounded-md"></div>
              </div>
            </div>
            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center w-full sm:w-auto gap-2 sm:gap-1">
              <div className="h-4 w-28 bg-gray-200 rounded-md"></div>
              <div className="h-3 w-20 bg-gray-100 rounded-md"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BudgetSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs transition-shadow flex flex-col justify-between relative overflow-hidden animate-pulse min-h-[160px]">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200"></div>
          <div className="space-y-2">
            <div className="h-4 w-32 bg-gray-200 rounded-md"></div>
            <div className="h-3 w-24 bg-gray-100 rounded-md"></div>
          </div>
        </div>
        <div className="h-8 w-16 bg-gray-200 rounded-full"></div>
      </div>
      
      <div className="space-y-3 mt-4">
        <div className="flex justify-between items-end">
          <div className="h-4 w-20 bg-gray-200 rounded-md"></div>
          <div className="h-5 w-24 bg-gray-200 rounded-md"></div>
        </div>
        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gray-200 w-1/3"></div>
        </div>
      </div>
    </div>
  );
}
