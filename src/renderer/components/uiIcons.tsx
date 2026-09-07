import React from 'react';

// Небольшие SVG-иконки из totus_APP (src/component/UI/icons/*), которых нет в renderer/icons.
// Цвет — currentColor, размер — size (px).

type P = { size?: number; color?: string; className?: string };

const base = (size: number, color?: string): React.CSSProperties => ({
  width: size,
  height: size,
  display: 'block',
  flex: 'none',
  color: color || 'currentColor',
});

export const ArrowDownIcon: React.FC<P> = ({ size = 24, color, className }) => (
  <svg viewBox="0 0 24 24" fill="none" style={base(size, color)} className={className} aria-hidden="true">
    <path d="M11.8336 12.5372L16.3709 8L17.6672 9.29636L11.8336 15.13L6 9.29636L7.29636 8L11.8336 12.5372Z" fill="currentColor" fillOpacity="0.6" />
  </svg>
);

export const CheckmarkIcon: React.FC<P> = ({ size = 24, color, className }) => (
  <svg viewBox="0 0 24 24" fill="none" style={base(size, color)} className={className} aria-hidden="true">
    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const CloseCircleIcon: React.FC<P> = ({ size = 20, color, className }) => (
  <svg viewBox="0 0 20 20" fill="none" style={base(size, color)} className={className} aria-hidden="true">
    <circle cx="10" cy="10" r="10" fill="currentColor" fillOpacity="0.3" />
    <path d="M13 7L7 13M7 7L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const CloseIcon: React.FC<P> = ({ size = 20, color, className }) => (
  <svg viewBox="0 0 20 20" fill="none" style={base(size, color)} className={className} aria-hidden="true">
    <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const CalendarIcon: React.FC<P> = ({ size = 24, color, className }) => (
  <svg viewBox="0 0 24 24" fill="none" style={base(size, color)} className={className} aria-hidden="true">
    <rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.5" />
    <path d="M3 9.5H21" stroke="currentColor" strokeWidth="1.5" />
    <path d="M8 3V6.5M16 3V6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="8" cy="14" r="1" fill="currentColor" />
    <circle cx="12" cy="14" r="1" fill="currentColor" />
    <circle cx="16" cy="14" r="1" fill="currentColor" />
    <circle cx="8" cy="18" r="1" fill="currentColor" />
    <circle cx="12" cy="18" r="1" fill="currentColor" />
  </svg>
);

export const MinusIcon: React.FC<P> = ({ size = 20, color, className }) => (
  <svg viewBox="0 0 20 20" fill="none" style={base(size, color)} className={className} aria-hidden="true">
    <path d="M4.1665 10H15.8332" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const PlaneIcon: React.FC<P> = ({ size = 24, color, className }) => (
  <svg viewBox="0 0 20 27" fill="none" style={base(size, color)} className={className} aria-hidden="true">
    <path
      d="M9.52235 19.7689L12.1107 13.2578C12.1536 13.1497 12.2398 13.0645 12.3483 13.0228L16.7611 11.3262C17.325 11.1094 17.841 10.7555 18.1547 10.2392C18.8502 9.09491 18.6107 8.472 17.3278 8.0883C16.7489 7.9152 16.1287 7.99813 15.5648 8.21494L11.1521 9.91152C11.0436 9.95325 10.9225 9.94772 10.8182 9.89627L4.53465 6.79616C4.43036 6.74471 4.30932 6.73918 4.20077 6.78091L3.07761 7.21274C2.78333 7.32588 2.71647 7.71222 2.9556 7.91769L6.90545 11.3113C6.99503 11.3883 6.97834 11.5315 6.87345 11.5858L3.84524 13.1535C3.78323 13.1856 3.70779 13.1756 3.65623 13.1285L1.86829 11.4957C1.75175 11.3892 1.58509 11.3578 1.43778 11.4144L1.28923 11.4715C1.07444 11.5541 0.967261 11.7952 1.04984 12.01L3.44227 18.2326C3.52485 18.4474 3.76592 18.5545 3.98071 18.472L4.12926 18.4148C4.27657 18.3582 4.37924 18.2232 4.39446 18.0661L4.62799 15.6561C4.63473 15.5866 4.68407 15.5286 4.75161 15.5109L8.0501 14.6462C8.16435 14.6162 8.27264 14.7113 8.25769 14.8285L7.59868 19.9941C7.55878 20.3069 7.86724 20.5489 8.16152 20.4358L9.28468 20.0039C9.39323 19.9622 9.47939 19.877 9.52235 19.7689Z"
      fill="currentColor"
    />
  </svg>
);

export const LineArrowDownIcon: React.FC<P> = ({ size = 24, color, className }) => (
  <svg viewBox="0 0 24 24" fill="none" style={base(size, color)} className={className} aria-hidden="true">
    <path d="M12 3.99994L12 20.0001M12 20.0001L18 13.9999M12 20.0001L6 13.9999" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const LineArrowUpIcon: React.FC<P> = ({ size = 24, color, className }) => (
  <svg viewBox="0 0 24 24" fill="none" style={base(size, color)} className={className} aria-hidden="true">
    <path d="M12 20L12 3.99988M12 3.99988L6 9.99999M12 3.99988L18 9.99999" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const RecommendedIcon: React.FC<P> = ({ size = 24, color, className }) => (
  <svg viewBox="0 0 24 24" fill="none" style={base(size, color)} className={className} aria-hidden="true">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12.9011 3.66543C12.3469 3.33289 11.6546 3.33288 11.1004 3.66538L3.04352 8.49921C1.91064 9.1789 1.91062 10.8207 3.04348 11.5005L4.07956 12.1221L3.29476 12.5144C2.05946 13.1318 1.99261 14.8698 3.17681 15.5803L11.1 20.3343C11.6542 20.6668 12.3465 20.6668 12.9007 20.3343L20.8238 15.5804C22.0081 14.8699 21.9411 13.1318 20.7058 12.5144L19.9208 12.1221L20.9569 11.5004C22.0897 10.8207 22.0898 9.17893 20.957 8.49921L12.9011 3.66543ZM11.8721 4.95164C11.9512 4.90414 12.0502 4.90414 12.1293 4.95165L20.1852 9.78543C20.347 9.88253 20.347 10.1171 20.1852 10.2142L12.1288 15.048C12.0496 15.0955 11.9507 15.0955 11.8715 15.048L3.81522 10.2142C3.65339 10.1171 3.65339 9.88257 3.81523 9.78547L11.8721 4.95164ZM18.396 13.037L12.9005 16.3342C12.3463 16.6668 11.654 16.6668 11.0998 16.3342L5.60428 13.0369L3.9654 13.8561C3.78893 13.9443 3.77938 14.1926 3.94855 14.2941L11.8717 19.048C11.9509 19.0955 12.0498 19.0955 12.129 19.048L20.0521 14.2942C20.2212 14.1927 20.2117 13.9444 20.0352 13.8562L18.396 13.037Z"
      fill="currentColor"
    />
  </svg>
);

/** Упрощённая «пустой город» (UI/icons/emptyCity) — контур домов. */
export const EmptyCityIcon: React.FC<P> = ({ size = 62, color, className }) => (
  <svg viewBox="0 0 62 51" fill="none" style={{ ...base(size, color), height: size * (51 / 62) }} className={className} aria-hidden="true">
    <path d="M2 49H60" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M8 49V21L18 13L28 21V49" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M34 49V9H52V49" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M40 16H46M40 24H46M40 32H46M40 40H46" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M15 30H21M15 38H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M43 2V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const ChevronRightIcon: React.FC<P> = ({ size = 24, color, className }) => (
  <svg viewBox="0 0 24 24" fill="none" style={base(size, color)} className={className} aria-hidden="true">
    <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
