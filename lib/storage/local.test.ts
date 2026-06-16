import { describe, expect, it } from "vitest";
import { createLocalStorage } from "./local";

describe("createLocalStorage", () => {
  it("returns the upload as a data URL preserving content type and pathname", async () => {
    const storage = createLocalStorage();
    const bytes = new TextEncoder().encode("hello").buffer;

    const result = await storage.upload("greeting.txt", bytes, "text/plain");

    expect(result.pathname).toBe("greeting.txt");
    expect(result.contentType).toBe("text/plain");
    expect(result.url).toBe(
      `data:text/plain;base64,${Buffer.from("hello").toString("base64")}`
    );
  });
});
