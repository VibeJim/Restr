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
      {/* Rounded pillowed rectangle background */}
      <rect x="2" y="4" width="20" height="16" rx="4" fill="#f59e0b" />
      
      {/* Lightning bolt icon representing NOSTR and Bitcoin */}
      <path d="M14.25 5L7.5 12.75H12L9.75 19L16.5 11.25H12L14.25 5Z" 
        fill="white" 
        stroke="white" 
        strokeWidth="0.5" 
        strokeLinejoin="round" 
      />
      
      {/* Nostr connection points */}
      <circle cx="8" cy="8" r="1" fill="white" />
      <circle cx="16" cy="16" r="1" fill="white" />
    </svg>
  );
}

export function RestrLogoFull({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center ${className}`}>
      <RestrLogoIcon size={32} />
      <span className="ml-2 text-2xl font-bold text-primary">restr</span>
    </div>
  );
}