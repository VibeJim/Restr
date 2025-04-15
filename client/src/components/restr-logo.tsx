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
      <rect x="2" y="4" width="20" height="16" rx="2" fill="#f59e0b" />
      <rect x="5" y="7" width="14" height="10" rx="1" fill="white" />
      <path d="M7 10C7 9.44772 7.44772 9 8 9H16C16.5523 9 17 9.44772 17 10V14C17 14.5523 16.5523 15 16 15H8C7.44772 15 7 14.5523 7 14V10Z" fill="#f59e0b" />
      <path d="M11 12L13 12" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
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