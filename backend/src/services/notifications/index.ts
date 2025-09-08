import { Resend } from 'resend';
import emailConfig from './config';
import { NewTransferEmailTemplate, OtpEmailTemplate, SignInEmailTemplate, WelcomeEmailTemplate } from './templates/email';

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
  send_password_reset_notification: async (email: string, resetLink: string) => {
    // Implementation for sending password reset notification
  },
};

export default notificationService;
