import logger from '../lib/logger';
import { Resend } from 'resend';

// Only instantiate if the key exists to prevent crash on module load in environments without Resend (e.g., SMTP override)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const getEnrolledTesters = async (): Promise<string[]> => {
  if (!resend) return [];
  
  if (!process.env.RESEND_BETA_TESTERS_AUDIENCE_ID) {
    logger.warn('No Resend Beta Testers Audience ID configured');
    return [];
  }
  try {
    const {
      data: { data: testers },
      error,
    } = await resend.contacts.list({
      audienceId: process.env.RESEND_BETA_TESTERS_AUDIENCE_ID,
    });
    if (error) {
      logger.error('Error fetching Resend Beta Testers:', error);
      return [];
    }
    return testers.map((tester) => tester.email);
  } catch (err) {
    logger.error('Error fetching Resend Beta Testers:', err);
    return [];
  }
};

export const isEnrolledTester = async (email: string): Promise<boolean> => {
  const testers = await getEnrolledTesters();
  return testers.includes(email);
};

export default resend;
