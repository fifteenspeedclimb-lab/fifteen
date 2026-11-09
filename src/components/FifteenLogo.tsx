import React from 'react';

interface FifteenLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const FifteenLogo: React.FC<FifteenLogoProps> = ({
  className = '',
  size = 'md',
}) => {
  // Height presets for different viewport scenarios
  const heightStyles = {
    sm: 'h-7 sm:h-9',
    md: 'h-8 xs:h-9 sm:h-11',
    lg: 'h-11 sm:h-14 md:h-16',
    xl: 'h-16 sm:h-22',
  };

  return (
    <div
      className={`inline-flex items-center select-none transition-transform active:scale-98 ${className}`}
      title="FIFTEEN – Speed Climbing App"
    >
      {/* Authentic High-Fidelity Brand Logo from User Spec */}
      <div className="relative flex items-center justify-center bg-black rounded-xl sm:rounded-2xl px-2 py-0.5 sm:px-2.5 sm:py-1 border border-slate-800/80 shadow-md overflow-hidden">
        <img
          src="/assets/aistudio/Gemini_Generated_Image_itws2vitws2vitws_3645fa51.jpg"
          alt="FIFTEEN Speed Climbing App"
          className={`${heightStyles[size]} w-auto object-contain max-w-[140px] xs:max-w-[180px] sm:max-w-[240px]`}
          loading="eager"
        />
      </div>
    </div>
  );
};
