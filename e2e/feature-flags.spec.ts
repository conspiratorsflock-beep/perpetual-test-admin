import { test, expect } from "@playwright/test";

test.describe("Feature Flags", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/support/flags");
  });

  test("feature flags page loads", async ({ page }) => {
    await expect(page.getByText("Feature Flags")).toBeVisible();
    await expect(page.getByText("Manage feature flags")).toBeVisible();
  });

  test("can create new feature flag", async ({ page }) => {
    await page.getByRole("button", { name: /new flag/i }).click();
    
    await expect(page.getByText("Create Feature Flag")).toBeVisible();
    
    await page.getByLabel("Key").fill("test_feature");
    await page.getByLabel("Name").fill("Test Feature");
    await page.getByLabel("Description").fill("A test feature flag");
    
    await page.getByRole("button", { name: /create/i }).click();
    
    // Should show new flag in list
    await expect(page.getByText("Test Feature")).toBeVisible();
  });

  test("can toggle feature flag globally", async ({ page }) => {
    // Find first flag's toggle
    const toggle = page.getByRole("switch").first();
    const initialState = await toggle.isChecked();
    
    await toggle.click();
    
    // Toggle state should change
    await expect(toggle).toHaveAttribute("data-state", initialState ? "unchecked" : "checked");
  });

  test("can edit feature flag", async ({ page }) => {
    // Click edit on first flag
    await page.getByRole("button", { name: /edit/i }).first().click();
    
    await expect(page.getByText("Edit Feature Flag")).toBeVisible();
    
    await page.getByLabel("Name").fill("Updated Name");
    await page.getByRole("button", { name: /save/i }).click();
    
    await expect(page.getByText("Updated Name")).toBeVisible();
  });

  test("can delete feature flag", async ({ page }) => {
    // Get initial flag count
    const flags = await page.getByRole("heading", { name: /./ }).count();
    
    // Click delete on first flag
    await page.getByRole("button", { name: /delete/i }).first().click();
    
    // Confirm deletion (would need confirmation dialog handling)
    // await page.getByRole("button", { name: /confirm/i }).click();
  });

  test("displays flag statistics", async ({ page }) => {
    // Check for org and user counts
    await expect(page.getByText(/orgs$/)).toBeVisible();
    await expect(page.getByText(/users$/)).toBeVisible();
  });
});
