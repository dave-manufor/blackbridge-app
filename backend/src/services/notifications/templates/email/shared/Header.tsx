import React from 'react';
import { Section, Container, Img } from '@react-email/components';
import { LogoBanner } from '../static';

const Header = () => {
  return (
    <Section className="bg-primary mb-8 py-8 text-center">
      <Img src={LogoBanner} alt="Logo" className="max-w-[240px] m-auto" />
    </Section>
  );
};

export default Header;
