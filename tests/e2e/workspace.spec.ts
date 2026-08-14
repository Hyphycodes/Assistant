import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context, page }) => {
  await context.clearCookies();
  await page.request.post("/api/auth/demo", { data: { role: "owner" } });
  await page.request.delete("/api/workspace");
  await context.clearCookies();
  await page.goto("/sign-in");
});

test("owner can sign in, resolve a decision, and capture a thought", async ({ page }) => {
  await page.getByRole("button", { name: "Continue as Jerry" }).click();
  await expect(page.getByRole("heading", { name: /Good .* Jerry/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Needs you/ })).toBeVisible();
  await page.getByRole("button", { name: "Approve $200" }).click();
  await expect(page.getByText(/approved\. Maria can keep this moving/i)).toBeVisible();
  await page.getByRole("link", { name: /Inbox/ }).click();
  await page.getByLabel("What are you thinking about?").fill("Look into a quiet dinner spot in Chicago next week");
  await page.getByRole("button", { name: "Save to Inbox" }).click();
  await expect(page.getByText("Your original capture is safe")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Look into a quiet dinner spot" })).toBeVisible();
});

test("Things views are deep-linkable and edits survive refresh", async ({ page }) => {
  await page.getByRole("button", { name: "Continue as Jerry" }).click();
  await page.waitForURL("/");
  await page.goto("/things?filter=needs-you&sort=blocked");
  await expect(page.getByRole("button", { name: "Needs You" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { name: "Mamma Mia — Dancing Queen" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fall Wardrobe" })).toHaveCount(0);
  await expect(page.getByText(/decisions · .* unresolved · .* links/).first()).toBeVisible();

  await page.goto("/things/camping-red-oak");
  await expect(page.getByRole("navigation", { name: "Thing sections" })).toContainText("Links & options");
  await page.getByRole("button", { name: "Edit Thing" }).click();
  await page.getByLabel("Owner next action").fill("Confirm the final campsite plan with Maria.");
  await page.getByRole("button", { name: "Save Thing" }).click();
  await expect(page.getByText("Confirm the final campsite plan with Maria.", { exact: true }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByText("Confirm the final campsite plan with Maria.", { exact: true }).first()).toBeVisible();
});

test("assistant work is attributable and owner resolution is rejected by the server", async ({ page }) => {
  await page.getByRole("button", { name: "Continue as Maria" }).click();
  await expect(page.getByRole("heading", { name: "Good evening, Maria." })).toBeVisible();
  await page.getByRole("button", { name: "Movement", exact: true }).first().click();
  await page.getByLabel("What changed").fill("Compared two viable windows and documented the tradeoff.");
  await page.getByLabel("New assistant next action").fill("Add one clear recommendation for Jerry.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Movement recorded. Jerry can see it on Home.")).toBeVisible();

  const response = await page.request.post("/api/workspace", {
    data: { action: "resolve_approval", payload: { id: "wardrobe-budget", status: "approved" } },
  });
  expect(response.status()).toBe(403);
  await expect(response.json()).resolves.toMatchObject({ error: /Only the owner/ });
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
  for (const item of ["Things", "Inbox", "Search", "Calendar", "Home"]) {
    await page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: item }).click();
    await expect(page.getByRole("heading", { name: item === "Home" ? /Good .* Jerry/ : item }).first()).toBeVisible();
  }
});

test("owner can shape sections, items, fields, and subthings with persisted server writes", async ({ page }) => {
  await page.getByRole("button", { name: "Continue as Jerry" }).click();
  await page.waitForURL("/");
  await page.goto("/things/camping-red-oak");
  let detail = page.getByRole("main").first();
  await detail.getByLabel("New section").fill("Weather plan");
  await detail.getByRole("button", { name: "Add section" }).click();
  await expect(detail.locator('input[value="Weather plan"]')).toBeVisible();
  await detail.getByRole("textbox", { name: "Item", exact: true }).fill("Pack rain shell");
  await detail.getByRole("button", { name: "Add item" }).click();
  await expect(detail.locator('input[value="Pack rain shell"]')).toBeVisible();
  await detail.getByLabel("Field name").fill("Weather backup");
  await detail.getByRole("button", { name: "Add field" }).click();
  await expect(detail.getByRole("textbox", { name: "Weather backup" })).toBeVisible();
  await page.reload();
  detail = page.getByRole("main").first();
  await expect(detail.locator('input[value="Weather plan"]')).toBeVisible();
  await expect(detail.locator('input[value="Pack rain shell"]')).toBeVisible();
  await expect(detail.getByRole("textbox", { name: "Weather backup" })).toBeVisible();
  await expect(detail.getByRole("link", { name: /Tent Setup/ })).toBeVisible();
});

test("mobile detail keeps work before supporting metadata", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile-only content order check");
  await page.getByRole("button", { name: "Continue as Jerry" }).click();
  await page.waitForURL("/");
  await page.goto("/things/camping-red-oak");
  const overview = await page.locator("#overview").first().boundingBox();
  const sidebar = await page.getByRole("complementary", { name: "Supporting details" }).first().boundingBox();
  expect(overview).not.toBeNull();
  expect(sidebar).not.toBeNull();
  expect(overview!.y).toBeLessThan(sidebar!.y);
});
