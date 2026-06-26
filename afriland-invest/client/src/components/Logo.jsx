import React from 'react';

export default function Logo({ size = 'md', style }) {
  const heights = { sm: 36, md: 52, lg: 70 };
  const h = heights[size] || heights.md;
  return (
    <img
      src="/payfast-logo.png"
      alt="PayFast"
      style={{ height: h, width: 'auto', objectFit: 'contain', display: 'block', ...style }}
    />
  );
}
