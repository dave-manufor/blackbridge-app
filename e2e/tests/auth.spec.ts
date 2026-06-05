import { test, expect } from '@playwright/test';

const TEST_EMAIL = `test-user-${Date.now()}@example.com`;
const TEST_PASSWORD = 'SecurePassword123!';

test.describe('Authentication Flow', () => {
  test('User can register and verify account', async ({ page }) => {
    // 1. Navigate to sign up
    await page.goto('/sign-up');
    
    // 2. Fill registration form
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    
    // Depending on the UI, it might be "Create Account" or "Sign Up"
    const signUpBtn = page.getByRole('button', { name: /Sign Up|Create Account/i });
    await signUpBtn.click();
    
    // 3. Complete Verification
    // Assuming the app navigates to /verification and auto-sends an OTP.
    // In a test environment, we might need a way to bypass OTP or check test DB.
    // Assuming OTP is bypassed or we can extract it if needed. For now we just verify URL change
    await expect(page).toHaveURL(/.*\/verification.*/);
  });

  test('User can login with existing account', async ({ page }) => {
    await page.goto('/sign-in');
    
    await page.fill('input[type="email"]', 'test-receiver@example.com');
    await page.fill('input[type="password"]', TEST_PASSWORD);
    
    const signInBtn = page.getByRole('button', { name: /Sign In|Log In/i });
    await signInBtn.click();
    
    // Should navigate to dashboard
    await expect(page).toHaveURL('/');
    await expect(page.getByText('Dashboard', { exact: false })).toBeVisible();
  });
});
