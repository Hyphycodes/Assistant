import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context, page }) => {
  await context.clearCookies();
  await page.goto("/sign-in");
  await page.evaluate(() => localStorage.clear());
});

test("owner can sign in, resolve a decision, and capture a thought", async ({ page }) => {
  await page.getByRole("button", { name: "Continue as Jerry" }).click();
  await expect(page.getByRole("heading", { name: /Good .* Jerry/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Needs you/ })).toBeVisible();
  await page.getByRole("button", { name: "Approve $200" }).click();
  await expect(page.getByText("Approved. Maria can keep this moving.")).toBeVisible();
  await page.getByRole("link", { name: /Inbox/ }).click();
  await page.getByLabel("What are you thinking about?").fill("Look into a quiet dinner spot in Chicago next week");
  await page.getByRole("button", { name: "Save to Inbox" }).click();
  await expect(page.getByText("Your original capture is safe")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Look into a quiet dinner spot" })).toBeVisible();
});

test("assistant sees a prioritized briefing but cannot resolve owner approvals", async ({ page }) => {
  await page.getByRole("button", { name: "Continue as Maria" }).click();
  await expect(page.getByRole("heading", { name: "Good evening, Maria." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Time-sensitive" })).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Approve $200" })).toBeDisabled();
  await expect(page.getByText(/only the owner can resolve/i).first()).toBeVisible();
});

test("primary mobile navigation reaches every mental-model area", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile-only navigation check");
  await page.getByRole("button", { name: "Continue as Jerry" }).click();
  for (const item of ["Things", "Inbox", "Calendar", "Archive", "Home"]) {
    await page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: item }).click();
    await expect(page.getByRole("heading", { name: item === "Home" ? /Good .* Jerry/ : item }).first()).toBeVisible();
  }
});
