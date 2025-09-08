import React from 'react';
import { Section, Container, Img } from '@react-email/components';
import { LogoBanner } from '../static';

const Header = () => {
  return (
    <Section className="bg-primary mb-8">
      <Container className="flex items-center justify-center py-8">
        <Img src={LogoBanner} alt="Logo" className="max-w-[240px]" />
      </Container>
    </Section>
  );
};

export default Header;
