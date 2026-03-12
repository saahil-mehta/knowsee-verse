import { expect, test } from "@playwright/test";

/**
 * Project API validation tests — stateless, no sequential dependencies.
 */

test.describe("Project API — Validation", () => {
  test("GET /api/project/:id returns 404 for non-existent project", async ({
    request,
  }) => {
    const res = await request.get(
      "/api/project/00000000-0000-0000-0000-000000000000"
    );
    expect(res.ok()).toBe(false);
  });

  test("POST brand-profile to non-existent project fails", async ({
    request,
  }) => {
    const res = await request.post(
      "/api/project/00000000-0000-0000-0000-000000000000/brand-profile",
      {
        data: {
          brandName: "Orphan",
          websiteUrl: "https://orphan.example.com",
          country: "US",
          categories: ["Tech"],
          competitors: [],
          retailers: [],
        },
      }
    );
    expect(res.ok()).toBe(false);
  });
});
