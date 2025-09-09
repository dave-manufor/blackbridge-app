import React from 'react';
import { GenericContentWrapper, StyledButton } from './shared';
import { Container, Section, Text } from '@react-email/components';

type Props = {
  email: string;
  inviteDetails: {
    recipient_email: string;
    transfer_title: string;
  };
  url: string;
};

const InviteAcceptedEmailTemplate = (payload: Props) => {
  return (
    <GenericContentWrapper preview="Approve their access to your transfer by logging in.">
      <Container>
        <Text>
          Hi <strong>{payload.email},</strong>
        </Text>
        <Text>
          <strong>{payload.inviteDetails?.recipient_email}</strong> has accepted your invite to access{' '}
          <strong>{payload.inviteDetails?.transfer_title}</strong>. For security reasons, they can't access the files until you approve.
        </Text>
        <Section className="text-center my-6">
          <StyledButton href={payload.url}>Approve Access</StyledButton>
        </Section>
        <Text>Once you approve, the files will be unlocked for them.</Text>
      </Container>
      <Text className="mt-6">
        Stay Secure,
        <br />
        <strong>The Blackbridge Team</strong>
      </Text>
    </GenericContentWrapper>
  );
};

export default InviteAcceptedEmailTemplate;
