import { describe, expectTypeOf, it } from "vitest";

import type { GhimApiClient as SharedApiClient } from "@ghim/api";

import type { GhimApiClient as ExtensionApiClient } from "./client";

describe("extension API boundary", () => {
  it("uses the shared API client contract", () => {
    expectTypeOf<ExtensionApiClient>().toEqualTypeOf<SharedApiClient>();
  });
});
