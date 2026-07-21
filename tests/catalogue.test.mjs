import assert from "node:assert/strict";
import test from "node:test";
import { validateBarcode, validateCatalogue } from "../scripts/validate-catalogue.mjs";

test("validates the versioned staged catalogue", async () => {
  const result = await validateCatalogue();
  assert.equal(result.packs, 3);
  assert.equal(result.items, 1400);
});

test("validates Bizsuite-supported numeric barcode formats", () => {
  assert.equal(validateBarcode("4006381333931", "EAN-13"), true);
  assert.equal(validateBarcode("4006381333932", "EAN-13"), false);
  assert.equal(validateBarcode("96385074", "EAN-8"), true);
  assert.equal(validateBarcode("10012345000017", "ITF-14"), true);
  assert.equal(validateBarcode("ABC-123", "C39"), true);
  assert.equal(validateBarcode("abc-123", "C39"), false);
});
