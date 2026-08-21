import React from 'react';

interface MentorNexusBrandProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onClick?: () => void;
  className?: string;
  showTagline?: boolean;
}

export const MentorNexusBrand: React.FC<MentorNexusBrandProps> = ({
  size = 'md',
  onClick,
  className = '',
  showTagline = false
}) => {
  const getIconSize = () => {
    switch (size) {
      case 'sm': return 'w-7 h-7';
      case 'lg': return 'w-10 h-10';
      case 'xl': return 'w-12 h-12';
      case 'md':
      default: return 'w-8 h-8 sm:w-9 sm:h-9';
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'sm': return 'text-lg';
      case 'lg': return 'text-2xl sm:text-3xl';
      case 'xl': return 'text-3xl sm:text-4xl';
      case 'md':
      default: return 'text-xl sm:text-2xl';
    }
  };

  return (
    <div 
      onClick={onClick}
      className={`inline-flex items-center space-x-3 select-none ${onClick ? 'cursor-pointer group' : ''} ${className}`}
      id="mentornexus-brand-logo"
    >
      {/* Precision Geometric M Monogram Mark */}
      <div className={`relative ${getIconSize()} rounded-xl bg-gradient-to-br from-[#1B1F30] via-[#121522] to-[#0A0C14] border border-[#D4AF37]/40 p-1.5 flex items-center justify-center shadow-lg shadow-[#D4AF37]/10 group-hover:border-[#D4AF37] transition-all shrink-0`}>
        <svg 
          viewBox="0 0 32 32" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full text-[#D4AF37] group-hover:scale-105 transition-transform"
        >
          {/* Architectural Hexagonal / Polygonal 'M' Symbol */}
          <path 
            d="M6 25V7L16 17L26 7V25" 
            stroke="url(#m-gold-grad)" 
            strokeWidth="3.2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          {/* Central Nexus Keystone Diamond */}
          <circle cx="16" cy="17" r="2.2" fill="#F5F2EB" />
          <defs>
            <linearGradient id="m-gold-grad" x1="6" y1="7" x2="26" y2="25" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F5F2EB" />
              <stop offset="0.5" stopColor="#D4AF37" />
              <stop offset="1" stopColor="#AA8520" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Brand Wordmark: M MentorNexus */}
      <div className="flex flex-col text-left">
        <div className="flex items-center space-x-1">
          <span className={`font-serif font-bold tracking-tight text-[#F5F2EB] ${getTextSize()} group-hover:text-[#FAF8F5] transition-colors leading-none`}>
            Mentor<span className="text-[#D4AF37]">Nexus</span>
          </span>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#D4AF37] mb-1" />
        </div>
        {showTagline && (
          <span className="text-[10px] uppercase font-mono tracking-widest text-[#9E9A90] mt-0.5">
            Where ambition meets experience
          </span>
        )}
      </div>
    </div>
  );
};
