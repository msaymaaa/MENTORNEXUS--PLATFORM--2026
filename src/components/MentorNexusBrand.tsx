import React, { useState } from 'react';
import logoImg from '../assets/images/mentornexus_logo_1788157419756.jpg';

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
  const [imgError, setImgError] = useState(false);

  const getIconSize = () => {
    switch (size) {
      case 'sm': return 'w-8 h-8 sm:w-9 sm:h-9';
      case 'lg': return 'w-10 h-10 sm:w-11 sm:h-11';
      case 'xl': return 'w-12 h-12 sm:w-14 sm:h-14';
      case 'md':
      default: return 'w-9 h-9 sm:w-10 sm:h-10';
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
      {/* Official MentorNexus MN Compass/Star Mark with Decorative Gold Border */}
      <div className={`relative ${getIconSize()} rounded-xl overflow-hidden shadow-md shadow-[#000000]/60 group-hover:shadow-[#D4AF37]/25 transition-all shrink-0 flex items-center justify-center bg-[#0A1020]`}>
        {!imgError ? (
          <img 
            src={logoImg} 
            alt="MentorNexus" 
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 rounded-xl"
            referrerPolicy="no-referrer"
          />
        ) : (
          <svg 
            viewBox="0 0 100 100" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full group-hover:scale-105 transition-transform duration-300"
          >
            <defs>
              <radialGradient id="mn-svg-bg" cx="50%" cy="50%" r="65%">
                <stop offset="0%" stopColor="#111B34" />
                <stop offset="70%" stopColor="#0A1020" />
                <stop offset="100%" stopColor="#050810" />
              </radialGradient>
              <linearGradient id="mn-svg-gold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFF3C4" />
                <stop offset="25%" stopColor="#D4AF37" />
                <stop offset="50%" stopColor="#8E7019" />
                <stop offset="75%" stopColor="#F5DE82" />
                <stop offset="100%" stopColor="#C5A028" />
              </linearGradient>
              <linearGradient id="mn-svg-gold-l" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFF8D6" />
                <stop offset="50%" stopColor="#E5C358" />
                <stop offset="100%" stopColor="#C99E2A" />
              </linearGradient>
              <linearGradient id="mn-svg-gold-d" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#C5A028" />
                <stop offset="50%" stopColor="#8F6E15" />
                <stop offset="100%" stopColor="#604705" />
              </linearGradient>
              <linearGradient id="mn-svg-gold-txt" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FFF0BA" />
                <stop offset="35%" stopColor="#E0BD4E" />
                <stop offset="70%" stopColor="#B88E1E" />
                <stop offset="100%" stopColor="#8C680E" />
              </linearGradient>
            </defs>
            <rect x="4" y="4" width="92" height="92" rx="20" ry="20" fill="url(#mn-svg-bg)" />
            <rect x="4" y="4" width="92" height="92" rx="20" ry="20" fill="none" stroke="url(#mn-svg-gold)" strokeWidth="3.5" />
            <polygon points="50,9 51.5,13.5 56,13.5 52.5,16.2 53.8,20.5 50,18 46.2,20.5 47.5,16.2 44,13.5 48.5,13.5" fill="url(#mn-svg-gold-l)" stroke="url(#mn-svg-gold-d)" strokeWidth="0.5" />
            <circle cx="50" cy="53" r="23" fill="none" stroke="url(#mn-svg-gold)" strokeWidth="2.5" />
            <path d="M 33.7 36.7 L 27 30 M 24 33 L 30 27" stroke="url(#mn-svg-gold-l)" strokeWidth="2.8" strokeLinecap="round" />
            <path d="M 66.3 36.7 L 73 30 M 76 33 L 70 27" stroke="url(#mn-svg-gold-l)" strokeWidth="2.8" strokeLinecap="round" />
            <path d="M 33.7 69.3 L 27 76 M 24 73 L 30 79" stroke="url(#mn-svg-gold-l)" strokeWidth="2.8" strokeLinecap="round" />
            <path d="M 66.3 69.3 L 73 76 M 76 73 L 70 79" stroke="url(#mn-svg-gold-l)" strokeWidth="2.8" strokeLinecap="round" />
            <polygon points="50,21 50,47 43.5,47" fill="url(#mn-svg-gold-d)" />
            <polygon points="50,21 56.5,47 50,47" fill="url(#mn-svg-gold-l)" />
            <polygon points="50,88 43.5,61 50,61" fill="url(#mn-svg-gold-d)" />
            <polygon points="50,88 50,61 56.5,61" fill="url(#mn-svg-gold-l)" />
            <polygon points="12,53 36,46.5 36,53" fill="url(#mn-svg-gold-l)" />
            <polygon points="12,53 36,53 36,59.5" fill="url(#mn-svg-gold-d)" />
            <polygon points="88,53 64,46.5 64,53" fill="url(#mn-svg-gold-d)" />
            <polygon points="88,53 64,53 64,59.5" fill="url(#mn-svg-gold-l)" />
            <circle cx="50" cy="53.5" r="16.5" fill="#0A1020" fillOpacity="0.9" />
            <path d="M 31 63.5 V 43.5 H 35.5 L 41 53.5 L 46.5 43.5 H 51 V 63.5 H 46.5 V 50.5 L 41.8 59 H 40.2 L 35.5 50.5 V 63.5 Z" fill="url(#mn-svg-gold-txt)" stroke="#5A4305" strokeWidth="0.4" />
            <path d="M 53 63.5 V 43.5 H 57.5 L 64.5 56.5 V 43.5 H 69 V 63.5 H 64.5 L 57.5 50.5 V 63.5 Z" fill="url(#mn-svg-gold-txt)" stroke="#5A4305" strokeWidth="0.4" />
          </svg>
        )}
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
