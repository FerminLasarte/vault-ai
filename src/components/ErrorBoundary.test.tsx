// @vitest-environment jsdom
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

function Boom({ shouldThrow }: { shouldThrow: boolean }): React.JSX.Element {
  if (shouldThrow) throw new Error("kaboom");
  return <p>contenido</p>;
}

function fallback(error: Error, retry: () => void) {
  return (
    <div>
      <p>{error.message}</p>
      <button type="button" onClick={retry}>
        reintentar
      </button>
    </div>
  );
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    // React logs every caught error to the console by design; silencing it here
    // keeps the intentional failures below from looking like real test noise.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders its children while nothing throws", () => {
    render(
      <ErrorBoundary fallback={fallback}>
        <Boom shouldThrow={false} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("contenido")).toBeDefined();
  });

  it("renders the fallback instead of unmounting the tree", () => {
    render(
      <ErrorBoundary fallback={fallback}>
        <Boom shouldThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByText("kaboom")).toBeDefined();
    expect(screen.queryByText("contenido")).toBeNull();
  });

  it("recovers when retry is pressed and the cause is gone", async () => {
    function Harness() {
      const [shouldThrow, setShouldThrow] = useState(true);
      return (
        <div>
          <button type="button" onClick={() => setShouldThrow(false)}>
            arreglar
          </button>
          <ErrorBoundary fallback={fallback}>
            <Boom shouldThrow={shouldThrow} />
          </ErrorBoundary>
        </div>
      );
    }

    const user = userEvent.setup();
    render(<Harness />);

    expect(screen.getByText("kaboom")).toBeDefined();

    await user.click(screen.getByText("arreglar"));
    await user.click(screen.getByText("reintentar"));

    expect(screen.getByText("contenido")).toBeDefined();
  });

  it("clears the error on its own when resetKey changes", async () => {
    function Harness() {
      const [view, setView] = useState("a");
      return (
        <div>
          <button type="button" onClick={() => setView("b")}>
            navegar
          </button>
          <ErrorBoundary resetKey={view} fallback={fallback}>
            <Boom shouldThrow={view === "a"} />
          </ErrorBoundary>
        </div>
      );
    }

    const user = userEvent.setup();
    render(<Harness />);

    expect(screen.getByText("kaboom")).toBeDefined();

    // Navigating away is enough: the user should never have to press "retry"
    // before being allowed to leave a view that failed.
    await user.click(screen.getByText("navegar"));

    expect(screen.getByText("contenido")).toBeDefined();
  });
});
