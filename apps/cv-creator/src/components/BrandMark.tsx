import React from 'react';

// Marca de CV Express: un documento/currículum (no un trofeo genérico) con la línea
// del nombre en ámbar como chispa de identidad. Decorativa (aria-hidden); siempre
// va acompañada del wordmark visible "CV Express".
export const BrandMark: React.FC<{ className?: string }> = ({ className = 'w-10 h-10' }) => (
  <svg
    viewBox="0 0 40 40"
    className={className}
    fill="none"
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="40" height="40" rx="11" fill="#4f46e5" />
    <rect x="11" y="8.5" width="18" height="23" rx="3" fill="#ffffff" />
    {/* línea del nombre, en ámbar (acento de apoyo) */}
    <rect x="14.5" y="12.8" width="7.6" height="2.5" rx="1.25" fill="#f59e0b" />
    <rect x="14.5" y="17.8" width="11" height="1.9" rx="0.95" fill="#c7d2fe" />
    <rect x="14.5" y="21.5" width="11" height="1.9" rx="0.95" fill="#c7d2fe" />
    <rect x="14.5" y="25.2" width="7.5" height="1.9" rx="0.95" fill="#c7d2fe" />
  </svg>
);
