import React from 'react';

const Details = ({ style, className, children }: { style?: React.CSSProperties; className?: string; children: React.ReactNode }) => {
  return (
    <table style={{ borderCollapse: 'separate', borderSpacing: '20px 8px', ...style }} className={className ? className : ''}>
      <tbody>{children}</tbody>
    </table>
  );
};

export default Details;
