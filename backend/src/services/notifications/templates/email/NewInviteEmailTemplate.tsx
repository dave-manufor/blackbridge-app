import React from 'react';
import { Detail, Details, GenericContentWrapper, StyledButton } from './shared';
import { Container, Heading, Section, Text } from '@react-email/components';
import { formatFileSize } from '../../utils/format';
import { formatInTimeZone } from 'date-fns-tz';

type Props = {
  email: string;
  inviteToken: string;
  transferDetails: {
    title?: string;
    sender_email: string;
    files: Array<{
      name: string;
      size: number;
    }>;
    expires_at: Date;
  };
  url: string;
};

const NewInviteEmailTemplate = (payload: Props) => {
  const senderMailboxName = payload.transferDetails?.sender_email.split('@')[0];
  return (
    <GenericContentWrapper
      preview={`${payload.transferDetails?.sender_email} has sent you a secure file. Create your BlackBridge account to access it.`}
    >
      <Text>
        Hi <strong>{payload.email}</strong>,
      </Text>
      <Container>
        <Text>
          <strong>{senderMailboxName}</strong> has shared a secure file transfer with you via <strong>BlackBridge</strong>. To access it, you'll need
          to create a free account.
        </Text>
        <Container>
          <Heading as="h3">Transfer Details</Heading>
          <Details>
            {payload.transferDetails?.title && <Detail title="Transfer Name" value={payload.transferDetails.title} />}
            <Detail title="From" value={payload.transferDetails?.sender_email} />
            <Detail title="Expires At" value={formatInTimeZone(payload.transferDetails?.expires_at, 'UTC', 'MMMM do, yyyy h:mm a z')} />
          </Details>
        </Container>
        <Section className="text-center my-4">
          <StyledButton href={payload.url} className="text-center">
            Accept Invite & Create Account
          </StyledButton>
        </Section>
      </Container>
      <Text>Your files are protected with end-to-end encryption, so only you (and the sender) can access them.</Text>
      <Container className="mt-6">
        <Heading as="h3">Files</Heading>
        <Container>
          {payload.transferDetails?.files.map((file, index) => (
            <Text className="font-medium text-[16px] text-wrap m-0 mb-4" key={index}>
              {file.name}
              <br />
              <span className="text-neutral-400 text-xs">{formatFileSize(file.size)}</span>
            </Text>
          ))}
        </Container>
      </Container>
      <Text>
        Stay secure,
        <br />
        <strong>The BlackBridge Team</strong>
      </Text>
    </GenericContentWrapper>
  );
};

export default NewInviteEmailTemplate;
