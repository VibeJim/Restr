import React from 'react';

export function RestrLogoIcon({ size = 24, className = '' }: { size?: number, className?: string }) {
  return (
    <svg 
      width={size} 
      height={size}
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Base cushion shape */}
      <rect 
        x="2" 
        y="4" 
        width="20" 
        height="16" 
        rx="5" 
        fill="#f59e0b" 
        stroke="#e67e22"
        strokeWidth="1"
      />
      
      {/* Highlight to give cushion dimension */}
      <path 
        d="M3 9C5 7 19 7 21 9V19H3V9Z" 
        fill="#ffb938" 
        opacity="0.5"
      />
      
      {/* Shadows to give cushion dimension */}
      <path 
        d="M3 9C5 11 19 11 21 9" 
        stroke="#e67e22" 
        strokeWidth="0.5" 
        fill="none"
      />
      
      {/* Indentation effect in corners */}
      <circle cx="4" cy="6" r="0.7" fill="#e67e22" opacity="0.3" />
      <circle cx="20" cy="6" r="0.7" fill="#e67e22" opacity="0.3" />
      <circle cx="4" cy="18" r="0.7" fill="#e67e22" opacity="0.3" />
      <circle cx="20" cy="18" r="0.7" fill="#e67e22" opacity="0.3" />
      
      {/* Lightning bolt as a subtle crease in the cushion */}
      <path 
        d="M14 7L9 11.5H13L10 17L15 12.5H11L14 7Z" 
        stroke="#e67e22"
        strokeWidth="0.6"
        fill="none" 
        opacity="0.8"
      />
      
      {/* Highlight on the lightning crease */}
      <path 
        d="M14 7L9 11.5H13L10 17L15 12.5H11L14 7Z" 
        stroke="#fff"
        strokeWidth="0.3"
        fill="none" 
        opacity="0.4"
        strokeLinecap="round"
      />

      {/* Tassels in the corners */}
      {/* Top Left Tassel */}
      <path d="M3 5L1.5 2.5" stroke="#e67e22" strokeWidth="0.8" />
      <path d="M4 4L2 1.5" stroke="#e67e22" strokeWidth="0.8" />
      
      {/* Top Right Tassel */}
      <path d="M21 5L22.5 2.5" stroke="#e67e22" strokeWidth="0.8" />
      <path d="M20 4L22 1.5" stroke="#e67e22" strokeWidth="0.8" />
      
      {/* Bottom Left Tassel */}
      <path d="M3 19L1.5 21.5" stroke="#e67e22" strokeWidth="0.8" />
      <path d="M4 20L2 22.5" stroke="#e67e22" strokeWidth="0.8" />
      
      {/* Bottom Right Tassel */}
      <path d="M21 19L22.5 21.5" stroke="#e67e22" strokeWidth="0.8" />
      <path d="M20 20L22 22.5" stroke="#e67e22" strokeWidth="0.8" />
    </svg>
  );
}

export function RestrLogoFull({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center ${className}`}>
      <RestrLogoIcon size={38} />
      <span className="ml-2 text-2xl font-bold text-primary">Restr</span>
    </div>
  );
}