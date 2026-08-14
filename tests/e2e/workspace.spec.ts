import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context, page }) => {
  await context.clearCookies();
  await page.request.post("/api/auth/demo", { data: { role: "owner" } });
  await page.request.delete("/api/workspace");
  await context.clearCookies();
  await page.goto("/sign-in");
});

test("owner can resolve a decision and a confident capture files itself", async ({ page }) => {
  await page.getByRole("button", { name: /Jerry/ }).click();
  await expect(page.getByRole("heading", { name: /Good .* Jerry/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Needs you" })).toBeVisible();
  await expect(page.getByText("Ideas to revisit")).toHaveCount(0);

  await page.locator(".decision-approve").first().click();
  await expect(page.getByText(/approved\. Maria can keep this moving/i)).toBeVisible();

  await page.goto("/inbox");
  await page.getByLabel("What are you thinking about?").fill("For camping, add a tasteful lantern light by the tent.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText(/Added to Camping — Red Oak/).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recent captures" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Undo" }).first()).toBeVisible();
});

test("Things keeps two calm views, deep links filters, and persists edits", async ({ page }, testInfo) => {
  await page.getByRole("button", { name: /Jerry/ }).click();
  await page.waitForURL("/");
  await page.goto("/things?filter=needs-you&sort=blocked");

  const views = page.getByRole("navigation", { name: "Thing views" });
  await expect(views.getByRole("button")).toHaveCount(2);
  await expect(views.getByRole("button", { name: "Active" })).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".calm-filter select").first()).toHaveValue("needs-you");
  await expect(page.getByRole("heading", { name: "Mamma Mia — Dancing Queen" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fall Wardrobe" })).toHaveCount(0);
  await expect(page.getByText(/decisions · .* unresolved · .* links/)).toHaveCount(0);

  await page.goto("/things/camping-red-oak");
  await expect(page.getByRole("heading", { name: "Tent setup" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Food & drinks" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Custom fields" })).toHaveCount(0);
  if (testInfo.project.name === "mobile") {
    await page.getByLabel("More Thing actions").click();
    await page.getByRole("button", { name: "Edit Thing" }).click();
  } else {
    await page.getByRole("button", { name: "Edit", exact: true }).click();
  }
  await page.getByLabel("Owner next action").fill("Confirm the final campsite plan with Maria.");
  await page.getByRole("button", { name: "Save Thing" }).click();
  await expect(page.getByText("Thing saved.")).toBeVisible();
  await page.reload();
  if (testInfo.project.name === "mobile") {
    await page.getByLabel("More Thing actions").click();
    await page.getByRole("button", { name: "Edit Thing" }).click();
  } else {
    await page.getByRole("button", { name: "Edit", exact: true }).click();
  }
  await expect(page.getByLabel("Owner next action")).toHaveValue("Confirm the final campsite plan with Maria.");
});

test("assistant work is attributable and owner resolution is rejected by the server", async ({ page }) => {
  await page.getByRole("button", { name: /Maria/ }).click();
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Working on" })).toBeVisible();

  await page.getByLabel(/More actions for/).first().click();
  await page.getByRole("button", { name: "Ask Jerry" }).first().click();
  await page.getByLabel("Decision needed").fill("Choose the quieter lighting direction");
  await page.getByLabel("Recommendation").fill("Use two warm rechargeable lanterns");
  await page.getByLabel("Why now").fill("This unblocks the campsite packing list.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Decision prepared for Jerry.")).toBeVisible();

  const response = await page.request.post("/api/workspace", {
    data: { action: "resolve_approval", payload: { id: "wardrobe-budget", status: "approved" } },
  });
  expect(response.status()).toBe(403);
  await expect(response.json()).resolves.toMatchObject({ error: /Only the owner/ });
});

test("assistant gets a work-first Today view and cannot resolve owner decisions", async ({ page }) => {
  await page.getByRole("button", { name: /Maria/ }).click();
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Waiting" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Needs Jerry" })).toBeVisible();
  await expect(page.getByText("Time-sensitive")).toHaveCount(0);

  await page.goto("/things/camping-red-oak");
  await page.getByRole("button", { name: /^Exterior lighting/ }).click();
  await expect(page.getByRole("button", { name: "Approve", exact: true })).toBeDisabled();
  await expect(page.getByText("Prepared for Jerry").first()).toBeVisible();
});

test("primary mobile navigation reaches the calm mental-model areas", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile-only navigation check");
  await page.getByRole("button", { name: /Jerry/ }).click();
  const destinations = [
    { link: "Things", heading: "Things" },
    { link: "Capture", heading: "Inbox" },
    { link: "Search", heading: "Search" },
    { link: "Calendar", heading: "Calendar" },
    { link: "Home", heading: /Good .* Jerry/ },
  ];
  for (const destination of destinations) {
    await page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: destination.link }).click();
    await expect(page.getByRole("heading", { name: destination.heading }).first()).toBeVisible();
  }
});

test("advanced Thing capabilities stay preserved behind Manage", async ({ page }) => {
  await page.getByRole("button", { name: /Jerry/ }).click();
  await page.waitForURL("/");
  await page.goto("/things/camping-red-oak");

  await expect(page.getByRole("heading", { name: "Sections & items" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Custom fields" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Subthings & relationships" })).toHaveCount(0);
  await page.getByRole("main").getByLabel("More Thing actions").click();
  await page.getByRole("button", { name: "Manage", exact: true }).click();

  let manage = page.getByRole("dialog", { name: "Manage Thing" });
  await manage.getByLabel("New section").fill("Weather plan");
  await manage.getByRole("button", { name: "Add section" }).click();
  await expect(manage.locator('input[value="Weather plan"]')).toBeVisible();
  await manage.getByRole("textbox", { name: "Item", exact: true }).fill("Pack rain shell");
  await manage.getByRole("button", { name: "Add item" }).click();
  await expect(manage.locator('input[value="Pack rain shell"]')).toBeVisible();
  await manage.getByLabel("Field name").fill("Weather backup");
  await manage.getByRole("button", { name: "Add field" }).click();
  await expect(manage.getByRole("textbox", { name: "Weather backup" })).toBeVisible();

  await page.reload();
  await page.getByRole("main").getByLabel("More Thing actions").click();
  await page.getByRole("button", { name: "Manage", exact: true }).click();
  manage = page.getByRole("dialog", { name: "Manage Thing" });
  await expect(manage.locator('input[value="Weather plan"]')).toBeVisible();
  await expect(manage.locator('input[value="Pack rain shell"]')).toBeVisible();
  await expect(manage.getByRole("textbox", { name: "Weather backup" })).toBeVisible();
  await expect(manage.getByRole("link", { name: /Tent Setup/ })).toBeVisible();
});

test("product lifecycle and management stay hidden until requested", async ({ page }) => {
  await page.getByRole("button", { name: /Jerry/ }).click();
  await page.waitForURL("/");
  await page.goto("/things/camping-red-oak");

  await page.getByRole("button", { name: /^Exterior lighting/ }).click();
  const product = page.locator(".calm-product-card").first();
  await expect(product.getByRole("button", { name: "Choose" })).toBeVisible();
  await expect(product.getByRole("button", { name: "Save" })).toBeVisible();
  await expect(product.getByRole("button", { name: "Track order" })).toHaveCount(0);
  await product.locator("details > summary").click();
  await expect(product.getByRole("button", { name: "Edit" })).toBeVisible();
  await expect(product.getByRole("button", { name: "Track order" })).toBeVisible();
});

test("mobile detail keeps the work surface visible and management collapsed", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile-only content order check");
  await page.getByRole("button", { name: /Jerry/ }).click();
  await page.waitForURL("/");
  await page.goto("/things/camping-red-oak");

  await expect(page.getByRole("heading", { name: "Tent setup" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Food & drinks" })).toBeVisible();
  await page.getByRole("button", { name: /^Exterior lighting/ }).click();
  await expect(page.getByRole("heading", { name: "Exterior lighting", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Custom fields" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: "Capture" })).toBeVisible();
});
