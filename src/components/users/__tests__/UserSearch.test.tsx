import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UserSearch } from "../UserSearch";

describe("UserSearch", () => {
  it("renders search input", () => {
    render(<UserSearch onSearch={vi.fn()} />);

    expect(screen.getByPlaceholderText("Search by name or email...")).toBeInTheDocument();
  });

  it("displays initial value", () => {
    render(<UserSearch onSearch={vi.fn()} initialValue="test query" />);

    expect(screen.getByDisplayValue("test query")).toBeInTheDocument();
  });

  it("calls onSearch when form submitted", () => {
    const onSearch = vi.fn();
    render(<UserSearch onSearch={onSearch} />);

    const input = screen.getByPlaceholderText("Search by name or email...");
    fireEvent.change(input, { target: { value: "john" } });
    fireEvent.submit(input.closest("form")!);

    expect(onSearch).toHaveBeenCalledWith("john");
  });

  it("clears search when clear button clicked", async () => {
    const onSearch = vi.fn();
    render(<UserSearch onSearch={onSearch} initialValue="test" />);

    // Find the clear button by looking for a button near the input
    const input = screen.getByPlaceholderText("Search by name or email...");
    const clearButton = input.parentElement?.querySelector("button");
    
    if (clearButton) {
      fireEvent.click(clearButton);
      expect(onSearch).toHaveBeenCalledWith("");
    }
  });

  it("does not show clear button when input is empty", () => {
    render(<UserSearch onSearch={vi.fn()} />);

    const input = screen.getByPlaceholderText("Search by name or email...");
    const clearButton = input.parentElement?.querySelector("button");
    
    // When input is empty, there should be no clear button
    expect(clearButton).toBeFalsy();
  });

  it("shows clear button when input has value", () => {
    render(<UserSearch onSearch={vi.fn()} initialValue="test" />);

    const input = screen.getByDisplayValue("test");
    const clearButton = input.parentElement?.querySelector("button");
    
    expect(clearButton).toBeTruthy();
  });
});
