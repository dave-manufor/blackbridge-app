import React from 'react';
import { GenericContentWrapper } from './shared';
import { Heading, Link, Text } from '@react-email/components';

const WelcomeEmailTemplate = ({ email, url }: { email: string; url: string }) => {
  return (
    <GenericContentWrapper preview="Start sending files safely with end-to-end encryption.">
      <Text>Hi {email},</Text>
      <Text>
        I&apos;m David, the founder of <strong>BlackBridge</strong>. First off, welcome! 🎉 I&apos;m truly glad you&apos;re here.
      </Text>
      <Text>
        I started BlackBridge with one simple goal: to make file sharing private, seamless, and trustworthy. No friction, no worries about who&apos;s
        looking at your data—just fast, secure transfers you can rely on.
      </Text>
      <Text>Here&apos;s what you can expect:</Text>
      {[
        {
          number: 1,
          title: 'Private by design',
          description:
            'Your files are protected with end-to-end encryption. That means only you and the people you share with can ever see them—never us.',
        },
        {
          number: 2,
          title: 'Speed without the hassle',
          description: 'Share files of any size quickly and reliably, without complicated steps or roadblocks.',
        },
        {
          number: 3,
          title: 'Full control, always',
          description: 'You decide who has access, for how long, and under what conditions. Your data stays yours.',
        },
      ].map((feature, index) => (
        <div key={index} className="my-8">
          <div className="mr-[32px] ml-[12px] inline-flex items-start">
            <div
              className="flex items-center justify-center !max-h-[24px] !max-w-[24px] !min-h-[24px] !min-w-[24px] rounded-lg bg-primary text-white font-bold text-[12px] mr-[18px]"
              style={{
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span className="mx-auto my-auto">{feature.number}</span>
            </div>
            <div className="-mt-0.5">
              <Heading as="h2" className="mt-[0px] mb-[8px] text-gray-900 text-[16px] leading-[28px]">
                {feature.title}
              </Heading>
              <Text className="m-0 text-gray-500 text-[14px] leading-[24px]">{feature.description}</Text>
            </div>
          </div>
        </div>
      ))}
      <Text>
        <Link href={url}>
          <strong>Log in</strong>
        </Link>{' '}
        now and try your first secure transfer, it only takes a few seconds.
      </Text>
      <Text>
        Thank you for trusting us with your files. I&apos;m excited to see how BlackBridge helps make your workflow smoother and safer. If you ever
        have feedback or ideas, I&apos;d love to hear from you.
      </Text>
    </GenericContentWrapper>
  );
};

export default WelcomeEmailTemplate;
