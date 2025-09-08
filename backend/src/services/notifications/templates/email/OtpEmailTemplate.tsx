import React from 'react';
import { Container, Heading, Section, Text } from '@react-email/components';
import { GenericContentWrapper } from './shared';

type Props = {
  email: string;
  otp: string;
  expiresInMills: number;
};

const OtpEmailTemplate = ({ email, otp, expiresInMills }: Props) => {
  const expiresInMinutes = Math.floor(expiresInMills / 60000);
  return (
    <GenericContentWrapper preview={`Verify your identity. Your One-Time Password (OTP) is ${otp}`}>
      <Section className="w-full px-4 text-center">
        <Heading as="h3">Here's your One-Time Password (OTP)</Heading>
        <Text>
          Hi, {email}
          <br />
          We just need to verify it&apos;s really you. Use the code below to continue:
        </Text>
        <Container className="bg-neutral-100 p-2 rounded-md">
          <Text className="text-2xl font-bold tracking-[0.2em]">{otp}</Text>
        </Container>
        <Text className="">This OTP is valid for {`${expiresInMinutes} minute${expiresInMinutes > 1 ? 's' : ''}`}</Text>
        <Text className="text-neutral-400">
          If you didn&apos;t request this, we strongly recommend you change your password to secure your account.
        </Text>
      </Section>
    </GenericContentWrapper>
  );
};

export default OtpEmailTemplate;
