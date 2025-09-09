import React from 'react';
import { GenericContentWrapper, StyledButton } from './shared';
import { Section, Text } from '@react-email/components';

type Props = {
  email: string;
  transferDetails: {
    transfer_id: string;
    transfer_title?: string;
    granted_by: string;
    expires_at: Date;
  };
  url: string;
};

const AccessGrantedEmailTemplate = (payload: Props) => {
  return (
    <GenericContentWrapper preview={`You can now securely view the transfer sent by ${payload.transferDetails?.granted_by}`}>
      <Text>
        Hi, <strong>{payload.email}</strong>,
      </Text>
      <Text>
        Good news — {payload.transferDetails?.granted_by} has approved your access to{' '}
        {payload.transferDetails?.transfer_title ? payload.transferDetails.transfer_title : 'the transfer'}. You can now securely view it.
      </Text>
      <Section className="text-center my-6">
        <StyledButton href={payload.url}>View Transfer</StyledButton>
      </Section>
      <Text>
        Enjoy your secure transfer,
        <br />
        <strong>The BlackBridge Team</strong>
      </Text>
    </GenericContentWrapper>
  );
};

export default AccessGrantedEmailTemplate;
