import { generateId } from "ai";
import { getUnixTime } from "date-fns";

export function generateRandomTestUser() {
  const timestamp = getUnixTime(new Date());
  const email = `test-${timestamp}@playwright.com`;
  const password = generateId();
  const name = `Test User ${timestamp}`;

  return {
    name,
    email,
    password,
  };
}

export function generateTestMessage() {
  return `Test message ${Date.now()}`;
}
