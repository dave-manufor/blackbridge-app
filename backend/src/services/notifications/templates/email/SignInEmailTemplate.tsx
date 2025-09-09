import React from 'react';
import { Detail, Details, GenericContentWrapper, StyledButton } from './shared';
import { Container, Heading, Img, Text } from '@react-email/components';
import { LaptopIcon, PhoneIcon, TabletIcon, LoginIcon } from './static';
import { formatInTimeZone } from 'date-fns-tz';

type Devices = 'mobile' | 'tablet' | 'desktop' | 'unknown';

type Props = {
  email: string;
  sessionDetails: {
    ipAddress: string;
    platform: string;
    device: Devices;
    time: Date;
  };
  url: string;
};

const deviceIconMap = {
  mobile: PhoneIcon,
  tablet: TabletIcon,
  desktop: LaptopIcon,
  unknown: LoginIcon,
} as Record<Devices, string>;

const SignInEmailTemplate = (payload: Props) => {
  return (
    <GenericContentWrapper preview="We noticed a new sign-in to your account. Here are the details.">
      <Text>
        Hi <strong>{payload.email}</strong>,
      </Text>
      <Text>We noticed a new sign-in to your BlackBridge account. If this was you, no action is needed.</Text>
      <Heading as="h4" className="mt-6">
        Sign-in Details
      </Heading>
      <Container>
        <div className="mt-2 mb-8">
          <div className="mr-[32px] inline-flex items-start">
            <Img src={deviceIconMap[payload.sessionDetails?.device]} className="h-[48px]" />
            <Details style={{ marginTop: -12 }}>
              <Detail title="Platform" value={payload.sessionDetails?.platform} />
              <Detail
                title="Time"
                value={`${formatInTimeZone(payload.sessionDetails?.time, 'UTC', 'eeee, MMMM d, yyyy', {})} at ${formatInTimeZone(payload.sessionDetails?.time, 'UTC', 'h:mm a z')}`}
              />
              <Detail title="IP Address" value={payload.sessionDetails?.ipAddress} />
            </Details>
          </div>
        </div>
      </Container>
      <Heading as="h5" className="mt-6">
        Don&apos;t recognize this activity?
      </Heading>
      <Text>1. Change your password immediately.</Text>
      <Text>3. Review your account activity.</Text>
      <Text>4. Contact our support team if you see anything unusual.</Text>
      <div className="w-full flex items-center justify-center">
        <StyledButton href={payload.url} className="my-4">
          Go to BlackBridge
        </StyledButton>
      </div>
    </GenericContentWrapper>
  );
};

export default SignInEmailTemplate;
