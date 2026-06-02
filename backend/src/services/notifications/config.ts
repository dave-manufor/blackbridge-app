const notificationConfig = {
  DEFAULT_FROM_EMAIL: (process.env.DEFAULT_FROM_EMAIL as string) || 'no-reply@example.com',
  SUPPORT_EMAIL: (process.env.SUPPORT_EMAIL as string) || 'support@example.com',
  BASE_URL: (process.env.BASE_APP_URL as string) || 'https://localhost:5174',
  RESEND_API_KEY: (process.env.RESEND_API_KEY as string) || 'your-default-api-key',
  EMAIL_PROVIDER: (process.env.EMAIL_PROVIDER as 'resend' | 'smtp') || 'resend',
  SMTP_HOST: (process.env.SMTP_HOST as string) || 'smtp.gmail.com',
  SMTP_PORT: Number(process.env.SMTP_PORT) || 465,
  SMTP_USER: (process.env.SMTP_USER as string) || '',
  SMTP_PASS: (process.env.SMTP_PASS as string) || '',
};

export default notificationConfig;
