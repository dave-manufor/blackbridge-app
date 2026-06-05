import { test, expect } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

test.describe('Zero-Knowledge File Transfer Flow', () => {
  let testFilePath: string;

  test.beforeAll(async () => {
    // Create a dummy file for testing upload
    testFilePath = path.join(__dirname, 'test-data.txt');
    await fs.writeFile(testFilePath, 'Hello from Blackbridge E2E Tests! This is top secret.');
  });

  test.afterAll(async () => {
    // Cleanup
    await fs.unlink(testFilePath).catch(() => {});
  });

  test('Sender uploads and encrypts, Receiver decrypts and downloads', async ({ browser }) => {
    // --- CONTEXT A: SENDER ---
    const senderContext = await browser.newContext();
    const senderPage = await senderContext.newPage();

    // 1. Sender logs in (assuming test user exists or we bypass login for tests)
    // For a true E2E, we'd log in. Let's assume we have a test user seeded.
    await senderPage.goto('/sign-in');
    await senderPage.fill('input[type="email"]', 'sender@example.com');
    await senderPage.fill('input[type="password"]', 'Password123!');
    await senderPage.getByRole('button', { name: /Sign In/i }).click();

    // 2. Sender navigates to create a transfer
    // Wait for dashboard to load, then click New Transfer or go to /peer
    // For a link transfer, maybe it's on the dashboard
    await senderPage.goto('/transfers'); // Adjust to correct route
    const newTransferBtn = senderPage.getByRole('button', { name: /New Transfer|Create Transfer/i });
    if (await newTransferBtn.isVisible()) {
      await newTransferBtn.click();
    }

    // 3. Sender selects file
    // The dropzone or file input. Usually it's an input type="file"
    const fileChooserPromise = senderPage.waitForEvent('filechooser');
    await senderPage.getByText(/Drag & drop|Select Files/i).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(testFilePath);

    // 4. Sender submits
    await senderPage.getByRole('button', { name: /Transfer Files|Upload/i }).click();

    // 5. Wait for upload to complete and grab the link
    // The UI should display the generated link or navigate to a success page
    const linkInput = senderPage.locator('input[readonly]');
    await expect(linkInput).toBeVisible({ timeout: 15000 }); // Wait for encryption and upload
    const shareUrl = await linkInput.inputValue();
    
    expect(shareUrl).toContain('/p/shares/');

    // --- CONTEXT B: RECEIVER ---
    const receiverContext = await browser.newContext();
    const receiverPage = await receiverContext.newPage();

    // 1. Receiver opens the public link
    await receiverPage.goto(shareUrl);

    // 2. Receiver downloads the file
    const downloadPromise = receiverPage.waitForEvent('download');
    await receiverPage.getByRole('button', { name: /Download|Save/i }).click();
    const download = await downloadPromise;

    // 3. Verify the file contents are perfectly decrypted
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();
    
    const downloadedContent = await fs.readFile(downloadPath!, 'utf-8');
    expect(downloadedContent).toBe('Hello from Blackbridge E2E Tests! This is top secret.');

    // Close contexts
    await senderContext.close();
    await receiverContext.close();
  });
});
