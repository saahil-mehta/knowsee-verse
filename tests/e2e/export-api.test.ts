import { expect, test } from "@playwright/test";

/**
 * Export route error handling — pure API, no browser.
 */

test.describe("Export API — Error Cases", () => {
  test("POST /api/export returns error without body", async ({ request }) => {
    const res = await request.post("/api/export", {
      data: {},
    });
    expect(res.ok()).toBe(false);
  });

  test("POST /api/export rejects invalid format", async ({ request }) => {
    const res = await request.post("/api/export", {
      data: { chatId: "test", format: "invalid-format" },
    });
    expect(res.ok()).toBe(false);
  });

  test("POST /api/export rejects non-existent chat", async ({ request }) => {
    const res = await request.post("/api/export", {
      data: {
        chatId: "00000000-0000-0000-0000-000000000000",
        format: "pdf",
      },
    });
    expect(res.ok()).toBe(false);
  });
});
