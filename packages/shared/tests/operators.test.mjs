import { test } from "node:test";
import assert from "node:assert/strict";
import { createOperatorSchema } from "../dist/index.js";

test("createOperatorSchema accepts valid operator input", () => {
  const result = createOperatorSchema.safeParse({
    external_id: "op-001",
    legal_name: "Test Legal",
    trading_name: "Test Trading",
  });
  assert.equal(result.success, true);
});

test("createOperatorSchema rejects missing external_id", () => {
  const result = createOperatorSchema.safeParse({
    legal_name: "Test Legal",
    trading_name: "Test Trading",
  });
  assert.equal(result.success, false);
});
