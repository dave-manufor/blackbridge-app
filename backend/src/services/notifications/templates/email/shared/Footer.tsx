import React from 'react';
import { Section, Text, Link, Hr } from '@react-email/components';
import notificationConfig from '../../../config';
const supportEmail = notificationConfig.SUPPORT_EMAIL;

const Footer = () => {
  return (
    <Section className="bg-primary text-neutral-200 px-4 mt-8">
      <Text className="text-center text-xs">
        If you have any questions, feel free to send an email to <Link href={`mailto:${supportEmail}`}>{supportEmail}</Link>
      </Text>
      <Hr className="max-w-[240px] mx-auto my-4 border-neutral-200" />
      <Text className="text-center text-xs">
        © {new Date().getFullYear()} Blackbridge. All rights reserved.
        <br />
        Easy, Secure File Transfers
      </Text>
    </Section>
  );
};

export default Footer;
