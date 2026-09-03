import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// 每个用例后清理 DOM，避免跨用例累积导致 getByText 命中多个
afterEach(cleanup);
