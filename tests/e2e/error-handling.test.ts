import { expect, test } from "@playwright/test";

/**
 * API error handling and auth flow redirects — no message sending.
 */

test.describe("API Error Responses", () => {
  test("chat API handles malformed JSON gracefully", async ({ request }) => {
    const res = await request.post("/api/chat", {
      headers: { "Content-Type": "application/json" },
      data: "not valid json{{{",
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test("project API rejects empty name", async ({ request }) => {
    const res = await request.post("/api/project", {
      data: { name: "" },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test("brand profile rejects missing required fields", async ({ request }) => {
    const projRes = await request.post("/api/project", {
      data: { name: `Validation Test ${Date.now()}` },
    });
    const proj = await projRes.json();

    try {
      const res = await request.post(`/api/project/${proj.id}/brand-profile`, {
        data: { brandName: "Incomplete" },
      });
      expect(res.status()).toBeGreaterThanOrEqual(400);
    } finally {
      await request.delete(`/api/project/${proj.id}`);
    }
  });
});

test.describe("Auth Flow Redirects", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("unauthenticated user is redirected from home", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/(login|register)/, { timeout: 10_000 });
  });

  test("unauthenticated user is redirected from chat", async ({ page }) => {
    await page.goto("/chat/some-id");
    await expect(page).toHaveURL(/\/(login|register)/, { timeout: 10_000 });
  });

  test("unauthenticated user is redirected from project", async ({ page }) => {
    await page.goto("/project/some-id");
    await expect(page).toHaveURL(/\/(login|register)/, { timeout: 10_000 });
  });
});
