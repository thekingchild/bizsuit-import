import { createProduct, type Product } from "./bizsuite";

export const BARCODE_TYPES = ["C128", "C39", "EAN-13", "EAN-8", "UPC-A", "UPC-E", "ITF-14"] as const;

export type BarcodeType = (typeof BARCODE_TYPES)[number];
export type BarcodeVerification = "verified" | "corroborated" | "not-supplied";

export interface CatalogueSource {
  label: string;
  url: string;
  checkedAt: string;
  evidence: string;
}

export interface CatalogueBarcode {
  value: string;
  type: BarcodeType;
  verification: Exclude<BarcodeVerification, "not-supplied">;
  sourceUrl: string;
  verifiedAt: string;
}

export interface CatalogueItem {
  id: string;
  name: string;
  brand: string;
  unit: string;
  category: string;
  subCategory: string;
  description: string;
  productType: "single";
  barcode?: CatalogueBarcode;
  popularityScore: number;
  popularityEvidence: string[];
  sources: CatalogueSource[];
}

export interface CataloguePack {
  id: string;
  name: string;
  description: string;
  targetCount: number;
  availableCount: number;
  status: "preview" | "available" | "planned";
  path?: string;
}

export interface CatalogueManifest {
  version: string;
  updatedAt: string;
  methodology: string;
  attribution: string;
  packs: CataloguePack[];
}

export interface CataloguePackData {
  packId: string;
  catalogueVersion: string;
  items: CatalogueItem[];
}

function gs1CheckDigitIsValid(value: string) {
  if (!/^\d+$/.test(value) || value.length < 2) return false;
  const digits = [...value].map(Number);
  const supplied = digits.pop();
  const sum = digits.reverse().reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);
  return supplied === (10 - (sum % 10)) % 10;
}

function expandUpce(value: string) {
  if (!/^[01]\d{7}$/.test(value)) return null;
  const numberSystem = value[0];
  const [d1, d2, d3, d4, d5, d6] = value.slice(1, 7);
  const check = value[7];
  let body: string;
  if (["0", "1", "2"].includes(d6)) body = `${numberSystem}${d1}${d2}${d6}0000${d3}${d4}${d5}`;
  else if (d6 === "3") body = `${numberSystem}${d1}${d2}${d3}00000${d4}${d5}`;
  else if (d6 === "4") body = `${numberSystem}${d1}${d2}${d3}${d4}00000${d5}`;
  else body = `${numberSystem}${d1}${d2}${d3}${d4}${d5}0000${d6}`;
  return `${body}${check}`;
}

export function validateBarcode(value: string, type: BarcodeType) {
  const barcode = value.trim();
  if (!barcode) return false;
  if (type === "C128") return /^[\x20-\x7e]+$/.test(barcode);
  if (type === "C39") return /^[0-9A-Z .$/+%-]+$/.test(barcode);
  if (type === "UPC-E") {
    const expanded = expandUpce(barcode);
    return expanded !== null && gs1CheckDigitIsValid(expanded);
  }
  const lengths: Record<Exclude<BarcodeType, "C128" | "C39" | "UPC-E">, number> = {
    "EAN-13": 13,
    "EAN-8": 8,
    "UPC-A": 12,
    "ITF-14": 14,
  };
  return barcode.length === lengths[type] && gs1CheckDigitIsValid(barcode);
}

export function catalogueItemToProduct(item: CatalogueItem, packId: string, catalogueVersion: string): Product {
  return createProduct({
    name: item.name,
    brand: item.brand,
    unit: item.unit,
    category: item.category,
    subCategory: item.subCategory,
    sku: item.barcode?.value ?? "",
    barcodeType: item.barcode?.type ?? "C128",
    productType: item.productType,
    description: item.description,
    template: {
      catalogueItemId: item.id,
      packId,
      catalogueVersion,
      barcodeVerification: item.barcode?.verification ?? "not-supplied",
      importedAt: new Date().toISOString(),
    },
  });
}
