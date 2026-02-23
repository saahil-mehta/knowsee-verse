import { expect, test } from "@playwright/test";

// Auth tests must run unauthenticated — override the project-level storageState
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Authentication Pages", () => {
  test("login page renders correctly", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByPlaceholder("Email address")).toBeVisible();
    await expect(page.getByPlaceholder("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    await expect(page.getByText("Don't have an account?")).toBeVisible();
  });

  test("register page renders correctly", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByPlaceholder("Name")).toBeVisible();
    await expect(page.getByPlaceholder("Email address")).toBeVisible();
    await expect(
      page.getByPlaceholder("Password", { exact: true })
    ).toBeVisible();
    await expect(page.getByPlaceholder("Confirm password")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create account" })
    ).toBeVisible();
    await expect(page.getByText("Already have an account?")).toBeVisible();
  });

  test("can navigate from login to register", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "Create account" }).click();
    await expect(page).toHaveURL("/register");
  });

  test("can navigate from register to login", async ({ page }) => {
    await page.goto("/register");
    await page.getByRole("link", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/login");
  });
});
