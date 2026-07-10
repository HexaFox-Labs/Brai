import test from "node:test";
import assert from "node:assert/strict";
import { orderTablesByDependencies } from "./copy-table-order.mjs";

test("schema copy orders referenced tables before dependent tables", () => {
  const ordered = orderTablesByDependencies(
    ["items", "item_roles", "role_statuses"],
    {
      fallbackOrder: ["items", "item_roles", "role_statuses"],
      dependencies: [
        { table: "item_roles", referencedTable: "items" },
        { table: "item_roles", referencedTable: "role_statuses" }
      ]
    }
  );

  assert.deepEqual(ordered, ["items", "role_statuses", "item_roles"]);
});

test("schema copy rejects foreign-key cycles instead of choosing an invalid order", () => {
  assert.throws(
    () => orderTablesByDependencies(
      ["first", "second"],
      {
        dependencies: [
          { table: "first", referencedTable: "second" },
          { table: "second", referencedTable: "first" }
        ]
      }
    ),
    /cyclic foreign keys: first -> second -> first/
  );
});
