import React from 'react';
import { Section, Container, Img } from '@react-email/components';
import notificationConfig from 'services/notifications/config';

const baseUrl = notificationConfig.BASE_URL;

const Header = () => {
  return (
    <Section className="bg-primary mb-8">
      <Container className="flex items-center justify-center py-8">
        <Img src={`${baseUrl}/public/img/blackbridge-banner.png`} alt="Logo" className="max-w-[240px]" />
      </Container>
    </Section>
  );
};

export default Header;
