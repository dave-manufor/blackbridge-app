import React from 'react';
import { GenericContentWrapper, StyledButton } from './shared';
import { Container, Heading, Section, Text } from '@react-email/components';
import { formatFileSize } from '../../utils/format';
import { format as formatDate } from 'date-fns';

type NewTransferEmailTemplateProps = {
  title?: string;
  sender_email: string;
  files: Array<{
    name: string;
    size: number;
  }>;
  expires_at: Date;
  url: string;
};

const NewTransferEmailTemplate = (payload: NewTransferEmailTemplateProps) => {
  const totalFiles = payload.files?.length;
  const totalSize = payload.files?.reduce((acc, file) => acc + file.size, 0);
  const prettyExpiresAt = formatDate(payload.expires_at ?? new Date(), 'MMMM do, yyyy');
  return (
    <GenericContentWrapper preview={`${payload.sender_email} just sent you ${totalFiles} file${totalFiles === 1 ? '' : 's'}`}>
      <Container>
        <Section className="text-center">
          <Heading as="h2">
            {payload.sender_email} just shared {payload.title ? `"${payload.title}"` : 'some files'} with you
          </Heading>
          <Text className="-mt-2 text-neutral-400">
            {totalFiles} item{totalFiles === 1 ? '' : 's'}, {formatFileSize(totalSize)} in total | Expires on {prettyExpiresAt}
          </Text>
          <StyledButton href={payload.url} className="my-8">
            View your files
          </StyledButton>
        </Section>
        <Container>
          <Heading as="h3">Files</Heading>
          <Container>
            {payload.files?.map((file, index) => (
              <Text className="font-medium text-[16px] text-wrap m-0 mb-4" key={index}>
                {file.name}
                <br />
                <span className="text-neutral-400 text-xs">{formatFileSize(file.size)}</span>
              </Text>
            ))}
          </Container>
        </Container>
      </Container>
    </GenericContentWrapper>
  );
};

export default NewTransferEmailTemplate;
