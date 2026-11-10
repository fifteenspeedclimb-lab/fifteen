import React from 'react';

interface FifteenLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const FifteenLogo: React.FC<FifteenLogoProps> = ({
  className = '',
  size = 'md',
}) => {
  // Height presets enlarged by a third (+33%) for bold athletic presence
  const heightStyles = {
    sm: 'h-9 sm:h-12',
    md: 'h-11 xs:h-13 sm:h-15 md:h-16',
    lg: 'h-15 sm:h-19 md:h-22',
    xl: 'h-20 sm:h-26 md:h-30',
  };

  return (
    <div
      className={`inline-flex items-center justify-center select-none transition-transform hover:scale-[1.02] active:scale-98 ${className}`}
      title="FIFTEEN – Speed Climbing App"
    >
      {/* Official Transparent PNG Brand Logo (New 2026 Asset) */}
      <img
        src="/assets/aistudio/Logo_fb76e3be.png"
        alt="FIFTEEN Speed Climbing App"
        className={`${heightStyles[size]} w-auto object-contain max-w-[220px] xs:max-w-[270px] sm:max-w-[360px] drop-shadow-sm`}
        loading="eager"
      />
    </div>
  );
};

interface FifteenAppIconProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const FifteenAppIcon: React.FC<FifteenAppIconProps> = ({
  className = '',
  size = 'md',
}) => {
  const sizeStyles = {
    sm: 'w-6 h-6 rounded-lg',
    md: 'w-8 h-8 rounded-xl',
    lg: 'w-12 h-12 rounded-2xl',
    xl: 'w-20 h-20 rounded-3xl',
  };

  return (
    <img
      src="/assets/aistudio/icona_fifteen_0ee00877.jpg"
      alt="Fifteen App Icon"
      className={`object-cover shadow-md select-none shrink-0 ${sizeStyles[size]} ${className}`}
      loading="eager"
    />
  );
};
