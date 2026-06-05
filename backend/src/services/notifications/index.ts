import { Resend } from 'resend';
import { BrevoClient } from '@getbrevo/brevo';
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

const brevo = notificationConfig.BREVO_API_KEY
  ? new BrevoClient({ apiKey: notificationConfig.BREVO_API_KEY })
  : null;

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
      connectionTimeout: 10000,
    })
  : null;

/**
 * Parse a "Name <email>" formatted string into { name, email }
 */
const parseSender = (from: string): { name?: string; email: string } => {
  const match = from.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return { email: from.trim() };
};

const sendEmail = async (options: { from: string; to: string; subject: string; react: any }) => {
  console.log(`[EmailService] Attempting to send email to ${options.to}. Provider: ${notificationConfig.EMAIL_PROVIDER}`);
  
  try {
    if (notificationConfig.EMAIL_PROVIDER === 'brevo') {
      if (!brevo) {
        throw new Error('Email provider is set to brevo but BREVO_API_KEY is missing');
      }
      console.log(`[EmailService] Rendering React email template...`);
      const html = await render(options.react);
      const sender = parseSender(options.from);
      console.log(`[EmailService] Sending via Brevo HTTP API...`);
      const response = await brevo.transactionalEmails.sendTransacEmail({
        sender: { email: sender.email, name: sender.name },
        to: [{ email: options.to }],
        subject: options.subject,
        htmlContent: html,
      });
      console.log(`[EmailService] Email sent via Brevo:`, response);
    } else if (notificationConfig.EMAIL_PROVIDER === 'smtp' && transporter) {
      console.log(`[EmailService] Rendering React email template...`);
      const html = await render(options.react);
      console.log(`[EmailService] Sending via SMTP...`);
      const info = await transporter.sendMail({
        from: options.from,
        to: options.to,
        subject: options.subject,
        html: html,
      });
      console.log(`[EmailService] Email sent successfully: ${info.messageId}`);
    } else {
      if (!resend) {
        throw new Error('Email provider is set to resend but RESEND_API_KEY is missing');
      }
      console.log(`[EmailService] Sending via Resend...`);
      const data = await resend.emails.send({
        from: options.from,
        to: options.to,
        subject: options.subject,
        react: options.react,
      });
      console.log(`[EmailService] Email sent via Resend: `, data);
    }
  } catch (error) {
    console.error(`[EmailService] FATAL ERROR sending email to ${options.to}:`, error);
    throw error;
  }
};

const sendBatchEmail = async (optionsArray: { from: string; to: string; subject: string; react: any }[]) => {
  if (notificationConfig.EMAIL_PROVIDER === 'brevo') {
    // Brevo doesn't have a native batch endpoint for different content per recipient,
    // so we send them individually via Promise.all
    await Promise.all(optionsArray.map((options) => sendEmail(options)));
  } else if (notificationConfig.EMAIL_PROVIDER === 'smtp' && transporter) {
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
          subject: 'You\u2019ve been invited to access a secure transfer on BlackBridge',
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
    await sendEmail({
      from: `BlackBridge <${notificationConfig.DEFAULT_FROM_EMAIL}>`,
      to: email,
      subject: `${transferDetails.sender_email} wants to start a peer transfer with you`,
      react: NewPeerTransferEmailTemplate({ ...transferDetails, url }),
    });
  },
};

export default notificationService;
