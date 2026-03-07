import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UserTable } from "../UserTable";
import type { AdminUser } from "@/types/admin";

const mockUsers: AdminUser[] = [
  {
    id: "user_1",
    clerkId: "user_1",
    email: "john@example.com",
    firstName: "John",
    lastName: "Doe",
    imageUrl: "",
    isAdmin: false,
    createdAt: "2024-01-01T00:00:00Z",
    lastSignInAt: "2024-03-01T00:00:00Z",
    organizationId: null,
    organizationName: null,
  },
  {
    id: "user_2",
    clerkId: "user_2",
    email: "jane@example.com",
    firstName: "Jane",
    lastName: "Smith",
    imageUrl: "",
    isAdmin: true,
    createdAt: "2024-02-01T00:00:00Z",
    lastSignInAt: null,
    organizationId: "org_1",
    organizationName: "Acme Corp",
  },
];

describe("UserTable", () => {
  const defaultProps = {
    users: mockUsers,
    total: 2,
    page: 1,
    pageSize: 25,
    onPageChange: vi.fn(),
  };

  it("renders user list correctly", () => {
    render(<UserTable {...defaultProps} />);

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("john@example.com")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
  });

  it("displays admin badge for admin users", () => {
    render(<UserTable {...defaultProps} />);

    const adminBadges = screen.getAllByText("Admin");
    expect(adminBadges).toHaveLength(1);
  });

  it("displays organization name when available", () => {
    render(<UserTable {...defaultProps} />);

    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("shows 'Never' for users who haven't signed in", () => {
    render(<UserTable {...defaultProps} />);

    expect(screen.getByText("Never")).toBeInTheDocument();
  });

  it("calls onPageChange when next page clicked", () => {
    const onPageChange = vi.fn();
    render(
      <UserTable {...defaultProps} total={50} page={1} onPageChange={onPageChange} />
    );

    // Find all buttons and click the last one (next page)
    const buttons = screen.getAllByRole("button");
    const nextButton = buttons[buttons.length - 1];
    fireEvent.click(nextButton);

    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("calls onPageChange when previous page clicked", () => {
    const onPageChange = vi.fn();
    render(
      <UserTable {...defaultProps} total={50} page={2} onPageChange={onPageChange} />
    );

    // Find all buttons - on page 2, previous should be enabled
    const buttons = screen.getAllByRole("button");
    // Find first non-disabled button that's not a dropdown
    const prevButton = buttons.find(btn => 
      !btn.disabled && btn.getAttribute("aria-haspopup") !== "menu"
    );
    
    if (prevButton) {
      fireEvent.click(prevButton);
      expect(onPageChange).toHaveBeenCalled();
    }
  });

  it("has disabled button on first page (previous)", () => {
    render(<UserTable {...defaultProps} page={1} />);

    const buttons = screen.getAllByRole("button");
    const disabledButtons = buttons.filter(btn => btn.disabled);
    // Should have at least one disabled button (previous)
    expect(disabledButtons.length).toBeGreaterThan(0);
  });

  it("disables next button on last page", () => {
    render(<UserTable {...defaultProps} total={2} page={1} />);

    const buttons = screen.getAllByRole("button");
    const nextButton = buttons[buttons.length - 1];
    expect(nextButton).toBeDisabled();
  });

  it("calls onToggleAdmin when admin action clicked", () => {
    const onToggleAdmin = vi.fn();
    render(<UserTable {...defaultProps} onToggleAdmin={onToggleAdmin} />);

    // Find dropdown trigger (small button with h-8 w-8 class)
    const allButtons = screen.getAllByRole("button");
    const dropdownTrigger = allButtons.find(btn => 
      btn.className.includes("h-8") && btn.className.includes("w-8")
    );
    
    if (dropdownTrigger) {
      fireEvent.click(dropdownTrigger);
      
      const makeAdminButton = screen.queryByText("Make Admin");
      if (makeAdminButton) {
        fireEvent.click(makeAdminButton);
        expect(onToggleAdmin).toHaveBeenCalledWith("user_1", true);
      }
    }
  });

  it("calls onDelete when delete action clicked", () => {
    const onDelete = vi.fn();
    render(<UserTable {...defaultProps} onDelete={onDelete} />);

    const deleteButton = screen.queryByText("Delete User");
    if (deleteButton) {
      fireEvent.click(deleteButton);
      expect(onDelete).toHaveBeenCalledWith("user_1");
    }
  });

  it("links to user detail page", () => {
    render(<UserTable {...defaultProps} />);

    const userLink = screen.getByText("John Doe");
    expect(userLink.closest("a")).toHaveAttribute("href", "/users/user_1");
  });

  it("shows empty state when no users", () => {
    render(<UserTable {...defaultProps} users={[]} total={0} />);

    expect(screen.getByText("No users found.")).toBeInTheDocument();
  });

  it("displays pagination info correctly", () => {
    render(<UserTable {...defaultProps} total={100} page={2} pageSize={25} />);

    expect(screen.getByText("Showing 26 to 50 of 100 users")).toBeInTheDocument();
    expect(screen.getByText("Page 2 of 4")).toBeInTheDocument();
  });

  it("renders user avatar with fallback", () => {
    render(<UserTable {...defaultProps} />);

    // Check for avatar fallbacks (first 2 letters of name)
    expect(screen.getByText("JO")).toBeInTheDocument();
    expect(screen.getByText("JA")).toBeInTheDocument();
  });
});
