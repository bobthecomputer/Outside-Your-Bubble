import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock prisma across unit tests to avoid needing a generated client during UI/lib unit runs.
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
