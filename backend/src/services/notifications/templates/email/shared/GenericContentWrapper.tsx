import React from 'react';
import StyledBody from './StyledBody';
import Header from './Header';
import BrandStyles from './BrandStyles';
import Footer from './Footer';
import { Html, Head, Preview } from '@react-email/components';

const GenericContentWrapper = ({ preview, children }: { preview?: string; children: React.ReactNode }) => {
  return (
    <BrandStyles>
      <Html>
        <Head />
        {preview && <Preview>{preview}</Preview>}
        <StyledBody>
          <Header />
          {children}
          <Footer />
        </StyledBody>
      </Html>
    </BrandStyles>
  );
};

export default GenericContentWrapper;
