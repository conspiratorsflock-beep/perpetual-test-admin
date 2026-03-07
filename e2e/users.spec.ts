import { test, expect } from "@playwright/test";

test.describe("User Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/users");
  });

  test("users page loads with table", async ({ page }) => {
    await expect(page.getByText("Users")).toBeVisible();
    await expect(page.getByText("Manage platform users")).toBeVisible();
    await expect(page.getByText("Total Users")).toBeVisible();
  });

  test("search functionality works", async ({ page }) => {
    const searchInput = page.getByPlaceholder("Search by name or email...");
    await searchInput.fill("test@example.com");
    await searchInput.press("Enter");
    
    // URL should update with search query
    await expect(page).toHaveURL(/.*q=test.*/);
  });

  test("can filter by admin status", async ({ page }) => {
    await page.getByText("Admins Only").click();
    await expect(page).toHaveURL(/.*tab=admins.*/);
  });

  test("pagination controls work", async ({ page }) => {
    // Assuming we have more than 25 users
    const nextButton = page.getByRole("button", { name: /next/i });
    
    if (await nextButton.isEnabled()) {
      await nextButton.click();
      await expect(page).toHaveURL(/.*page=2.*/);
    }
  });

  test("user detail page loads", async ({ page }) => {
    // Click on first user name
    const firstUser = page.getByRole("link").first();
    await firstUser.click();
    
    // Should navigate to user detail
    await expect(page).toHaveURL(/.*users\/.+/);
  });
});

test.describe("User Detail Page", () => {
  test("displays user information", async ({ page }) => {
    await page.goto("/users/user_test_123");
    
    await expect(page.getByText("Back to Users")).toBeVisible();
    await expect(page.getByText("User Information")).toBeVisible();
    await expect(page.getByText("Quick Stats")).toBeVisible();
  });

  test("has impersonate button", async ({ page }) => {
    await page.goto("/users/user_test_123");
    
    const impersonateButton = page.getByRole("button", { name: /impersonate/i });
    await expect(impersonateButton).toBeVisible();
  });

  test("impersonate dialog opens", async ({ page }) => {
    await page.goto("/users/user_test_123");
    
    await page.getByRole("button", { name: /impersonate/i }).click();
    
    await expect(page.getByText("Impersonate User")).toBeVisible();
    await expect(page.getByText("Generate Token")).toBeVisible();
  });

  test("can toggle admin status", async ({ page }) => {
    await page.goto("/users/user_test_123");
    
    const adminButton = page.getByRole("button", { name: /make admin|revoke admin/i });
    await expect(adminButton).toBeVisible();
  });

  test("tabs switch correctly", async ({ page }) => {
    await page.goto("/users/user_test_123");
    
    await page.getByText("Organizations").click();
    await expect(page.getByText("Organization Memberships")).toBeVisible();
    
    await page.getByText("Activity").click();
    await expect(page.getByText("Recent Activity")).toBeVisible();
  });
});
