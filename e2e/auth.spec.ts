import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("redirects to sign-in when not authenticated", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/.*sign-in.*/);
  });

  test("sign-in page renders correctly", async ({ page }) => {
    await page.goto("/sign-in");
    
    await expect(page.getByText("Perpetual Test")).toBeVisible();
    await expect(page.getByText("Admin")).toBeVisible();
    await expect(page.getByText("Sign in to continue")).toBeVisible();
  });

  test("unauthorized page shows for non-admin users", async ({ page }) => {
    // This would require mocking Clerk to return a non-admin user
    await page.goto("/unauthorized");
    
    await expect(page.getByText("Access Denied")).toBeVisible();
    await expect(page.getByText("You don't have admin permissions")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /back to app/i })).toBeVisible();
  });

  test("admin user can access dashboard", async ({ page }) => {
    // This test assumes admin authentication is set up
    // In practice, you'd need to mock Clerk or use test credentials
    await page.goto("/dashboard");
    
    // Should not redirect to sign-in
    await expect(page).not.toHaveURL(/.*sign-in.*/);
  });
});

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication for navigation tests
    await page.goto("/dashboard");
  });

  test("sidebar navigation is visible on desktop", async ({ page }) => {
    await expect(page.getByText("Dashboard")).toBeVisible();
    await expect(page.getByText("Users")).toBeVisible();
    await expect(page.getByText("Organizations")).toBeVisible();
    await expect(page.getByText("Projects")).toBeVisible();
  });

  test("can navigate to Users page", async ({ page }) => {
    await page.getByText("Users").click();
    await expect(page).toHaveURL("/users");
    await expect(page.getByText("User Management")).toBeVisible();
  });

  test("can navigate to Organizations page", async ({ page }) => {
    await page.getByText("Organizations").click();
    await expect(page).toHaveURL("/organizations");
    await expect(page.getByText("Organizations")).toBeVisible();
  });

  test("can navigate to Feature Flags", async ({ page }) => {
    await page.getByText("Support").click();
    await page.getByText("Flags").click();
    await expect(page).toHaveURL("/support/flags");
    await expect(page.getByText("Feature Flags")).toBeVisible();
  });

  test("mobile sidebar can be toggled", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Open mobile menu
    await page.getByRole("button", { name: /open menu/i }).click();
    
    // Sidebar should be visible
    await expect(page.getByText("Dashboard")).toBeVisible();
  });
});
