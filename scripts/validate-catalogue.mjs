import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const barcodeTypes = new Set(["C128", "C39", "EAN-13", "EAN-8", "UPC-A", "UPC-E", "ITF-14"]);

function gs1CheckDigitIsValid(value) {
  if (!/^\d+$/.test(value) || value.length < 2) return false;
  const digits = [...value].map(Number);
  const supplied = digits.pop();
  const sum = digits.reverse().reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);
  return supplied === (10 - (sum % 10)) % 10;
}

function expandUpce(value) {
  if (!/^[01]\d{7}$/.test(value)) return null;
  const numberSystem = value[0];
  const [d1, d2, d3, d4, d5, d6] = value.slice(1, 7);
  const check = value[7];
  let body;
  if (["0", "1", "2"].includes(d6)) body = `${numberSystem}${d1}${d2}${d6}0000${d3}${d4}${d5}`;
  else if (d6 === "3") body = `${numberSystem}${d1}${d2}${d3}00000${d4}${d5}`;
  else if (d6 === "4") body = `${numberSystem}${d1}${d2}${d3}${d4}00000${d5}`;
  else body = `${numberSystem}${d1}${d2}${d3}${d4}${d5}0000${d6}`;
  return `${body}${check}`;
}

export function validateBarcode(value, type) {
  if (type === "C128") return /^[\x20-\x7e]+$/.test(value);
  if (type === "C39") return /^[0-9A-Z .$/+%-]+$/.test(value);
  if (type === "UPC-E") {
    const expanded = expandUpce(value);
    return expanded !== null && gs1CheckDigitIsValid(expanded);
  }
  const lengths = { "EAN-13": 13, "EAN-8": 8, "UPC-A": 12, "ITF-14": 14 };
  return value.length === lengths[type] && gs1CheckDigitIsValid(value);
}

export async function validateCatalogue() {
  const manifestPath = path.join(root, "public/catalogue/manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  assert.match(manifest.version, /^\d{4}\.\d{2}[a-z0-9.-]*$/i, "Manifest needs a version");
  assert.ok(manifest.methodology.length >= 80, "Manifest needs a documented popularity methodology");
  assert.ok(Array.isArray(manifest.packs) && manifest.packs.length >= 3, "All three catalogue stages must be declared");

  const barcodes = new Set();
  let itemCount = 0;

  for (const pack of manifest.packs) {
    assert.ok(pack.targetCount >= pack.availableCount, `${pack.id}: available count exceeds target`);
    if (!pack.path) {
      assert.equal(pack.availableCount, 0, `${pack.id}: a planned pack cannot report available products without a path`);
      continue;
    }
    const packPath = path.join(root, "public", pack.path.replace(/^\//, ""));
    const data = JSON.parse(await readFile(packPath, "utf8"));
    assert.equal(data.packId, pack.id, `${pack.id}: pack ID mismatch`);
    assert.equal(data.catalogueVersion, manifest.version, `${pack.id}: version mismatch`);
    assert.equal(data.items.length, pack.availableCount, `${pack.id}: manifest count mismatch`);
    const packIds = new Set();
    const packBarcodes = new Set();

    for (const item of data.items) {
      itemCount += 1;
      assert.ok(!packIds.has(item.id), `${pack.id}: duplicate catalogue item ID ${item.id}`);
      packIds.add(item.id);
      for (const field of ["name", "brand", "unit", "category", "subCategory", "description"]) {
        assert.equal(typeof item[field], "string", `${item.id}: ${field} must be text`);
        assert.ok(item[field].trim(), `${item.id}: ${field} is required`);
      }
      assert.equal(item.productType, "single", `${item.id}: templates currently publish one retail item per GTIN`);
      assert.ok(item.description.length <= 180, `${item.id}: description must be short`);
      assert.ok(Number.isInteger(item.popularityScore) && item.popularityScore >= 0 && item.popularityScore <= 100, `${item.id}: invalid popularity score`);
      assert.ok(Array.isArray(item.popularityEvidence) && item.popularityEvidence.length, `${item.id}: popularity evidence is required`);
      assert.ok(Array.isArray(item.sources) && item.sources.length, `${item.id}: at least one source is required`);
      for (const source of item.sources) {
        assert.match(source.url, /^https:\/\//, `${item.id}: source URL must use HTTPS`);
        assert.match(source.checkedAt, /^\d{4}-\d{2}-\d{2}$/, `${item.id}: source review date is invalid`);
        assert.ok(source.evidence.trim(), `${item.id}: source evidence is required`);
      }
      if (item.barcode) {
        assert.ok(barcodeTypes.has(item.barcode.type), `${item.id}: unsupported barcode type`);
        assert.ok(validateBarcode(item.barcode.value, item.barcode.type), `${item.id}: invalid ${item.barcode.type} barcode`);
        assert.ok(!packBarcodes.has(item.barcode.value), `${pack.id}: duplicate barcode ${item.barcode.value}`);
        packBarcodes.add(item.barcode.value);
        barcodes.add(item.barcode.value);
        assert.ok(["verified", "corroborated"].includes(item.barcode.verification), `${item.id}: invalid barcode verification state`);
        assert.match(item.barcode.sourceUrl, /^https:\/\//, `${item.id}: barcode source is required`);
      }
    }
  }

  return { packs: manifest.packs.length, items: itemCount, barcodes: barcodes.size };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await validateCatalogue();
  console.log(`Catalogue valid: ${result.items} reviewed items, ${result.barcodes} verified barcodes, ${result.packs} staged packs.`);
}
