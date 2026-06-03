import logger from '../lib/logger';

export const runBackgroundTask = async (
  task: Promise<any>,
  customLogger: typeof logger = logger,
  errorMessage = 'Error executing background task'
) => {
  // Check if we are running in a serverless environment (e.g. Vercel)
  const isServerless = process.env.VERCEL === '1' || process.env.SERVERLESS === 'true';

  if (isServerless) {
    // Await the task so Vercel doesn't kill the execution context before it finishes
    await task.catch((error) => {
      customLogger.warn(error, errorMessage);
    });
  } else {
    // Fire and forget in traditional server environments for faster HTTP responses
    task.catch((error) => {
      customLogger.warn(error, errorMessage);
    });
  }
};
