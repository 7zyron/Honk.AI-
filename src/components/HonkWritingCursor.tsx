import React from 'react';

interface HonkWritingCursorProps {
  className?: string;
}

export const HonkWritingCursor: React.FC<HonkWritingCursorProps> = ({ className = '' }) => {
  return (
    <span
      className={`inline-flex items-center align-baseline select-none ml-1.5 relative z-10 honk-pen-wrapper ${className}`}
      aria-hidden="true"
      title="Honk is writing..."
    >
      <span className="relative inline-flex items-center justify-center -top-0.5">
        {/* Glowing Ink Pulse Dot */}
        <span
          className="absolute -bottom-0.5 -left-0.5 h-1.5 w-1.5 rounded-full honk-ink-dot pointer-events-none"
          style={{
            backgroundColor: 'var(--honk-accent)',
            boxShadow: '0 0 6px var(--honk-accent)',
          }}
        />

        {/* Fountain Pen with Nib pointing down-left at the baseline */}
        <span className="honk-pen-icon inline-block text-xs leading-none pointer-events-none">
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              color: 'var(--honk-accent)',
              filter: 'drop-shadow(0 0 3px var(--honk-accent))',
            }}
          >
            {/* Pen nib and barrel */}
            <path d="M12 19l7-7 3 3-7 7-3-3z" fill="var(--honk-accent)" fillOpacity="0.25" />
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
            <path d="M2 2l7.586 7.586" />
            <circle cx="11" cy="11" r="1.2" fill="currentColor" />
          </svg>
        </span>
      </span>
    </span>
  );
};

export default HonkWritingCursor;
