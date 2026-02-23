import { expect, test as setup } from "@playwright/test";

const TEST_EMAIL = process.env.TEST_USER_EMAIL;
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD;

setup("authenticate", async ({ page }) => {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    throw new Error(
      "TEST_USER_EMAIL and TEST_USER_PASSWORD must be set in .env.local"
    );
  }
  await page.goto("/login");

  await page.getByPlaceholder("Email address").fill(TEST_EMAIL);
  await page.getByPlaceholder("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  // Wait for redirect to home after successful login
  await expect(page).toHaveURL("/", { timeout: 30_000 });

  await page.context().storageState({ path: "tests/.auth/user.json" });
});
