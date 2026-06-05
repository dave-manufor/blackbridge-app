import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'cd ../backend && npm run dev',
      port: 4000,
      reuseExistingServer: !process.env.CI,
      env: {
        DATABASE_URL: 'postgresql://test_user:test_password@localhost:5433/test_db?schema=public',
        REDIS_URL: 'redis://localhost:6380',
        PORT: '4000',
        JWT_SECRET: 'test_jwt_secret',
        CORS_ORIGIN: 'http://localhost:5174',
        AWS_ACCESS_KEY_ID: 'test',
        AWS_SECRET_ACCESS_KEY: 'test',
        AWS_REGION: 'us-east-1',
        S3_BUCKET_NAME: 'test-bucket'
      }
    },
    {
      command: 'cd ../frontend && npm run dev',
      port: 5174,
      reuseExistingServer: !process.env.CI,
      env: {
        VITE_API_URL: 'http://localhost:4000/api'
      }
    }
  ],
});
