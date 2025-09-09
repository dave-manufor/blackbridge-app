import { Resend } from 'resend';
import emailConfig from './config';
import {
  AccessGrantedEmailTemplate,
  InviteAcceptedEmailTemplate,
  NewInviteEmailTemplate,
  NewTransferEmailTemplate,
  OtpEmailTemplate,
  SignInEmailTemplate,
  WelcomeEmailTemplate,
} from './templates/email';

const resend = new Resend(emailConfig.RESEND_API_KEY);

const notificationService = {
  send_otp_notification: async (email: string, otp: string, expiresInMills: number) => {
    await resend.emails.send({
      from: `BlackBridge <${emailConfig.DEFAULT_FROM_EMAIL}>`,
      to: email,
      subject: "Here's your verification code",
      react: OtpEmailTemplate({ email, otp, expiresInMills }),
    });
  },
  send_welcome_notification: async (email: string) => {
    await resend.emails.send({
      from: `BlackBridge <${emailConfig.DEFAULT_FROM_EMAIL}>`,
      to: email,
      subject: 'Welcome to BlackBridge 🚀 — from our Founder',
      react: WelcomeEmailTemplate({ email }),
    });
  },
  send_signin_notification: async (
    email: string,
    sessionDetails: {
      ipAddress: string;
      platform: string;
      device: 'mobile' | 'desktop' | 'tablet' | 'unknown';
      time: Date;
    },
  ) => {
    await resend.emails.send({
      from: `BlackBridge <${emailConfig.DEFAULT_FROM_EMAIL}>`,
      to: email,
      subject: 'New sign-in to your BlackBridge account',
      react: SignInEmailTemplate({ email, sessionDetails }),
    });
  },
  send_transfer_success_notification: async (email: string, transferDetails: any) => {
    // Implementation for sending transfer success notification to sender
  },
  send_new_transfer_notification: async (
    recipients: string[],
    transferDetails: {
      title?: string;
      sender_email: string;
      files: Array<{
        name: string;
        size: number;
      }>;
      expires_at: Date;
    },
  ) => {
    await resend.batch.send(
      recipients.map((email) => ({
        from: `BlackBridge <${emailConfig.DEFAULT_FROM_EMAIL}>`,
        to: email,
        subject: 'New File Transfer Notification',
        react: NewTransferEmailTemplate(transferDetails),
      })),
    );
  },
  send_invite_notification: async (
    recipients: string[],
    transferDetails: {
      title?: string;
      sender_email: string;
      files: Array<{
        name: string;
        size: number;
      }>;
      expires_at: Date;
    },
    inviteToken: string,
  ) => {
    await resend.batch.send(
      recipients.map((email) => ({
        from: `BlackBridge <${emailConfig.DEFAULT_FROM_EMAIL}>`,
        to: email,
        subject: 'You have been invited to join BlackBridge',
        react: NewInviteEmailTemplate(),
      })),
    );
  },
  send_invite_accepted_notification: async (
    email: string,
    inviteDetails: {
      recipient_email: string;
      transfer_title: string;
    },
    acceptanceToken: string,
  ) => {
    await resend.emails.send({
      from: `BlackBridge <${emailConfig.DEFAULT_FROM_EMAIL}>`,
      to: email,
      subject: 'Your invitation has been accepted',
      react: InviteAcceptedEmailTemplate(),
    });
  },
  send_access_granted_notification: async (
    email: string,
    transferDetails: {
      transfer_id: string;
      transfer_title?: string;
      granted_by: string;
      expires_at: Date;
    },
  ) => {
    await resend.emails.send({
      from: `BlackBridge <${emailConfig.DEFAULT_FROM_EMAIL}>`,
      to: email,
      subject: 'Access Granted to BlackBridge',
      react: AccessGrantedEmailTemplate(),
    });
  },
};

export default notificationService;
