import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { KretoTip } from "../KretoTip";

/**
 * Regression coverage for Kreto's controlled rollout across KretoTip's
 * route groups (KRETO_3D_REFERENCE_AND_RIGHTS_AUDIT.md §13): Studio shipped
 * in the pilot, Scout, Passport, Events and Circle are the rollout surfaces
 * approved after pilot review. Kreto's owned character is now the single
 * visual identity across every assistant surface.
 */

function renderTip(surface: "today" | "discover" | "desk" | "match" | "pay" | "passport") {
  return render(
    <MemoryRouter>
      <KretoTip surface={surface} />
    </MemoryRouter>,
  );
}

/** Events has no `surface` override key (unlike the others), so it's
 *  exercised via real route matching instead -- the same code path a real
 *  visitor to /events hits. */
function renderTipAtRoute(pathname: string) {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <KretoTip />
    </MemoryRouter>,
  );
}

describe("KretoTip — Kreto presence rollout scope", () => {
  it("Studio (desk) renders the embodied KretoPresence, not the flat KretoMark", () => {
    const { container } = renderTip("desk");
    expect(container.querySelector("img")).toBeInTheDocument();
    expect(screen.getByText(/Kreto · Studio/i)).toBeInTheDocument();
  });

  it("Scout (discover) renders the embodied KretoPresence -- the first rollout surface", () => {
    const { container } = renderTip("discover");
    expect(container.querySelector("img")).toBeInTheDocument();
    expect(screen.getByText(/Kreto · Scout/i)).toBeInTheDocument();
  });

  it("Passport renders the embodied KretoPresence -- the second rollout surface", () => {
    const { container } = renderTip("passport");
    expect(container.querySelector("img")).toBeInTheDocument();
    expect(screen.getByText(/Kreto · Passport/i)).toBeInTheDocument();
  });

  it("Events (/events route) renders the embodied KretoPresence -- the third rollout surface", () => {
    const { container } = renderTipAtRoute("/events");
    expect(container.querySelector("img")).toBeInTheDocument();
    expect(screen.getByText(/Kreto · Events/i)).toBeInTheDocument();
  });

  it("/meetup route also resolves to the Events group and renders the embodied presence", () => {
    const { container } = renderTipAtRoute("/meetup");
    expect(container.querySelector("img")).toBeInTheDocument();
    expect(screen.getByText(/Kreto · Events/i)).toBeInTheDocument();
  });

  it("Circle (/circle route) renders the embodied KretoPresence -- the fourth rollout surface", () => {
    const { container } = renderTipAtRoute("/circle");
    expect(container.querySelector("img")).toBeInTheDocument();
    expect(screen.getByText(/Kreto · Circle/i)).toBeInTheDocument();
  });

  it("/stages route also resolves to the Circle group and renders the embodied presence", () => {
    const { container } = renderTipAtRoute("/stages");
    expect(container.querySelector("img")).toBeInTheDocument();
    expect(screen.getByText(/Kreto · Circle/i)).toBeInTheDocument();
  });

  it.each(["today", "match", "pay"] as const)(
    "%s renders the same embodied Kreto character",
    (surface) => {
      const { container } = renderTip(surface);
      expect(container.querySelector("img")).toBeInTheDocument();
    },
  );
});
