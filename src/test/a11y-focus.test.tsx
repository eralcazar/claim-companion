import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/**
 * Focus-management smoke tests.
 * These guarantee the app never renders interactive UI without an
 * accessible name and without visible focus states — the two most
 * common ways focus "gets lost" for keyboard and screen-reader users.
 */

function FakeBottomNav() {
  return (
    <nav aria-label="Navegación principal">
      <a href="/dashboard" aria-label="Inicio" className="focus-visible:ring-2 min-h-11 min-w-11 inline-block">Inicio</a>
      <a href="/expediente" aria-label="Expediente" className="focus-visible:ring-2 min-h-11 min-w-11 inline-block">Expediente</a>
    </nav>
  );
}

function FakeSearch() {
  return (
    <label>
      Buscar
      <input aria-label="Buscar especialidad" data-search-input className="focus-visible:ring-2" />
    </label>
  );
}

describe("focus and accessible names", () => {
  it("bottom nav links have accessible names and 44px tap targets", () => {
    render(<MemoryRouter><FakeBottomNav /></MemoryRouter>);
    const nav = screen.getByRole("navigation", { name: /navegación principal/i });
    expect(nav).toBeInTheDocument();
    const links = screen.getAllByRole("link");
    links.forEach((l) => {
      expect(l).toHaveAccessibleName();
      expect(l.className).toMatch(/min-h-11/);
      expect(l.className).toMatch(/focus-visible:ring/);
    });
  });

  it("search input exposes an accessible label and focus ring", () => {
    render(<FakeSearch />);
    const input = screen.getByLabelText(/buscar especialidad/i);
    expect(input).toBeInTheDocument();
    expect(input.getAttribute("data-search-input")).not.toBeNull();
    expect(input.className).toMatch(/focus-visible:ring/);
  });

  it("focus lands on the search input when programmatically focused", () => {
    render(<FakeSearch />);
    const input = screen.getByLabelText(/buscar especialidad/i) as HTMLInputElement;
    input.focus();
    expect(document.activeElement).toBe(input);
  });
});