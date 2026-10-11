import React from 'react';

/**
 * InvenIQ Brand Logo Component
 * Modern Enterprise 3D Smart-Cube / Intelligence Glyph
 * - Top Facet: Vibrant Crimson (#E11900) - Inventory Action & Core Operations
 * - Left Facet: Royal Blue (#0072BC) - Machine Learning Intelligence & Technology
 * - Right Facet: Emerald Green (#00A859) - Catalog Growth & Stock Balance
 * - Center Node: Amber (#FDB913) - Value Optimization & Smart Reorder Point
 */
export const InveniqLogoIcon = ({ className = "h-8 w-8" }) => {
  return (
    <svg 
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
    >
      <defs>
        {/* Subtle dimensional gradients */}
        <linearGradient id="inveniq-red-grad" x1="6" y1="4" x2="42" y2="25" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF2E17" />
          <stop offset="1" stopColor="#E11900" />
        </linearGradient>
        <linearGradient id="inveniq-blue-grad" x1="6" y1="14.5" x2="24" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#008BE3" />
          <stop offset="1" stopColor="#00609E" />
        </linearGradient>
        <linearGradient id="inveniq-green-grad" x1="24" y1="25" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00C468" />
          <stop offset="1" stopColor="#008A49" />
        </linearGradient>
        <filter id="cube-shadow" x="0" y="0" width="48" height="48" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#0F172A" floodOpacity="0.12" />
        </filter>
      </defs>

      <g filter="url(#cube-shadow)">
        {/* Top Facet - Crimson Red */}
        <path 
          d="M24 5.5L41 15L24 24.5L7 15L24 5.5Z" 
          fill="url(#inveniq-red-grad)" 
          stroke="#C81500" 
          strokeWidth="1.2" 
          strokeLinejoin="round" 
        />

        {/* Left Facet - Tech Blue */}
        <path 
          d="M7 15L24 24.5V42.5L7 33V15Z" 
          fill="url(#inveniq-blue-grad)" 
          stroke="#004D7D" 
          strokeWidth="1.2" 
          strokeLinejoin="round" 
        />

        {/* Right Facet - Growth Emerald Green */}
        <path 
          d="M24 24.5L41 15V33L24 42.5V24.5Z" 
          fill="url(#inveniq-green-grad)" 
          stroke="#006E3B" 
          strokeWidth="1.2" 
          strokeLinejoin="round" 
        />

        {/* Center Smart Reorder Node - Gold/Amber Core with White Halo */}
        <circle 
          cx="24" 
          cy="24.5" 
          r="4.2" 
          fill="#FDB913" 
          stroke="#FFFFFF" 
          strokeWidth="1.8" 
        />
        <circle 
          cx="24" 
          cy="24.5" 
          r="1.5" 
          fill="#FFFFFF" 
        />
      </g>
    </svg>
  );
};

export const InveniqLogo = ({ 
  showText = true, 
  iconClassName = "h-8 w-8",
  textClassName = "text-lg font-black tracking-tight",
  subtitle = "ENTERPRISE SUITE",
  stacked = false
}) => {
  return (
    <div className={`inline-flex items-center gap-2.5 ${stacked ? 'flex-col items-center' : ''}`}>
      <InveniqLogoIcon className={iconClassName} />
      {showText && (
        <div className="flex flex-col leading-tight">
          <span className={`text-slate-900 dark:text-white font-black tracking-[-0.03em] ${textClassName}`}>
            INVEN<span className="text-[#E11900]">IQ</span>
          </span>
          {subtitle && (
            <span className="text-[9px] font-extrabold tracking-[0.16em] text-slate-400 dark:text-slate-500 uppercase">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default InveniqLogo;
