import React from 'react';

interface FifteenLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
}

export const FifteenLogo: React.FC<FifteenLogoProps> = ({
  className = '',
  size = 'md',
  showSubtitle = true,
}) => {
  // Height presets for different viewport scenarios
  const heightStyles = {
    sm: 'h-9 sm:h-10',
    md: 'h-11 sm:h-12 md:h-14',
    lg: 'h-14 sm:h-16 md:h-20',
    xl: 'h-20 sm:h-24 md:h-28',
  };

  return (
    <div
      className={`inline-flex items-center text-slate-950 dark:text-white transition-colors duration-150 select-none ${className}`}
      title="FIFTEEN – Speed Climbing App"
    >
      <svg
        viewBox="0 0 290 66"
        className={`${heightStyles[size]} w-auto overflow-visible drop-shadow-sm`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="FIFTEEN Speed Climbing App Logo"
      >
        <defs>
          {/* Olympic & IFSC Competition Red Gradient for the Arrow */}
          <linearGradient id="arrowRedGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#b91c1c" />
            <stop offset="50%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>

          {/* Dynamic gloss highlight for arrow */}
          <linearGradient id="arrowGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Slanted Athletic Group (-10deg forward momentum) */}
        <g transform="skewX(-10) translate(14, 0)">
          {/* F (First - with sharp chiseled top and bottom speed-notches) */}
          <path
            d="M 6,24 L 12,18 L 33,18 L 33,24 L 18,24 L 18,29 L 30,29 L 30,35 L 18,35 L 18,48 L 10,48 L 6,42 Z"
            fill="currentColor"
          />

          {/* I */}
          <path
            d="M 39,18 L 47,18 L 47,48 L 39,48 Z"
            fill="currentColor"
          />

          {/* F (Second) */}
          <path
            d="M 53,18 L 74,18 L 74,24 L 62,24 L 62,29 L 71,29 L 71,35 L 62,35 L 62,48 L 53,48 Z"
            fill="currentColor"
          />

          {/* T */}
          <path
            d="M 80,18 L 104,18 L 104,24 L 96,24 L 96,48 L 88,48 L 88,24 L 80,24 Z"
            fill="currentColor"
          />

          {/* E (First) */}
          <path
            d="M 110,18 L 132,18 L 132,24 L 120,24 L 120,29 L 130,29 L 130,35 L 120,35 L 120,42 L 132,42 L 132,48 L 110,48 Z"
            fill="currentColor"
          />

          {/* E (Second) */}
          <path
            d="M 138,18 L 160,18 L 160,24 L 148,24 L 148,29 L 158,29 L 158,35 L 148,35 L 148,42 L 160,42 L 160,48 L 138,48 Z"
            fill="currentColor"
          />

          {/* N - Left Column (Theme-adaptive: slate-950 light / white dark) */}
          <path
            d="M 166,18 L 174,18 L 174,48 L 166,48 Z"
            fill="currentColor"
          />

          {/* N - Diagonal and Right Climbing Red Arrow (Vibrant Race Red) */}
          {/* Diagonal Stroke connecting to the Arrow Column */}
          <path
            d="M 168,22 L 182,48 L 188,48 L 174,22 Z"
            fill="url(#arrowRedGrad)"
          />

          {/* Red Upward Speed Climbing Arrow (Towering up through the roof) */}
          <g>
            {/* Arrow Stem */}
            <path
              d="M 183,48 L 191,48 L 191,15 L 183,15 Z"
              fill="url(#arrowRedGrad)"
            />
            {/* Arrow Head (Pointing up to 15m top sensor) */}
            <path
              d="M 187,2 L 198,16 L 191,14.5 L 191,15 L 183,15 L 183,14.5 L 176,16 Z"
              fill="url(#arrowRedGrad)"
            />
            {/* Subtle Speed Notch at bottom of arrow shaft */}
            <path
              d="M 183,48 L 180,55 L 187,48 Z"
              fill="url(#arrowRedGrad)"
            />
          </g>
        </g>

        {/* Subtitle: "SPEED CLIMBING APP" with athletic tracking */}
        {showSubtitle && (
          <g transform="skewX(-6) translate(18, 0)">
            <text
              x="5"
              y="60"
              className="fill-slate-500 dark:fill-slate-400 font-extrabold"
              style={{
                fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                fontSize: '8px',
                letterSpacing: '0.26em',
                fontWeight: 800,
              }}
            >
              SPEED CLIMBING APP
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};
