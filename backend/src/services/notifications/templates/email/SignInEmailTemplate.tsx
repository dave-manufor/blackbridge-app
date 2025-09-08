import React from 'react';
import { GenericContentWrapper, StyledButton } from './shared';
import { Container, Heading, Img, Text } from '@react-email/components';
import { LaptopIcon, PhoneIcon, TabletIcon, LoginIcon } from './static';
import notificationConfig from 'services/notifications/config';
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
};

const deviceIconMap = {
  mobile: PhoneIcon,
  tablet: TabletIcon,
  desktop: LaptopIcon,
  unknown: LoginIcon,
} as Record<Devices, string>;

const baseUrl = notificationConfig.BASE_URL;

const SignInEmailTemplate = (payload: Props) => {
  return (
    <GenericContentWrapper preview="We noticed a new sign-in to your account. Here are the details.">
      <Text>
        Hi <strong>{'davemanufor@gmail.com'}</strong>,
      </Text>
      <Text>We noticed a new sign-in to your BlackBridge account. If this was you, no action is needed.</Text>
      <Heading as="h4" className="mt-6">
        Sign-in Details
      </Heading>
      <Container>
        <div className="mt-2 mb-8">
          <div className="mr-[32px] inline-flex items-start">
            <Img src={deviceIconMap['tablet']} className="h-[48px]" />
            <table style={{ borderCollapse: 'separate', borderSpacing: '20px 8px', marginTop: -12 }}>
              <tbody>
                <Detail title="Platform" value={'Windows'} />
                <Detail
                  title="Time"
                  value={`${formatInTimeZone(Date.now(), 'UTC', 'eeee, MMMM d, yyyy', {})} at ${formatInTimeZone(Date.now(), 'UTC', 'h:mm a z')}`}
                />
                <Detail title="IP Address" value={'10.26.66.66'} />
              </tbody>
            </table>
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
        <StyledButton href={baseUrl} className="my-4">
          Go to BlackBridge
        </StyledButton>
      </div>
    </GenericContentWrapper>
  );
};

const Detail = ({ title, value }: { title: string; value: string }) => (
  <tr>
    <td>
      <DetailTitle>{title}</DetailTitle>
    </td>
    <td>
      <DetailValue>{value}</DetailValue>
    </td>
  </tr>
);

const DetailTitle = ({ children }: { children: React.ReactNode }) => <span className="font-bold text-sm">{children}:</span>;

const DetailValue = ({ children }: { children: React.ReactNode }) => <span className="text-sm">{children}</span>;

export default SignInEmailTemplate;
