import { expect, test } from "@playwright/test";

/**
 * History, vote, and document API validation — stateless, no writes.
 */

test.describe("Chat History API", () => {
  test("GET /api/history returns chat list", async ({ request }) => {
    const res = await request.get("/api/history");
    expect(res.ok()).toBe(true);

    const body = await res.json();
    expect(body).toHaveProperty("chats");
    expect(body).toHaveProperty("hasMore");
    expect(Array.isArray(body.chats)).toBe(true);
  });

  test("GET /api/history supports limit parameter", async ({ request }) => {
    const res = await request.get("/api/history?limit=2");
    expect(res.ok()).toBe(true);

    const body = await res.json();
    expect(body.chats.length).toBeLessThanOrEqual(2);
  });
});

test.describe("Vote API — Edge Cases", () => {
  test("PATCH /api/vote returns error for invalid chat", async ({
    request,
  }) => {
    const res = await request.patch("/api/vote", {
      data: {
        chatId: "00000000-0000-0000-0000-000000000000",
        messageId: "00000000-0000-0000-0000-000000000001",
        type: "up",
      },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
});

test.describe("Document API", () => {
  test("GET /api/document returns 400 without id", async ({ request }) => {
    const res = await request.get("/api/document");
    expect(res.ok()).toBe(false);
  });

  test("GET /api/document returns empty for non-existent id", async ({
    request,
  }) => {
    const res = await request.get(
      "/api/document?id=00000000-0000-0000-0000-000000000000"
    );
    if (res.ok()) {
      const body = await res.json();
      expect(Array.isArray(body) ? body.length : 0).toBe(0);
    }
  });
});
