import React from 'react';
import StyledBody from './StyledBody';
import Header from './Header';
import BrandStyles from './BrandStyles';
import Footer from './Footer';
import { Html, Head, Preview, Container } from '@react-email/components';

const GenericContentWrapper = ({ preview, children }: { preview?: string; children: React.ReactNode }) => {
  return (
    <BrandStyles>
      <Html>
        <Head />
        {preview && <Preview>{preview}</Preview>}
        <StyledBody>
          <Header />
          <Container className="px-6">{children}</Container>
          <Footer />
        </StyledBody>
      </Html>
    </BrandStyles>
  );
};

export default GenericContentWrapper;
