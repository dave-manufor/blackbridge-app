import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { render } from '@react-email/components';
import {
  AccessGrantedEmailTemplate,
  InviteAcceptedEmailTemplate,
  NewInviteEmailTemplate,
  NewPeerTransferEmailTemplate,
  NewTransferEmailTemplate,
  OtpEmailTemplate,
  SignInEmailTemplate,
  WelcomeEmailTemplate,
} from './templates/email';
import notificationConfig from './config';
import { getMailboxName } from './utils/format';

const resend = notificationConfig.RESEND_API_KEY ? new Resend(notificationConfig.RESEND_API_KEY) : null;
const baseAppUrl = notificationConfig.BASE_URL;

const transporter = notificationConfig.EMAIL_PROVIDER === 'smtp' 
  ? nodemailer.createTransport({
      host: notificationConfig.SMTP_HOST,
      port: notificationConfig.SMTP_PORT,
      secure: notificationConfig.SMTP_PORT === 465,
      auth: {
        user: notificationConfig.SMTP_USER,
        pass: notificationConfig.SMTP_PASS,
      },
    })
  : null;

const sendEmail = async (options: { from: string; to: string; subject: string; react: any }) => {
  if (notificationConfig.EMAIL_PROVIDER === 'smtp' && transporter) {
    const html = await render(options.react);
    await transporter.sendMail({
      from: options.from,
      to: options.to,
      subject: options.subject,
      html: html,
    });
  } else {
    if (!resend) {
      throw new Error('Email provider is set to resend but RESEND_API_KEY is missing');
    }
    await resend.emails.send({
      from: options.from,
      to: options.to,
      subject: options.subject,
      react: options.react,
    });
  }
};

const sendBatchEmail = async (optionsArray: { from: string; to: string; subject: string; react: any }[]) => {
  if (notificationConfig.EMAIL_PROVIDER === 'smtp' && transporter) {
    await Promise.all(optionsArray.map(async (options) => {
      const html = await render(options.react);
      await transporter.sendMail({
        from: options.from,
        to: options.to,
        subject: options.subject,
        html: html,
      });
    }));
  } else {
    if (!resend) {
      throw new Error('Email provider is set to resend but RESEND_API_KEY is missing');
    }
    await resend.batch.send(optionsArray);
  }
};

const notificationService = {
  send_otp_notification: async (email: string, otp: string, expiresInMills: number) => {
    await sendEmail({
      from: `BlackBridge <${notificationConfig.DEFAULT_FROM_EMAIL}>`,
      to: email,
      subject: "Here's your verification code",
      react: OtpEmailTemplate({ email, otp, expiresInMills }),
    });
  },
  send_welcome_notification: async (email: string) => {
    const url = `${baseAppUrl}/sign-in`;
    await sendEmail({
      from: `BlackBridge <${notificationConfig.DEFAULT_FROM_EMAIL}>`,
      to: email,
      subject: 'Welcome to BlackBridge 🚀 — from our Founder',
      react: WelcomeEmailTemplate({ email, url }),
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
    const url = `${baseAppUrl}/sign-in`;
    await sendEmail({
      from: `BlackBridge <${notificationConfig.DEFAULT_FROM_EMAIL}>`,
      to: email,
      subject: 'New sign-in to your BlackBridge account',
      react: SignInEmailTemplate({ email, sessionDetails, url }),
    });
  },
  send_transfer_success_notification: async (email: string, transferDetails: any) => {
    // Implementation for sending transfer success notification to sender
  },

  send_new_transfer_notification: async (
    recipients: string[],
    transferDetails: {
      id: string;
      title?: string;
      sender_email: string;
      files: Array<{
        name: string;
        size: number;
      }>;
      expires_at: Date;
    },
  ) => {
    const url = `${baseAppUrl}/transfers/${transferDetails.id}`;
    await sendBatchEmail(
      recipients.map((email) => ({
        from: `BlackBridge <${notificationConfig.DEFAULT_FROM_EMAIL}>`,
        to: email,
        subject: 'New File Transfer Notification',
        react: NewTransferEmailTemplate({ ...transferDetails, url }),
      }))
    );
  },
  send_invite_notification: async (
    recipients: {
      email: string;
      inviteToken: string;
    }[],
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
    await sendBatchEmail(
      recipients.map(({ email, inviteToken }) => {
        const url = `${baseAppUrl}?action=acceptInvite&inviteToken=${inviteToken}`;
        return {
          from: `BlackBridge <${notificationConfig.DEFAULT_FROM_EMAIL}>`,
          to: email,
          subject: 'You’ve been invited to access a secure transfer on BlackBridge',
          react: NewInviteEmailTemplate({ email, inviteToken, transferDetails, url }),
        };
      })
    );
  },
  send_invite_accepted_notification: async (
    email: string,
    inviteDetails: {
      recipient_email: string;
      transfer_id: string;
      transfer_title: string;
    },
    acceptanceToken: string,
  ) => {
    const mailboxName = getMailboxName(inviteDetails.recipient_email);
    const url = `${baseAppUrl}?action=authorizeInvite&transfer_id=${inviteDetails.transfer_id}&acceptanceToken=${acceptanceToken}`;
    await sendEmail({
      from: `BlackBridge <${notificationConfig.DEFAULT_FROM_EMAIL}>`,
      to: email,
      subject: `${mailboxName} has accepted your invitation`,
      react: InviteAcceptedEmailTemplate({ email, inviteDetails, url }),
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
    const url = `${baseAppUrl}/transfers/${transferDetails.transfer_id}`;
    await sendEmail({
      from: `BlackBridge <${notificationConfig.DEFAULT_FROM_EMAIL}>`,
      to: email,
      subject: `Your access ${transferDetails.transfer_title ? `to ${transferDetails.transfer_title}` : ''} has been approved`,
      react: AccessGrantedEmailTemplate({ email, transferDetails, url }),
    });
  },

  send_peer_transfer_notification: async (
    email: string,
    transferDetails: {
      session_id: string;
      sender_email: string;
      description?: string;
      files: Array<{
        name: string;
        size: number;
      }>;
    },
  ) => {
    const url = `${baseAppUrl}/peer/${transferDetails.session_id}`;
    await resend.emails.send({
      from: `BlackBridge <${emailConfig.DEFAULT_FROM_EMAIL}>`,
      to: email,
      subject: `${transferDetails.sender_email} wants to start a peer transfer with you`,
      react: NewPeerTransferEmailTemplate({ ...transferDetails, url }),
    });
  },
};

export default notificationService;
