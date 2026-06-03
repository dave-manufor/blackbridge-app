import React from 'react';
import { GenericContentWrapper, StyledButton } from './shared';
import { Container, Heading, Section, Text } from '@react-email/components';
import { formatFileSize } from '../../utils/format';

type NewTransferEmailTemplateProps = {
  session_id: string;
  sender_email: string;
  description?: string;
  files: Array<{
    name: string;
    size: number;
  }>;
  url: string;
};

const NewPeerTransferEmailTemplate = (payload: NewTransferEmailTemplateProps) => {
  const totalFiles = payload.files?.length;
  const totalSize = payload.files?.reduce((acc, file) => acc + file.size, 0);
  return (
    <GenericContentWrapper preview={`${payload.sender_email} is ready to share ${totalFiles} file${totalFiles === 1 ? '' : 's'} with you`}>
      <Container>
        <Section className="text-center">
          <Heading as="h2">
            {payload.sender_email} is ready to share {totalFiles} file{totalFiles === 1 ? '' : 's'} with you
          </Heading>
          <Text className="-mt-2 text-neutral-400">
            {totalFiles} item{totalFiles === 1 ? '' : 's'}, {formatFileSize(totalSize)} in total
          </Text>
          <StyledButton href={payload.url} className="my-8">
            Accept Files
          </StyledButton>
        </Section>
        <Container>
          {payload.description && (
            <>
              <Heading as="h3">Description</Heading>
              <Text className="mt-2">{payload.description}</Text>
            </>
          )}
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

export default NewPeerTransferEmailTemplate;
