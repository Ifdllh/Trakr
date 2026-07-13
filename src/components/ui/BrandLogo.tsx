import React from 'react';

export default function BrandLogo() {
  return (
    <div className="flex items-center gap-3.5">
      <svg width="44" height="44" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="shadow-md rounded-[10px]">
        <defs>
          <linearGradient id="trakr-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4F46E5" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="10" fill="url(#trakr-gradient)" />
        <path d="M10 20 L 18 12 L 24 16 L 32 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="32" cy="8" r="3" fill="white" />
        <path d="M18 12 V 28" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <div className="text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
        Trakr<span className="text-indigo-600">.</span>
      </div>
    </div>
  );
}
