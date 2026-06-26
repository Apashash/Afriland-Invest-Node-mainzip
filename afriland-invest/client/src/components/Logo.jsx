import React from 'react';

export default function Logo({ size = 'md', style }) {
  const heights = { sm: 28, md: 40, lg: 56 };
  const h = heights[size] || heights.md;
  return (
    <img
      src="/payfast-logo.png"
      alt="PayFast"
      style={{ height: h, width: 'auto', objectFit: 'contain', display: 'block', ...style }}
    />
  );
}
