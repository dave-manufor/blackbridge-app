import * as React from 'react';
import { pixelBasedPreset, Tailwind } from '@react-email/components';

const BrandStyles = ({ children }: { children: React.ReactNode }) => {
  return (
    <Tailwind
      config={{
        presets: [pixelBasedPreset],
        theme: {
          fontFamily: {
            sans: ['Inter', 'sans-serif'],
          },
          extend: {
            colors: {
              primary: '#171717',
            },
          },
        },
      }}
    >
      {children}
    </Tailwind>
  );
};

export default BrandStyles;
