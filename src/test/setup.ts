import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";

// Testing Library only registers its own automatic cleanup when Vitest runs
// with globals enabled, which this project does not. Without this, each test
// leaves its render mounted and the next one finds two of every element.
afterEach(() => {
  cleanup();
});
